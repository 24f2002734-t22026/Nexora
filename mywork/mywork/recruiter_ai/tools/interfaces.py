"""Protocols for Nexa tools; implementations belong to a later phase."""

from typing import Protocol

from pydantic import BaseModel, ConfigDict, Field

from ...coding_assessment.schemas.requests import AssessmentCreateRequest
from ...evidence.schemas.sources import EvidenceItem


class ReadToolResult(BaseModel):
    """Common envelope for read tools with grounded evidence."""

    model_config = ConfigDict(extra="forbid")

    tool: str = Field(min_length=1)
    success: bool = True
    data: object | None = None
    evidence: list[EvidenceItem] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class MutationToolResult(BaseModel):
    """Future envelope for assessment mutations."""

    model_config = ConfigDict(extra="forbid")

    tool: str = Field(min_length=1)
    success: bool = True
    action_result: object | None = None
    affected_candidate_id: str | None = None
    idempotency_key: str = Field(min_length=1)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class NexaTools(Protocol):
    """Complete initial tool surface without tool execution behavior."""

    def get_rankings(self) -> ReadToolResult: ...

    def get_top_candidates(self, limit: int = 3) -> ReadToolResult: ...

    def explain_candidate_rank(self, candidate_id: str) -> ReadToolResult: ...

    def compare_candidates(
        self, candidate_a: str, candidate_b: str
    ) -> ReadToolResult: ...

    def get_candidate(self, candidate_id: str) -> ReadToolResult: ...

    def get_candidate_summary(self, candidate_id: str) -> ReadToolResult: ...

    def get_candidate_evidence(self, candidate_id: str) -> ReadToolResult: ...

    def find_candidates_by_skill(self, skill: str) -> ReadToolResult: ...

    def find_candidates_missing_skill(self, skill: str) -> ReadToolResult: ...

    def create_assessment(
        self, request: AssessmentCreateRequest
    ) -> MutationToolResult: ...

    def create_candidate_invite(
        self, candidate_id: str, assessment_id: int
    ) -> MutationToolResult: ...

    def get_assessment_status(self, candidate_id: str) -> ReadToolResult: ...

    def get_assessment_result(self, candidate_id: str) -> ReadToolResult: ...

    def compare_resume_vs_assessment(self, candidate_id: str) -> ReadToolResult: ...