"""HTTP request and response contracts for the Nexora application API."""

from pydantic import BaseModel, Field


class CandidateResponse(BaseModel):
    candidate_id: str
    name: str
    email: str
    resume_ref: str | None
    current_stage: str
    analysis_id: str


class AnalysisResponse(BaseModel):
    analysis_id: str
    job_title: str
    status: str
    created_at: str


class RankingResponse(BaseModel):
    candidate_id: str
    candidate_name: str
    rank: int
    final_score: float
    semantic_score: float
    keyword_score: float
    matched_skills: list[str]
    missing_skills: list[str]


class ShortlistResponse(BaseModel):
    candidate: CandidateResponse
    changed: bool


class AssessmentCreateRequest(BaseModel):
    question_text: str = Field(min_length=1)
    language: str = Field(default="python", min_length=1)


class AssessmentResponse(BaseModel):
    candidate_id: str
    assessment_id: int
    invite_id: int
    token: str
    status: str
    invite_url: str | None


class HRDecisionRequest(BaseModel):
    decision: str
    reason: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    candidate_ids: list[str] = Field(default_factory=list)
    conversation_id: str | None = None


class EmailLogResponse(BaseModel):
    recipient: str
    subject: str
    assessment_url: str | None


class HealthResponse(BaseModel):
    status: str
    auth_mode: str
    codeassess_mode: str


class AssessmentGenerateResponse(BaseModel):
    candidate_id: str
    job_title: str
    title: str
    description: str
    duration_minutes: int
    questions: list[dict]


class AssessmentSendResponse(BaseModel):
    candidate_id: str
    assessment_id: int
    invite_id: int
    token: str
    status: str
    invite_url: str | None
    assessment: dict
    email_sent: bool
    email: dict | None
    stage: str


class HRDecisionResponse(BaseModel):
    candidate_id: str
    name: str
    email: str
    resume_ref: str | None
    current_stage: str
    analysis_id: str
    round3_email: dict | None
