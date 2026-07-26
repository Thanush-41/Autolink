from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.models import dm_draft_document
from app.orchestrator import generate_dm

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("/detect")
def detect_lead(payload: dict, db=Depends(get_db)):
    comment_text = payload.get("comment", "")
    text = comment_text.lower()
    is_lead = any(token in text for token in ["interested", "pricing", "demo", "book a call"])
    if not is_lead:
        return {"is_lead": False}

    name = payload.get("name", "there")
    suggested_dm = generate_dm(name, comment_text)

    draft = dm_draft_document(name, suggested_dm, payload.get("comment_id"))
    db.dm_drafts.insert_one(draft)

    return {
        "is_lead": True,
        "suggested_reply": f"Thanks {name}! I have sent you a DM with details.",
        "suggested_dm": suggested_dm,
        "dm_draft_id": draft["_id"],
    }


@router.get("/dm-drafts")
def list_dm_drafts(db=Depends(get_db)):
    drafts = list(db.dm_drafts.find().sort("created_at", -1))
    return [
        {
            "id": d["_id"],
            "lead_name": d["lead_name"],
            "message": d["message"],
            "status": d["status"],
        }
        for d in drafts
    ]


@router.post("/dm-drafts/{draft_id}/mark-sent")
def mark_dm_sent(draft_id: str, db=Depends(get_db)):
    draft = db.dm_drafts.find_one({"_id": draft_id})
    if not draft:
        raise HTTPException(status_code=404, detail="DM draft not found")
    # LinkedIn does not expose a public messaging/InMail API to self-serve developer
    # apps, so this only records that the message was sent manually by the user -
    # it does not deliver anything through LinkedIn itself.
    db.dm_drafts.update_one({"_id": draft_id}, {"$set": {"status": "sent_manually"}})
    return {"id": draft_id, "status": "sent_manually"}
