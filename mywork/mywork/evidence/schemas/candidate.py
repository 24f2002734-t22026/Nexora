"""Candidate-level aggregation of independent evidence sources."""

from pydantic import BaseModel, ConfigDict, Field

from .ranking import RankingEvidence
from .sources import EvidenceItem, MissingEvidence


class CandidateEvidence(BaseModel):
    """Candidate identity with logically separate resume, ranking, and assessment evidence."""

    model_config = ConfigDict(extra="forbid")

    candidate_id: str = Field(min_length=1)
    candidate_name: str = Field(min_length=1)
    resume_evidence: list[EvidenceItem] = Field(default_factory=list)
    ranking_evidence: RankingEvidence | None = None
    assessment_evidence: list[EvidenceItem] = Field(default_factory=list)
    comparison_evidence: list[EvidenceItem] = Field(default_factory=list)
    evidence_references: list[str] = Field(default_factory=list)
    missing_evidence: list[MissingEvidence] = Field(default_factory=list)
    overall_confidence: float | None = Field(default=None, ge=0, le=1)