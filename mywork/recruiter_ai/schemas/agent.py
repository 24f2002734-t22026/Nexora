"""Internal contracts for controlled Nexa orchestration."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class IntentName(StrEnum):
    RANK_EXPLANATION = "rank_explanation"
    CANDIDATE_COMPARISON = "candidate_comparison"
    TOP_CANDIDATES = "top_candidates"
    SKILL_SEARCH = "skill_search"
    MISSING_SKILL_SEARCH = "missing_skill_search"
    CANDIDATE_SUMMARY = "candidate_summary"
    CANDIDATE_EVIDENCE = "candidate_evidence"
    ASSESSMENT_CREATION = "assessment_creation"
    ASSESSMENT_STATUS = "assessment_status"
    ASSESSMENT_RESULT = "assessment_result"
    RESUME_ASSESSMENT_COMPARISON = "resume_assessment_comparison"
    UNSUPPORTED = "unsupported"
    CLARIFICATION_REQUIRED = "clarification_required"


class IntentDecision(BaseModel):
    """Constrained intent/entities produced before tool execution."""

    model_config = ConfigDict(extra="forbid")

    intent: IntentName
    candidate_names: list[str] = Field(default_factory=list)
    candidate_ids: list[str] = Field(default_factory=list)
    skill: str | None = None
    limit: int | None = None


class StructuredResponse(BaseModel):
    """Only the natural-language portion accepted from a response provider."""

    model_config = ConfigDict(extra="forbid")

    answer: str = Field(min_length=1)
    key_points: list[str] = Field(default_factory=list)