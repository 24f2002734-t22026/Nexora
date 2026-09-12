"""Deterministic resume-to-assessment comparison contracts."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class ComparisonStatus(StrEnum):
    """Conclusions supported by structured evidence only."""

    SUPPORTED = "supported"
    PARTIALLY_SUPPORTED = "partially_supported"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    CONTRADICTED = "contradicted"
    UNAVAILABLE = "unavailable"


class ComparisonResult(BaseModel):
    """A deterministic relationship between a resume claim and assessment data."""

    model_config = ConfigDict(extra="forbid")

    candidate_id: str = Field(min_length=1)
    claim: str = Field(min_length=1)
    status: ComparisonStatus
    resume_evidence_ids: list[str] = Field(default_factory=list)
    assessment_evidence_ids: list[str] = Field(default_factory=list)
    reason: str = Field(min_length=1)