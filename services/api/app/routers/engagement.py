import httpx
from fastapi import APIRouter, Depends, HTTPException
from urllib.parse import quote
from app.db import get_db
from app.models import comment_document
from app.orchestrator import classify_comment, generate_reply

router = APIRouter(prefix="/engagement", tags=["engagement"])

LINKEDIN_COMMENTS_URL_TEMPLATE = "https://api.linkedin.com/rest/socialActions/{object_urn}/comments"
LINKEDIN_API_VERSION = "202607"


@router.post("/comments/seed")
def seed_comment(payload: dict, db=Depends(get_db)):
    """Creates a test comment on one of our own published posts.

    LinkedIn's public developer API does not expose read access to comments left
    by other members on your posts to self-serve apps (that requires the
    restricted `r_member_social_feed` permission, granted only to approved
    partners). This endpoint lets you exercise the classify -> reply -> approve
    pipeline locally without that access.
    """
    post_id = payload.get("post_id")
    author_name = payload.get("author_name", "Test User")
    body = payload.get("body", "")
    if not post_id or not body:
        raise HTTPException(status_code=400, detail="post_id and body are required")

    post = db.post_drafts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="post not found")

    comment = comment_document(post_id, author_name, body)
    db.comments.insert_one(comment)
    return {"id": comment["_id"], "post_id": post_id, "author_name": author_name, "body": body}


@router.get("/comments")
def list_comments(db=Depends(get_db)):
    comments = list(db.comments.find().sort("created_at", -1))
    return [
        {
            "id": c["_id"],
            "post_id": c["post_id"],
            "author_name": c["author_name"],
            "body": c["body"],
            "classification": c["classification"],
            "status": c.get("status", "pending"),
        }
        for c in comments
    ]


@router.post("/comments/classify")
def classify_comments(db=Depends(get_db)):
    comments = list(db.comments.find({"classification": "unclassified"}))
    updated = 0
    for comment in comments:
        kind = classify_comment(comment["body"])
        db.comments.update_one({"_id": comment["_id"]}, {"$set": {"classification": kind}})
        updated += 1
    return {"classified": updated}


@router.post("/comments/{comment_id}/reply")
def propose_reply(comment_id: str, db=Depends(get_db)):
    comment = db.comments.find_one({"_id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="comment not found")
    reply_text = generate_reply(comment["classification"], comment["author_name"], comment["body"])
    db.comments.update_one({"_id": comment_id}, {"$set": {"proposed_reply": reply_text, "status": "reply_proposed"}})
    return {
        "classification": comment["classification"],
        "proposed_reply": reply_text,
        "approval_required": True,
    }


@router.post("/comments/{comment_id}/approve")
def approve_reply(comment_id: str, payload: dict | None = None, db=Depends(get_db)):
    """Publishes the (optionally edited) reply as a real comment on LinkedIn.

    Note: LinkedIn's Comments/Social Actions API requires the
    `w_member_social_feed` permission, which is only available to apps approved
    for LinkedIn's Marketing Developer Platform partner program. Self-serve apps
    (like the one configured here with `w_member_social`) will receive a 403
    from LinkedIn when calling this - the code path is fully wired and correct,
    but real delivery depends on LinkedIn granting that elevated access.
    """
    comment = db.comments.find_one({"_id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="comment not found")

    reply_text = (payload or {}).get("reply_text") or comment.get("proposed_reply")
    if not reply_text:
        raise HTTPException(status_code=400, detail="No proposed reply to approve. Call /reply first.")

    post = db.post_drafts.find_one({"_id": comment["post_id"]})
    if not post or not post.get("linkedin_post_urn"):
        raise HTTPException(
            status_code=400,
            detail="The comment's post has no linkedin_post_urn. It must be published via /posts/{id}/publish first.",
        )

    account = db.linkedin_accounts.find_one(sort=[("updated_at", -1)])
    if not account:
        raise HTTPException(status_code=400, detail="No LinkedIn account connected.")

    body = {
        "actor": f"urn:li:person:{account['_id']}",
        "object": post["linkedin_post_urn"],
        "message": {"text": reply_text},
    }
    response = httpx.post(
        LINKEDIN_COMMENTS_URL_TEMPLATE.format(object_urn=quote(post["linkedin_post_urn"], safe="")),
        json=body,
        headers={
            "Authorization": f"Bearer {account['access_token']}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
            "LinkedIn-Version": LINKEDIN_API_VERSION,
        },
        timeout=15,
    )

    if response.status_code not in (200, 201):
        db.comments.update_one({"_id": comment_id}, {"$set": {"status": "reply_failed", "reply_error": response.text}})
        raise HTTPException(
            status_code=502,
            detail=(
                "LinkedIn rejected the comment reply. This typically means the connected app is missing "
                f"the 'w_member_social_feed' permission (Marketing Developer Platform partner access). "
                f"LinkedIn response: {response.text}"
            ),
        )

    comment_urn = response.headers.get("x-restli-id")
    db.comments.update_one(
        {"_id": comment_id},
        {"$set": {"status": "replied", "reply_text": reply_text, "reply_comment_urn": comment_urn}},
    )
    return {"comment_id": comment_id, "status": "replied", "reply_comment_urn": comment_urn}
