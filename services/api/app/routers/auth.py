from __future__ import annotations

import hashlib
import hmac
import secrets
import time
import urllib.parse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.config import settings
from app.db import get_db
from app.linkedin_client import get_credentials
from app.models import linkedin_account_document

router = APIRouter(prefix="/auth/linkedin", tags=["auth"])

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"

STATE_TTL_SECONDS = 600


def _sign(payload: str) -> str:
    return hmac.new(settings.app_secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()


def _make_state() -> str:
    nonce = secrets.token_urlsafe(16)
    timestamp = str(int(time.time()))
    payload = f"{nonce}.{timestamp}"
    return f"{payload}.{_sign(payload)}"


def _verify_state(state: str) -> bool:
    parts = state.split(".")
    if len(parts) != 3:
        return False
    nonce, timestamp, signature = parts
    payload = f"{nonce}.{timestamp}"
    if not hmac.compare_digest(_sign(payload), signature):
        return False
    try:
        age = int(time.time()) - int(timestamp)
    except ValueError:
        return False
    return 0 <= age <= STATE_TTL_SECONDS


@router.get("/login")
def login(db=Depends(get_db)):
    client_id, client_secret = get_credentials(db)
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400,
            detail="LinkedIn app credentials are not configured yet. Add your Client ID and Secret in Settings first.",
        )

    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": settings.linkedin_redirect_uri,
        "scope": settings.linkedin_scopes,
        "state": _make_state(),
    }
    return RedirectResponse(f"{LINKEDIN_AUTH_URL}?{urllib.parse.urlencode(params)}")


@router.get("/callback")
def callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
    db=Depends(get_db),
):
    if error:
        message = urllib.parse.quote(error_description or error)
        return RedirectResponse(f"{settings.web_app_url}/settings?linkedin_error={message}")

    if not code or not state or not _verify_state(state):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    client_id, client_secret = get_credentials(db)
    token_resp = httpx.post(
        LINKEDIN_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.linkedin_redirect_uri,
            "client_id": client_id,
            "client_secret": client_secret,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15,
    )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"LinkedIn token exchange failed: {token_resp.text}")

    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="LinkedIn token response missing access_token")

    userinfo_resp = httpx.get(
        LINKEDIN_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"LinkedIn userinfo failed: {userinfo_resp.text}")

    profile = userinfo_resp.json()
    sub = profile.get("sub")
    if not sub:
        raise HTTPException(status_code=502, detail="LinkedIn userinfo response missing 'sub'")

    account = linkedin_account_document(
        sub,
        {
            "name": profile.get("name"),
            "email": profile.get("email"),
            "picture": profile.get("picture"),
            "access_token": access_token,
            "expires_in": token_data.get("expires_in"),
            "scope": token_data.get("scope", settings.linkedin_scopes),
        },
    )
    db.linkedin_accounts.replace_one({"_id": sub}, account, upsert=True)

    return RedirectResponse(f"{settings.web_app_url}/settings?linkedin_connected=1")


@router.get("/status")
def status(db=Depends(get_db)):
    account = db.linkedin_accounts.find_one(sort=[("updated_at", -1)])
    if not account:
        return {"connected": False}
    scopes = (account.get("scope") or "").replace(",", " ").split()
    return {
        "connected": True,
        "name": account.get("name"),
        "email": account.get("email"),
        "picture": account.get("picture"),
        "scopes": scopes,
        "can_publish": "w_member_social" in scopes,
    }


@router.post("/disconnect")
def disconnect(db=Depends(get_db)):
    result = db.linkedin_accounts.delete_many({})
    return {"disconnected": result.deleted_count}


@router.post("/app-credentials")
def save_app_credentials(payload: dict, db=Depends(get_db)):
    client_id = (payload.get("client_id") or "").strip()
    client_secret = (payload.get("client_secret") or "").strip()
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="client_id and client_secret are required")

    db.app_settings.replace_one(
        {"_id": "linkedin_app"},
        {"_id": "linkedin_app", "client_id": client_id, "client_secret": client_secret},
        upsert=True,
    )
    return {"configured": True, "client_id": client_id, "redirect_uri": settings.linkedin_redirect_uri}


@router.get("/app-credentials")
def get_app_credentials(db=Depends(get_db)):
    client_id, client_secret = get_credentials(db)
    return {
        "configured": bool(client_id and client_secret),
        "client_id": client_id or None,
        "redirect_uri": settings.linkedin_redirect_uri,
    }
