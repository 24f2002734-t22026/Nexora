"""Pluggable email boundary with a development logging provider."""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class EmailMessage:
    recipient: str
    subject: str
    body: str
    assessment_url: str | None


class EmailService(Protocol):
    def send_assessment_invitation(
        self,
        recipient: str,
        candidate_name: str,
        job_title: str,
        assessment_url: str | None,
    ) -> EmailMessage: ...


class LoggingEmailService:
    """Records exact development email payloads without sending mail."""

    def __init__(self) -> None:
        self.messages: list[EmailMessage] = []

    def send_assessment_invitation(
        self,
        recipient: str,
        candidate_name: str,
        job_title: str,
        assessment_url: str | None,
    ) -> EmailMessage:
        message = EmailMessage(
            recipient=recipient,
            subject=f"Technical Assessment Invitation — {job_title}",
            body=(
                f"Hi {candidate_name},\n\n"
                f"You have been shortlisted for the Technical Assessment for the "
                f"{job_title} position.\n\n"
                f"Your assessment link:\n{assessment_url or '[unavailable]'}\n\n"
                "Regards,\nNexora Hiring Team"
            ),
            assessment_url=assessment_url,
        )
        self.messages.append(message)
        return message


def build_email_service(mode: str) -> LoggingEmailService:
    if mode == "logging":
        return LoggingEmailService()
    raise RuntimeError(
        f"Email provider '{mode}' is not configured; use logging mode for development"
    )
