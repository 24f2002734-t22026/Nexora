"""Explicit Nexora-to-CodeAssess candidate identity mapping."""

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CandidateMapping(BaseModel):
    """The only supported association between a Nexora candidate and CodeAssess."""

    model_config = ConfigDict(extra="forbid")

    candidate_id: str = Field(min_length=1)
    profile_id: str = Field(min_length=1)

    @field_validator("candidate_id", "profile_id")
    @classmethod
    def reject_blank_ids(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("candidate and profile IDs cannot be blank")
        return value

    @classmethod
    def create(cls, candidate_id: str, profile_id: str) -> "CandidateMapping":
        mapping = cls(candidate_id=candidate_id, profile_id=profile_id)
        mapping.validate_match()
        return mapping

    def validate_match(self) -> None:
        if self.candidate_id != self.profile_id:
            raise ValueError(
                "candidate_id and profile_id must match for safe correlation"
            )

    def is_valid(self) -> bool:
        try:
            self.validate_match()
        except ValueError:
            return False
        return True