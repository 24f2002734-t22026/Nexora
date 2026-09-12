"""Provider boundary for unfinished Nexora candidate and ranking data."""

from typing import Protocol

from pydantic import BaseModel, ConfigDict, Field

from ..evidence.schemas.ranking import RankingEvidence


class CandidateRecord(BaseModel):
    """Structured candidate data supplied by the future Nexora backend."""

    model_config = ConfigDict(extra="forbid")

    candidate_id: str = Field(min_length=1)
    candidate_name: str = Field(min_length=1)
    resume_data: dict[str, object] = Field(default_factory=dict)
    document_id: str | None = None


class NexoraDataProvider(Protocol):
    """Read-only data interface consumed by deterministic Nexa tools."""

    def get_rankings(self) -> list[RankingEvidence]: ...

    def get_candidate(self, candidate_id: str) -> CandidateRecord | None: ...

    def get_candidates(self) -> list[CandidateRecord]: ...

    def get_candidate_resume_data(self, candidate_id: str) -> dict[str, object]: ...

    def get_candidate_ranking(self, candidate_id: str) -> RankingEvidence | None: ...

    def find_candidates_by_skill(self, skill: str) -> list[CandidateRecord]: ...

    def find_candidates_missing_skill(self, skill: str) -> list[CandidateRecord]: ...