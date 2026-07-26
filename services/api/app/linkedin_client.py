from __future__ import annotations

from datetime import datetime

import httpx
from fastapi import HTTPException

from app.config import settings

LINKEDIN_UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts"
LINKEDIN_ASSETS_URL = "https://api.linkedin.com/v2/assets?action=registerUpload"


def get_credentials(db) -> tuple[str, str]:
    """Returns (client_id, client_secret). Prefers credentials the user entered
    via the Settings UI (stored in Mongo); falls back to .env values so local
    dev keeps working without extra setup."""
    config = db.app_settings.find_one({"_id": "linkedin_app"})
    if config and config.get("client_id") and config.get("client_secret"):
        return config["client_id"], config["client_secret"]
    return settings.linkedin_client_id, settings.linkedin_client_secret


def get_connected_account(db) -> dict:
    account = db.linkedin_accounts.find_one(sort=[("updated_at", -1)])
    if not account:
        raise HTTPException(status_code=400, detail="No LinkedIn account connected. Connect LinkedIn in Settings first.")
    granted_scopes = (account.get("scope") or "").replace(",", " ").split()
    if "w_member_social" not in granted_scopes:
        raise HTTPException(
            status_code=403,
            detail="Connected LinkedIn account is missing the w_member_social scope. "
            "Disconnect and reconnect in Settings to grant posting permission.",
        )
    return account


def upload_image(account: dict, image_bytes: bytes, content_type: str) -> str:
    """Registers and uploads an image asset to LinkedIn, returns the asset URN."""
    author_urn = f"urn:li:person:{account['_id']}"
    register_body = {
        "registerUploadRequest": {
            "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
            "owner": author_urn,
            "serviceRelationships": [
                {"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}
            ],
        }
    }
    register_resp = httpx.post(
        LINKEDIN_ASSETS_URL,
        json=register_body,
        headers={
            "Authorization": f"Bearer {account['access_token']}",
            "Content-Type": "application/json",
        },
        timeout=15,
    )
    if register_resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"LinkedIn image registration failed: {register_resp.text}")

    register_data = register_resp.json()
    value = register_data["value"]
    asset_urn = value["asset"]
    upload_url = value["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]

    upload_resp = httpx.put(
        upload_url,
        content=image_bytes,
        headers={
            "Authorization": f"Bearer {account['access_token']}",
            "Content-Type": content_type or "application/octet-stream",
        },
        timeout=30,
    )
    if upload_resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"LinkedIn image upload failed: {upload_resp.text}")

    return asset_urn


def publish_to_linkedin(db, draft: dict) -> str:
    """Publishes a post_drafts document to LinkedIn and returns the post URN.
    Raises HTTPException on any failure."""
    account = get_connected_account(db)
    author_urn = f"urn:li:person:{account['_id']}"

    share_content: dict = {
        "shareCommentary": {"text": draft["content"]},
        "shareMediaCategory": "NONE",
    }

    image_asset_urn = draft.get("image_asset_urn")
    if image_asset_urn:
        share_content["shareMediaCategory"] = "IMAGE"
        share_content["media"] = [{"status": "READY", "media": image_asset_urn}]

    body = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {"com.linkedin.ugc.ShareContent": share_content},
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }

    response = httpx.post(
        LINKEDIN_UGC_POSTS_URL,
        json=body,
        headers={
            "Authorization": f"Bearer {account['access_token']}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        },
        timeout=15,
    )

    if response.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"LinkedIn publish failed: {response.text}")

    linkedin_post_urn = response.headers.get("x-restli-id") or response.json().get("id")
    published_at = datetime.utcnow()
    db.post_drafts.update_one(
        {"_id": draft["_id"]},
        {
            "$set": {
                "status": "published",
                "published_at": published_at,
                "linkedin_post_urn": linkedin_post_urn,
            }
        },
    )
    return linkedin_post_urn
