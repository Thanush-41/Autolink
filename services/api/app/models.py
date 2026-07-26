from __future__ import annotations

from datetime import datetime
from uuid import uuid4


def now_utc() -> datetime:
    return datetime.utcnow()


def new_id() -> str:
    return uuid4().hex


def base_document(collection: str, payload: dict) -> dict:
    return {
        "_id": new_id(),
        "collection": collection,
        "created_at": now_utc(),
        **payload,
    }


def organization_document(name: str) -> dict:
    return base_document("organizations", {"name": name})


def goal_document(organization_name: str, title: str, payload: dict) -> dict:
    return base_document(
        "goals",
        {
            "organization_name": organization_name,
            "title": title,
            "payload": payload,
        },
    )


def post_draft_document(organization_name: str, post_type: str, content: str) -> dict:
    return base_document(
        "post_drafts",
        {
            "organization_name": organization_name,
            "post_type": post_type,
            "content": content,
            "status": "draft",
            "scheduled_for": None,
        },
    )


def comment_document(post_id: str, author_name: str, body: str) -> dict:
    return base_document(
        "comments",
        {
            "post_id": post_id,
            "author_name": author_name,
            "body": body,
            "classification": "unclassified",
            "requires_reply": "yes",
        },
    )


def agent_run_document(agent_type: str, status: str = "queued", summary: str | None = None) -> dict:
    return base_document(
        "agent_runs",
        {
            "agent_type": agent_type,
            "status": status,
            "summary": summary,
            "updated_at": now_utc(),
        },
    )


def linkedin_account_document(sub: str, payload: dict) -> dict:
    return {
        "_id": sub,
        "collection": "linkedin_accounts",
        "created_at": now_utc(),
        "updated_at": now_utc(),
        **payload,
    }


def dm_draft_document(lead_name: str, message: str, source_comment_id: str | None = None) -> dict:
    return base_document(
        "dm_drafts",
        {
            "lead_name": lead_name,
            "message": message,
            "source_comment_id": source_comment_id,
            "status": "draft",
        },
    )
