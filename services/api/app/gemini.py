from __future__ import annotations

import json
import logging

import httpx

from app.config import settings

logger = logging.getLogger("app.gemini")

GEMINI_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def is_configured() -> bool:
    return bool(settings.gemini_api_key)


def generate_text(prompt: str, system: str | None = None, temperature: float = 0.7) -> str | None:
    """Call Gemini's generateContent REST API. Returns None on any failure so
    callers can fall back to deterministic heuristics instead of breaking."""
    if not is_configured():
        return None

    contents = [{"role": "user", "parts": [{"text": prompt}]}]
    body: dict = {
        "contents": contents,
        "generationConfig": {"temperature": temperature},
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}

    url = GEMINI_URL_TEMPLATE.format(model=settings.gemini_model)
    try:
        response = httpx.post(
            url,
            params={"key": settings.gemini_api_key},
            json=body,
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts).strip()
        return text or None
    except Exception:  # noqa: BLE001 - any failure should fall back gracefully
        logger.exception("Gemini generateContent call failed")
        return None


def generate_json(prompt: str, system: str | None = None, temperature: float = 0.4) -> dict | None:
    """Ask Gemini for a JSON object and parse it. Returns None on failure so
    callers can fall back to deterministic heuristics."""
    text = generate_text(prompt, system=system, temperature=temperature)
    if not text:
        return None

    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        logger.warning("Gemini response was not valid JSON: %s", text[:200])
        return None
