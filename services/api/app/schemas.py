from datetime import datetime
from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    client: str
    industry: str
    audience: str
    goals: list[str] = Field(default_factory=list)
    brandVoice: str


class GoalResponse(BaseModel):
    id: int
    title: str
    created_at: datetime


class AgentRunCreate(BaseModel):
    agent_type: str
    payload: dict = Field(default_factory=dict)


class AgentRunResponse(BaseModel):
    id: int
    agent_type: str
    status: str
    summary: str | None


class AgentStatusResponse(BaseModel):
    name: str
    status: str
    details: str
