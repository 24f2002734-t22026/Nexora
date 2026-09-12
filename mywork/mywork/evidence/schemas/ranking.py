"""Contracts emitted by the deterministic Nexora ranking engine."""

from pydantic import BaseModel, ConfigDict, Field

from .sources import EvidenceItem


class RankingEvidence(BaseModel):
    """Explainable ranking output; this model does not define the algorithm."""

    model_config = ConfigDict(extra="forbid")

    candidate_id: str = Field(min_length=1)
    candidate_name: str = Field(min_length=1)
    rank: int = Field(ge=1)
    final_score: float = Field(ge=0, le=100)
    semantic_score: float = Field(ge=0, le=100)
    keyword_score: float = Field(ge=0, le=100)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)