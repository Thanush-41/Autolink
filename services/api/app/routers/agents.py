from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.jobs import run_content_generation, run_scheduling
from app.models import agent_run_document
from app.schemas import AgentRunCreate
from app.queue import content_queue, scheduler_queue

router = APIRouter(prefix="/agents", tags=["agents"])

AGENT_STATUS = [
    {"name": "Research Agent", "status": "online", "details": "Collecting signals from trending topics"},
    {"name": "Content Agent", "status": "online", "details": "Batch generation queue healthy"},
    {"name": "Scheduler Agent", "status": "online", "details": "Optimizing publish windows"},
    {"name": "Engagement Agent", "status": "idle", "details": "Waiting for fresh comments"},
    {"name": "Lead Agent", "status": "online", "details": "Watching sales intent markers"},
    {"name": "Analytics Agent", "status": "online", "details": "Syncing KPI snapshots"}
]


@router.get("/status")
def get_status():
    return AGENT_STATUS


@router.post("/run")
def run_agent(payload: AgentRunCreate, db=Depends(get_db)):
    run = agent_run_document(payload.agent_type)
    db.agent_runs.insert_one(run)

    organization_name = payload.payload.get("organization_name", payload.payload.get("organization_id", "demo"))

    if payload.agent_type == "content":
        content_queue.enqueue(run_content_generation, organization_name, run["_id"])
    elif payload.agent_type == "scheduling":
        scheduler_queue.enqueue(run_scheduling, organization_name, run["_id"])
    else:
        db.agent_runs.update_one(
            {"_id": run["_id"]},
            {"$set": {"status": "completed", "summary": f"{payload.agent_type} executed in orchestrator mode", "updated_at": datetime.utcnow()}},
        )

    return {"run_id": run["_id"], "status": run["status"]}


@router.get("/runs/{run_id}")
def get_run(run_id: str, db=Depends(get_db)):
    run = db.agent_runs.find_one({"_id": run_id})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "id": run["_id"],
        "agent_type": run["agent_type"],
        "status": run["status"],
        "summary": run.get("summary"),
        "updated_at": run["updated_at"]
    }
