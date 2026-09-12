"""Deterministic candidate and skill entity resolution."""

from collections.abc import Iterable

from ..provider import CandidateRecord, NexoraDataProvider
from ..schemas.agent import IntentDecision, IntentName
from .errors import AmbiguousCandidate, MissingEntity, UnknownCandidate


class EntityResolver:
    """Resolve explicit IDs or known names without guessing."""

    def __init__(self, provider: NexoraDataProvider) -> None:
        self._provider = provider

    def resolve_candidates(
        self,
        decision: IntentDecision,
        message: str,
        explicit_ids: Iterable[str] = (),
    ) -> list[str]:
        candidates = self._provider.get_candidates()
        by_id = {candidate.candidate_id: candidate for candidate in candidates}
        resolved: list[str] = []
        for candidate_id in [*explicit_ids, *decision.candidate_ids]:
            if candidate_id not in by_id:
                raise UnknownCandidate(f"Unknown candidate ID: {candidate_id}")
            if candidate_id not in resolved:
                resolved.append(candidate_id)

        lowered = message.casefold()
        for name in decision.candidate_names:
            resolved.append(self._resolve_name(name, candidates))
        for candidate in candidates:
            if candidate.candidate_name.casefold() in lowered:
                resolved.append(self._resolve_name(candidate.candidate_name, candidates))
        return _unique(resolved)

    def resolve_skill(self, decision: IntentDecision, message: str) -> str:
        if decision.skill and decision.skill.strip():
            return self._canonical_skill(decision.skill, message)
        candidates = self._provider.get_candidates()
        lowered = message.casefold()
        known_skills = {
            skill
            for candidate in candidates
            for skill in _candidate_skills(candidate)
        }
        matches = [skill for skill in known_skills if skill.casefold() in lowered]
        if not matches:
            raise MissingEntity("Please specify the skill to search for")
        return max(matches, key=len)

    @staticmethod
    def require_count(candidate_ids: list[str], count: int) -> None:
        if len(candidate_ids) != count:
            raise MissingEntity(f"Please specify exactly {count} candidates")

    @staticmethod
    def _resolve_name(name: str, candidates: list[CandidateRecord]) -> str:
        matches = [
            candidate
            for candidate in candidates
            if candidate.candidate_name.casefold() == name.casefold()
        ]
        if not matches:
            raise UnknownCandidate(f"Unknown candidate: {name}")
        if len(matches) > 1:
            raise AmbiguousCandidate(f"More than one candidate is named {name}")
        return matches[0].candidate_id

    @staticmethod
    def _canonical_skill(skill: str, message: str) -> str:
        for token in (skill, skill.casefold()):
            if token.casefold() in message.casefold():
                return token
        return skill


def _unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def _candidate_skills(candidate: CandidateRecord) -> list[str]:
    values = candidate.resume_data.get("skills", [])
    if isinstance(values, str):
        return [values]
    if not isinstance(values, list):
        return []
    return [value for value in values if isinstance(value, str)]