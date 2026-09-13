"""Nexora application configuration."""

from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    database_path: str = os.getenv(
        "NEXORA_DATABASE_PATH",
        str(Path(__file__).resolve().parents[1] / "nexora.db"),
    )
    auth_mode: str = os.getenv("NEXORA_AUTH_MODE", "firebase")
    firebase_project_id: str | None = os.getenv("NEXORA_FIREBASE_PROJECT_ID")
    codeassess_api_url: str | None = os.getenv("CODING_ASSESSMENT_API_URL")
    codeassess_frontend_url: str | None = os.getenv("CODING_ASSESSMENT_FRONTEND_URL")
    # Mock mode is explicit local development behavior. Production should set
    # NEXORA_CODEASSESS_MODE=external and CODING_ASSESSMENT_API_URL.
    codeassess_mode: str = os.getenv("NEXORA_CODEASSESS_MODE", "mock")
    interviewer_id: int = int(os.getenv("NEXORA_INTERVIEWER_ID", "1"))
    assessment_title: str = os.getenv(
        "NEXORA_ASSESSMENT_TITLE", "Nexora Technical Assessment"
    )
    email_mode: str = os.getenv("NEXORA_EMAIL_MODE", "logging")


settings = Settings()
