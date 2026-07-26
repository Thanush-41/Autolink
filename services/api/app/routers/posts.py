from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from app.db import get_db
from app.jobs import process_due_scheduled_posts
from app.linkedin_client import get_connected_account, publish_to_linkedin, upload_image
from app.models import post_draft_document
from app.orchestrator import enhance_post_content

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("/drafts")
def list_drafts(db=Depends(get_db)):
    drafts = list(db.post_drafts.find().sort("created_at", -1))
    return [
        {
            "id": d["_id"],
            "type": d["post_type"],
            "content": d["content"],
            "status": d["status"],
            "scheduled_for": d.get("scheduled_for"),
            "linkedin_post_urn": d.get("linkedin_post_urn"),
        }
        for d in drafts
    ]


@router.post("/enhance")
def enhance_content(payload: dict):
    raw = (payload.get("content") or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="content is required")
    has_image = bool(payload.get("has_image"))
    return {"enhanced": enhance_post_content(raw, has_image)}


@router.post("/create")
async def create_post(
    content: str = Form(...),
    publish_at: str | None = Form(None),
    image: UploadFile | None = File(None),
    db=Depends(get_db),
):
    if not content.strip():
        raise HTTPException(status_code=400, detail="content is required")

    image_asset_urn = None
    if image is not None:
        account = get_connected_account(db)
        image_bytes = await image.read()
        if image_bytes:
            image_asset_urn = upload_image(account, image_bytes, image.content_type or "image/jpeg")

    draft = post_draft_document("direct", "manual", content)
    if image_asset_urn:
        draft["image_asset_urn"] = image_asset_urn

    publish_dt = None
    if publish_at:
        try:
            parsed = datetime.fromisoformat(publish_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="publish_at must be an ISO datetime")
        publish_dt = parsed.astimezone(timezone.utc).replace(tzinfo=None) if parsed.tzinfo else parsed

    if publish_dt and publish_dt > datetime.utcnow():
        draft["status"] = "scheduled"
        draft["scheduled_for"] = publish_dt
        db.post_drafts.insert_one(draft)
        return {"post_id": draft["_id"], "status": "scheduled", "scheduled_for": publish_dt.isoformat()}

    db.post_drafts.insert_one(draft)
    linkedin_post_urn = publish_to_linkedin(db, draft)
    return {"post_id": draft["_id"], "status": "published", "linkedin_post_urn": linkedin_post_urn}


@router.post("/process-scheduled")
def process_scheduled(db=Depends(get_db)):
    """Publishes any drafts whose scheduled_for time has passed. Call this
    periodically from a free external trigger (e.g. a GitHub Actions cron)
    since this deployment has no always-on worker process."""
    results = process_due_scheduled_posts()
    return {"processed": len(results), "results": results}


@router.post("/{post_id}/publish")
def publish_post(post_id: str, db=Depends(get_db)):
    draft = db.post_drafts.find_one({"_id": post_id})
    if not draft:
        raise HTTPException(status_code=404, detail="post not found")

    linkedin_post_urn = publish_to_linkedin(db, draft)
    return {"post_id": draft["_id"], "status": "published", "linkedin_post_urn": linkedin_post_urn}


