"""Firebase authentication boundary with explicit development mode."""

from dataclasses import dataclass
import os

from fastapi import Header, HTTPException, Request, status


@dataclass(frozen=True)
class RecruiterIdentity:
    subject: str
    email: str | None = None


class FirebaseTokenVerifier:
    """Verify Firebase tokens when Firebase Admin configuration is available."""

    def verify(self, token: str) -> RecruiterIdentity:
        try:
            import firebase_admin
            from firebase_admin import auth
        except ImportError as exc:
            raise RuntimeError(
                "Firebase Admin is not installed; configure it for production auth"
            ) from exc
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        decoded = auth.verify_id_token(token)
        return RecruiterIdentity(
            subject=str(decoded["uid"]),
            email=decoded.get("email"),
        )


def get_current_recruiter(
    request: Request,
    authorization: str | None = Header(default=None),
) -> RecruiterIdentity:
    mode = getattr(
        getattr(request.app, "state", None),
        "settings",
        None,
    )
    mode = getattr(mode, "auth_mode", os.getenv("NEXORA_AUTH_MODE", "firebase"))
    if mode == "development":
        return RecruiterIdentity(
            subject=os.getenv("NEXORA_DEV_RECRUITER_ID", "dev-recruiter"),
            email=os.getenv("NEXORA_DEV_RECRUITER_EMAIL", "dev@nexora.local"),
        )
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase bearer token required",
        )
    try:
        return FirebaseTokenVerifier().verify(authorization.removeprefix("Bearer ").strip())
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase token could not be verified",
        ) from exc
