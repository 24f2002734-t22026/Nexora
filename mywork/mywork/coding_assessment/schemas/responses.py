"""Responses returned by the existing CodeAssess API."""

from pydantic import BaseModel, ConfigDict, Field


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    title: str
    description: str | None = None
    interviewer_id: int


class QuestionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    test_id: int
    question_text: str
    language: str


class InviteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    test_id: int
    candidate_name: str
    candidate_email: str
    profile_id: str | None = None
    scheduled_at: str | None = None
    token: str
    status: str


class SubmissionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    invite_id: int
    question_id: int
    code: str
    language: str
    status: str
    stdout: str | None = None
    stderr: str | None = None
    execution_time_ms: int | None = None


class AIEvaluation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int | None = None
    submission_id: int | None = None
    correctness_score: int | None = Field(default=None, ge=0, le=100)
    efficiency_score: int | None = Field(default=None, ge=0, le=100)
    code_quality_score: int | None = Field(default=None, ge=0, le=100)
    overall_score: int | None = Field(default=None, ge=0, le=100)
    is_correct: bool | None = None
    time_complexity: str | None = None
    space_complexity: str | None = None
    detected_issues: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    explanation: str | None = None


class SubmissionWithEvaluation(SubmissionResponse):
    evaluation: AIEvaluation | None = None


class AssessmentResult(BaseModel):
    """Normalized result assembled from CodeAssess list endpoints."""

    model_config = ConfigDict(extra="forbid")

    profile_id: str
    invite: InviteResponse | None = None
    assessment: AssessmentResponse | None = None
    questions: list[QuestionResponse] = Field(default_factory=list)
    submissions: list[SubmissionWithEvaluation] = Field(default_factory=list)
    status: str = "pending"
    overall_score: float | None = Field(default=None, ge=0, le=100)