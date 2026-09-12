"""Recruiter-facing request models."""

from pydantic import BaseModel, ConfigDict, Field


class ChatContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_id: str | None = Field(default=None, min_length=1)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_id: str | None = Field(default=None, min_length=1)
    message: str = Field(min_length=1)
    candidate_ids: list[str] = Field(default_factory=list)
    context: ChatContext | None = None