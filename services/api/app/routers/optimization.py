from fastapi import APIRouter

router = APIRouter(prefix="/optimization", tags=["optimization"])


@router.get("/weekly-plan")
def weekly_plan():
    return {
        "insights": [
            "Founder story posts outperform technical posts by 1.7x",
            "Best response windows: Tue 14:00 UTC and Thu 10:00 UTC",
            "Short hooks under 120 characters improve read-through"
        ],
        "next_week_actions": [
            "Increase storytelling share to 40%",
            "Reduce jargon and add stronger CTA in line 3",
            "Schedule product update posts on Thursdays"
        ]
    }
