from datetime import datetime
from app.db import get_database
from app.linkedin_client import publish_to_linkedin
from app.models import post_draft_document
from app.orchestrator import generate_post_content, schedule_recommendation


def run_content_generation(organization_name: str, run_id: str) -> None:
    db = get_database()
    run = db.agent_runs.find_one({"_id": run_id})
    if not run:
        return
    db.agent_runs.update_one({"_id": run_id}, {"$set": {"status": "running", "updated_at": datetime.utcnow()}})

    post_types = ["founder_story", "educational", "product_update", "case_study", "poll"]
    for idx in range(10):
        post_type = post_types[idx % len(post_types)]
        content = generate_post_content(organization_name, post_type, idx + 1)
        draft = post_draft_document(organization_name, post_type, content)
        db.post_drafts.insert_one(draft)

    db.agent_runs.update_one(
        {"_id": run_id},
        {"$set": {"status": "completed", "summary": "Generated 10 new drafts", "updated_at": datetime.utcnow()}},
    )


def run_scheduling(organization_name: str, run_id: str) -> None:
    db = get_database()
    run = db.agent_runs.find_one({"_id": run_id})
    if not run:
        return
    db.agent_runs.update_one({"_id": run_id}, {"$set": {"status": "running", "updated_at": datetime.utcnow()}})

    drafts = list(db.post_drafts.find({"organization_name": organization_name}))
    for i, draft in enumerate(drafts):
        slot = schedule_recommendation(i)
        db.post_drafts.update_one(
            {"_id": draft["_id"]},
            {"$set": {"status": "scheduled", "scheduled_for": datetime.utcnow().replace(minute=0, second=0, microsecond=0)}},
        )
        run_summary = f"Scheduled {len(drafts)} posts, latest slot {slot['best_day']} {slot['best_time_utc']} UTC"

    db.agent_runs.update_one(
        {"_id": run_id},
        {"$set": {"status": "completed", "summary": run_summary if drafts else "No drafts found", "updated_at": datetime.utcnow()}},
    )


def run_scheduled_publish(post_id: str) -> None:
    """Executed by the RQ scheduler at the user-chosen publish time."""
    db = get_database()
    draft = db.post_drafts.find_one({"_id": post_id})
    if not draft or draft.get("status") == "published":
        return
    try:
        publish_to_linkedin(db, draft)
    except Exception as exc:  # noqa: BLE001 - record the failure instead of losing it silently
        db.post_drafts.update_one({"_id": post_id}, {"$set": {"status": "publish_failed", "publish_error": str(exc)}})
