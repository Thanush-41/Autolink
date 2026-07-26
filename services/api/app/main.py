from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import ensure_indexes, get_client
from app.routers.goals import router as goals_router
from app.routers.agents import router as agents_router
from app.routers.analytics import router as analytics_router
from app.routers.engagement import router as engagement_router
from app.routers.posts import router as posts_router
from app.routers.leads import router as leads_router
from app.routers.optimization import router as optimization_router
from app.routers.auth import router as auth_router

app = FastAPI(title="Autolink Agentic API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    get_client().admin.command("ping")
    ensure_indexes()


@app.get("/")
def root():
    return {"service": "autolink-api", "status": "ok"}


app.include_router(goals_router)
app.include_router(agents_router)
app.include_router(analytics_router)
app.include_router(engagement_router)
app.include_router(posts_router)
app.include_router(leads_router)
app.include_router(optimization_router)
app.include_router(auth_router)
