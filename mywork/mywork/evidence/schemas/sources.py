"""Reusable evidence source and provenance models."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class EvidenceSource(StrEnum):
    """Known evidence producers in the Nexora hiring workflow."""

    RESUME = "resume"
    RANKING = "ranking"
    CODING_ASSESSMENT = "coding_assessment"
    COMPARISON = "comparison"


class EvidenceReference(BaseModel):
    """A structured pointer to the record that produced evidence."""

    model_config = ConfigDict(extra="forbid")

    document: str | None = None
    location: str | None = None
    candidate_id: str | None = None
    profile_id: str | None = None
    job_id: str | None = None
    assessment_id: str | None = None
    invite_id: str | None = None
    submission_id: str | None = None
    evaluation_id: str | None = None
    ranking_id: str | None = None
    related_evidence_ids: list[str] = Field(default_factory=list)


class EvidenceItem(BaseModel):
    """One observable claim, kept separate from other evidence sources."""

    model_config = ConfigDict(extra="forbid")

    evidence_id: str = Field(min_length=1)
    source: EvidenceSource
    category: str = Field(min_length=1)
    claim: str = Field(min_length=1)
    value: str = Field(min_length=1)
    score: float | None = Field(default=None, ge=0, le=100)
    confidence: float | None = Field(default=None, ge=0, le=1)
    provenance: EvidenceReference


class MissingEvidence(BaseModel):
    """An explicit statement that a requested evidence source is unavailable."""

    model_config = ConfigDict(extra="forbid")

    source: EvidenceSource
    reason: str = Field(min_length=1)
