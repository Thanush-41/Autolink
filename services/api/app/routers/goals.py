from fastapi import APIRouter, Depends
from app.db import get_db
from app.models import goal_document, organization_document
from app.schemas import GoalCreate
from app.orchestrator import strategy_plan

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("")
def create_goal(payload: GoalCreate, db=Depends(get_db)):
    org = db.organizations.find_one({"name": payload.client})
    if not org:
        org = organization_document(payload.client)
        db.organizations.insert_one(org)

    goal = goal_document(
        payload.client,
        payload.goals[0] if payload.goals else "LinkedIn growth objective",
        payload.model_dump(),
    )
    db.goals.insert_one(goal)

    return {
        "goal_id": goal["_id"],
        "strategy": strategy_plan(payload.model_dump())
    }
