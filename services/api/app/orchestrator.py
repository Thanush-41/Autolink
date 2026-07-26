from datetime import datetime, timedelta

from app.gemini import generate_json, generate_text

COMMENT_CATEGORIES = ["sales_inquiry", "question", "thank_you", "spam", "troll", "support"]


def enhance_post_content(raw_content: str, has_image: bool = False) -> str:
    """Takes a user's raw draft text and asks Gemini to polish it into a
    ready-to-publish LinkedIn post. Falls back to the raw text untouched if
    Gemini is unavailable, so the user can still publish."""
    image_note = " The post will include an image, so keep the text a natural caption/complement to it." if has_image else ""
    prompt = (
        "Rewrite the following draft into a polished, ready-to-publish LinkedIn post. "
        "Keep the author's original meaning and key points, improve clarity and flow, "
        "keep it under 200 words, no hashtags unless already present, no markdown formatting."
        f"{image_note}\n\nDraft:\n\"\"\"\n{raw_content}\n\"\"\"\n\n"
        "Reply with ONLY the final post text, nothing else."
    )
    text = generate_text(prompt, temperature=0.6)
    return text or raw_content


def strategy_plan(goal_payload: dict) -> dict:
    client = goal_payload.get("client", "brand")
    industry = goal_payload.get("industry", "")
    audience = goal_payload.get("audience", "")
    goals = ", ".join(goal_payload.get("goals", [])) or "grow LinkedIn presence"
    brand_voice = goal_payload.get("brandVoice", "")

    prompt = (
        f"You are a LinkedIn growth strategist. Client: {client}. Industry: {industry}. "
        f"Audience: {audience}. Brand voice: {brand_voice}. Objective: {goals}.\n"
        "Return ONLY a JSON object with keys: posting_frequency (string, e.g. '5 posts/week'), "
        "content_pillars (array of exactly 5 short strings), campaign (a one-sentence campaign name/summary). "
        "No markdown, no explanation, just the JSON object."
    )
    result = generate_json(prompt)
    if (
        result
        and isinstance(result.get("content_pillars"), list)
        and len(result["content_pillars"]) >= 3
        and result.get("posting_frequency")
        and result.get("campaign")
    ):
        return {
            "monthly_strategy": {
                "posting_frequency": result["posting_frequency"],
                "content_pillars": result["content_pillars"][:5],
                "campaign": result["campaign"],
            }
        }

    # Deterministic fallback if Gemini is unavailable or returns an unexpected shape.
    topics = [
        "Founder Storytelling",
        "Customer Pain Deep Dives",
        "AI Workflow Playbooks",
        "Behind-the-Scenes Product Builds",
        "Case Study Snapshots"
    ]
    return {
        "monthly_strategy": {
            "posting_frequency": "5 posts/week",
            "content_pillars": topics,
            "campaign": f"30-day growth sprint for {client}"
        }
    }


def generate_post_content(organization_name: str, post_type: str, draft_number: int) -> str:
    prompt = (
        f"Write a single LinkedIn post for {organization_name}. Post type: {post_type}. "
        "Keep it under 120 words, no hashtags, no markdown, write it ready to publish as plain text."
    )
    text = generate_text(prompt, temperature=0.8)
    if text:
        return text
    return f"[{post_type}] Draft #{draft_number}: A high-signal LinkedIn post tailored for B2B growth."


def schedule_recommendation(existing_count: int) -> dict:
    base = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    best_slot = base + timedelta(days=1, hours=14 if existing_count < 3 else 10)
    best_day = best_slot.strftime("%A")
    best_time = best_slot.strftime("%H:%M")

    reason = generate_text(
        f"In one short sentence, justify why {best_day} at {best_time} UTC is a strong time to "
        "publish a LinkedIn post for B2B audience growth. No preamble, just the sentence.",
        temperature=0.5,
    )
    return {
        "best_day": best_day,
        "best_time_utc": best_time,
        "reason": reason or "Slot selected using low-competition window + audience overlap heuristic"
    }


def classify_comment(body: str) -> str:
    prompt = (
        "Classify this LinkedIn comment into exactly one label from this list: "
        f"{', '.join(COMMENT_CATEGORIES)}.\n"
        f'Comment: "{body}"\n'
        "Reply with ONLY the label, nothing else."
    )
    label = generate_text(prompt, temperature=0.0)
    if label:
        cleaned = label.strip().strip('"').lower()
        if cleaned in COMMENT_CATEGORIES:
            return cleaned

    text = body.lower()
    if "interested" in text or "pricing" in text or "demo" in text:
        return "sales_inquiry"
    if "how" in text or "?" in text:
        return "question"
    if "thanks" in text or "great" in text:
        return "thank_you"
    if "http" in text or "buy now" in text:
        return "spam"
    if "stupid" in text or "fake" in text:
        return "troll"
    return "support"


def generate_reply(comment_type: str, author_name: str, comment_body: str = "") -> str:
    prompt = (
        f"Write a short, natural LinkedIn reply (1-2 sentences, no hashtags) to {author_name}'s comment. "
        f"Comment category: {comment_type}. Original comment: \"{comment_body}\". "
        "Reply directly, no preamble."
    )
    text = generate_text(prompt, temperature=0.7)
    if text:
        return text

    if comment_type == "sales_inquiry":
        return f"Thanks {author_name}, appreciate your interest. I just sent a quick DM with details."
    if comment_type == "question":
        return f"Great question {author_name}. I can break this down with a practical example if helpful."
    if comment_type == "thank_you":
        return f"Thanks {author_name}, glad this resonated with you."
    if comment_type == "support":
        return f"Thanks for sharing this {author_name}. Happy to help if you want us to dive deeper."
    return "Thanks for the comment."


def generate_dm(author_name: str, context_text: str = "") -> str:
    prompt = (
        f"Write a short, friendly LinkedIn DM (2-3 sentences) to {author_name}, who showed sales interest "
        f"in a comment: \"{context_text}\". Offer a next step (short walkthrough/demo) without being pushy. "
        "No hashtags, no preamble, just the message."
    )
    text = generate_text(prompt, temperature=0.7)
    if text:
        return text
    return (
        f"Hi {author_name}, thanks for engaging with our post. "
        "Based on your interest, I can share a short walkthrough tailored to your use case."
    )
