"""Nexora application API boundary."""

from fastapi import FastAPI

from .config import Settings, settings
from .container import build_container
from .routes.candidates import router as candidates_router
from .routes.chat import router as chat_router


def create_app(settings_override: Settings | None = None) -> FastAPI:
    active_settings = settings_override or settings
    app = FastAPI(title="Nexora API", version="0.1.0")
    app.state.settings = active_settings
    app.state.container = build_container(active_settings)
    app.include_router(candidates_router)
    app.include_router(chat_router)

    @app.get("/api/health")
    def health():
        return {
            "status": "ok",
            "auth_mode": active_settings.auth_mode,
            "codeassess_mode": active_settings.codeassess_mode,
        }

    return app


app = create_app()
