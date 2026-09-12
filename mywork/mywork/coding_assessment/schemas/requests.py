"""Requests accepted by the existing CodeAssess API."""

from pydantic import BaseModel, ConfigDict, Field


class AssessmentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    interviewer_id: int


class QuestionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_text: str = Field(min_length=1)
    language: str = Field(default="python", min_length=1)


class InviteCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_name: str = Field(min_length=1, max_length=100)
    candidate_email: str = Field(min_length=3, max_length=255)
    profile_id: str | None = Field(default=None, max_length=100)
    scheduled_at: str | None = None