from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseModel):
    app_env: str = os.getenv("APP_ENV", "development")
    mongo_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    mongo_db: str = os.getenv("MONGODB_DB", "autolink")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    linkedin_client_id: str = os.getenv("LINKEDIN_CLIENT_ID", "")
    linkedin_client_secret: str = os.getenv("LINKEDIN_CLIENT_SECRET", "")
    linkedin_redirect_uri: str = os.getenv("LINKEDIN_REDIRECT_URI", "http://localhost:8000/auth/linkedin/callback")
    linkedin_scopes: str = os.getenv("LINKEDIN_SCOPES", "openid profile email w_member_social")

    app_secret_key: str = os.getenv("APP_SECRET_KEY", "dev-insecure-secret-change-me")
    web_app_url: str = os.getenv("WEB_APP_URL", "http://localhost:3000")

    llm_provider: str = os.getenv("LLM_PROVIDER", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


settings = Settings()
