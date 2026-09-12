"""Stable recruiter chat response models consumed by the future UI."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from ...evidence.schemas.sources import EvidenceSource


class Action(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str = Field(min_length=1)
    label: str = Field(min_length=1)
    payload: dict[str, object] = Field(default_factory=dict)


class Warning(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=1)
    message: str = Field(min_length=1)


class ResponseEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evidence_id: str = Field(min_length=1)
    source: EvidenceSource
    summary: str = Field(min_length=1)
    candidate_id: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)


class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer: str
    intent: str = Field(min_length=1)
    evidence: list[ResponseEvidence] = Field(default_factory=list)
    actions: list[Action] = Field(default_factory=list)
    warnings: list[Warning] = Field(default_factory=list)