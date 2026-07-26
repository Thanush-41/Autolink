from functools import lru_cache
from pymongo import MongoClient, ASCENDING
from .config import settings


@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    return MongoClient(settings.mongo_url)


def get_database():
    return get_client()[settings.mongo_db]


def get_db():
    yield get_database()


def ensure_indexes() -> None:
    db = get_database()
    db.organizations.create_index([("name", ASCENDING)], unique=True)
    db.goals.create_index([("organization_name", ASCENDING)])
    db.post_drafts.create_index([("organization_name", ASCENDING), ("created_at", ASCENDING)])
    db.comments.create_index([("classification", ASCENDING)])
    db.agent_runs.create_index([("agent_type", ASCENDING), ("created_at", ASCENDING)])
    db.dm_drafts.create_index([("status", ASCENDING), ("created_at", ASCENDING)])
