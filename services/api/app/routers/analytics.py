from fastapi import APIRouter

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
def dashboard_metrics():
    return {
        "pendingApproval": 14,
        "postsPublishedToday": 6,
        "commentsAwaitingReply": 11,
        "generatedDMs": 9,
        "leadOpportunities": 4
    }


@router.get("/weekly-summary")
def weekly_summary():
    return {
        "educational_posts_delta": "+34%",
        "founder_stories_delta": "+58%",
        "technical_posts_delta": "-11%",
        "recommendation": "Use shorter hooks and increase founder story density on Tuesdays."
    }
