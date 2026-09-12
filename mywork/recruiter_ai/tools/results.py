"""Typed payloads returned by Nexa tools."""

from pydantic import BaseModel, ConfigDict, Field

from ...coding_assessment.schemas.responses import (
    AssessmentResponse,
    AssessmentResult,
    InviteResponse,
)
from ...evidence.schemas.comparison import ComparisonResult
from ...evidence.schemas.ranking import RankingEvidence


class CandidateComparison(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_a: RankingEvidence
    candidate_b: RankingEvidence
    final_score_difference: float
    semantic_score_difference: float
    keyword_score_difference: float
    higher_final_score_candidate_id: str | None = None


class CandidateSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_id: str
    candidate_name: str
    key_skills: list[str] = Field(default_factory=list)
    experience: list[object] = Field(default_factory=list)
    projects: list[object] = Field(default_factory=list)
    ranking: RankingEvidence | None = None
    assessment_status: str | None = None


class SkillCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_id: str
    candidate_name: str
    skill: str
    state: str
    evidence_ids: list[str] = Field(default_factory=list)


class AssessmentCreated(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assessment: AssessmentResponse


class CandidateInviteCreated(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_id: str
    assessment_id: int
    invite: InviteResponse
    invite_url: str | None = None


class AssessmentComparison(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_id: str
    comparisons: list[ComparisonResult] = Field(default_factory=list)
    assessment_result: AssessmentResult