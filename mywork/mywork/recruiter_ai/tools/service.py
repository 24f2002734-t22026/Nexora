"""Deterministic Nexa tools over provider and assessment-service interfaces."""

import hashlib
import json
import re
from collections.abc import Mapping
from typing import Any

from ...coding_assessment.client.errors import (
    AdapterValidationError,
    AmbiguousResultError,
    CodeAssessError,
    NotFoundError,
)
from ...coding_assessment.schemas.requests import AssessmentCreateRequest
from ...coding_assessment.schemas.responses import AssessmentResult
from ...coding_assessment.services.assessment_service import AssessmentService
from ...evidence.builder.candidate import build_candidate_evidence, build_ranking_evidence
from ...evidence.builder.comparison import compare_resume_vs_assessment
from ...evidence.schemas.candidate import CandidateEvidence
from ...evidence.schemas.ranking import RankingEvidence
from ...evidence.schemas.sources import EvidenceItem
from ..provider import CandidateRecord, NexoraDataProvider
from .errors import (
    AmbiguousAssessment,
    AssessmentNotFound,
    AssessmentUnavailable,
    CandidateNotFound,
    InvalidToolArguments,
    RankingDataUnavailable,
)
from .interfaces import MutationToolResult, ReadToolResult
from .results import (
    AssessmentComparison,
    AssessmentCreated,
    CandidateComparison,
    CandidateInviteCreated,
    CandidateSummary,
    SkillCandidate,
)


class NexaToolService:
    """Small deterministic implementation of the initial Nexa tool surface."""

    MAX_TOP_CANDIDATES = 50

    def __init__(
        self,
        provider: NexoraDataProvider,
        assessment_service: AssessmentService | None = None,
    ) -> None:
        self._provider = provider
        self._assessment_service = assessment_service

    def get_rankings(self) -> ReadToolResult:
        rankings = self._rankings()
        evidence = [item for ranking in rankings for item in ranking.evidence]
        return self._read("get_rankings", rankings, evidence)

    def get_top_candidates(self, limit: int = 3) -> ReadToolResult:
        self._validate_limit(limit)
        rankings = self._rankings()[:limit]
        evidence = [item for ranking in rankings for item in ranking.evidence]
        return self._read("get_top_candidates", rankings, evidence)

    def explain_candidate_rank(self, candidate_id: str) -> ReadToolResult:
        candidate_id = self._candidate_id(candidate_id)
        ranking = self._get_ranking(candidate_id)
        converted = build_ranking_evidence(ranking)
        return self._read("explain_candidate_rank", converted, converted.evidence)

    def compare_candidates(
        self, candidate_a: str, candidate_b: str
    ) -> ReadToolResult:
        candidate_a = self._candidate_id(candidate_a)
        candidate_b = self._candidate_id(candidate_b)
        if candidate_a == candidate_b:
            raise InvalidToolArguments("candidate_a and candidate_b must differ")
        first = build_ranking_evidence(self._get_ranking(candidate_a))
        second = build_ranking_evidence(self._get_ranking(candidate_b))
        data = CandidateComparison(
            candidate_a=first,
            candidate_b=second,
            final_score_difference=first.final_score - second.final_score,
            semantic_score_difference=first.semantic_score - second.semantic_score,
            keyword_score_difference=first.keyword_score - second.keyword_score,
            higher_final_score_candidate_id=(
                first.candidate_id
                if first.final_score > second.final_score
                else second.candidate_id
                if second.final_score > first.final_score
                else None
            ),
        )
        return self._read("compare_candidates", data, [*first.evidence, *second.evidence])

    def get_candidate(self, candidate_id: str) -> ReadToolResult:
        candidate_id = self._candidate_id(candidate_id)
        candidate = self._get_candidate(candidate_id)
        evidence = self._build_evidence(candidate_id, include_assessment=False)
        return self._read("get_candidate", candidate, self._evidence_items(evidence))

    def get_candidate_summary(self, candidate_id: str) -> ReadToolResult:
        candidate_id = self._candidate_id(candidate_id)
        candidate = self._get_candidate(candidate_id)
        ranking = self._optional_ranking(candidate_id)
        assessment_status = None
        warnings: list[str] = []
        if self._assessment_service is not None:
            try:
                assessment_status = self._assessment_result(candidate_id).status
            except AssessmentUnavailable as exc:
                warnings.append(str(exc))
        summary = CandidateSummary(
            candidate_id=candidate.candidate_id,
            candidate_name=candidate.candidate_name,
            key_skills=_skills(candidate.resume_data),
            experience=_list_field(candidate.resume_data, "experience"),
            projects=_list_field(candidate.resume_data, "projects"),
            ranking=build_ranking_evidence(ranking) if ranking else None,
            assessment_status=assessment_status,
        )
        evidence = self._build_evidence(candidate_id, include_assessment=False)
        return self._read(
            "get_candidate_summary", summary, self._evidence_items(evidence), warnings
        )

    def get_candidate_evidence(self, candidate_id: str) -> ReadToolResult:
        candidate_id = self._candidate_id(candidate_id)
        evidence = self._build_evidence(candidate_id, include_assessment=True)
        return self._read(
            "get_candidate_evidence", evidence, self._evidence_items(evidence)
        )

    def find_candidates_by_skill(self, skill: str) -> ReadToolResult:
        skill = self._skill(skill)
        candidates = self._provider.find_candidates_by_skill(skill)
        matches: list[SkillCandidate] = []
        all_evidence: list[EvidenceItem] = []
        for candidate in self._unique_candidates(candidates):
            evidence = self._build_evidence(candidate.candidate_id, include_assessment=False)
            supporting = [
                item
                for item in self._evidence_items(evidence)
                if item.source.value in ("resume", "ranking") and _mentions(item, skill)
            ]
            if supporting:
                matches.append(
                    SkillCandidate(
                        candidate_id=candidate.candidate_id,
                        candidate_name=candidate.candidate_name,
                        skill=skill,
                        state="evidenced",
                        evidence_ids=[item.evidence_id for item in supporting],
                    )
                )
                all_evidence.extend(supporting)
        return self._read("find_candidates_by_skill", matches, all_evidence)

    def find_candidates_missing_skill(self, skill: str) -> ReadToolResult:
        skill = self._skill(skill)
        candidates = self._provider.find_candidates_missing_skill(skill)
        matches: list[SkillCandidate] = []
        all_evidence: list[EvidenceItem] = []
        for candidate in self._unique_candidates(candidates):
            evidence = self._build_evidence(candidate.candidate_id, include_assessment=False)
            ranking_items = [
                item
                for item in self._evidence_items(evidence)
                if item.source.value == "ranking" and _mentions(item, skill)
            ]
            matches.append(
                SkillCandidate(
                    candidate_id=candidate.candidate_id,
                    candidate_name=candidate.candidate_name,
                    skill=skill,
                    state="skill_not_evidenced",
                    evidence_ids=[item.evidence_id for item in ranking_items],
                )
            )
            all_evidence.extend(ranking_items)
        return self._read("find_candidates_missing_skill", matches, all_evidence)

    def create_assessment(self, request: AssessmentCreateRequest) -> MutationToolResult:
        if not isinstance(request, AssessmentCreateRequest):
            raise InvalidToolArguments("request must be AssessmentCreateRequest")
        self._require_assessment_service()
        try:
            assessment = self._assessment_service.create_assessment(request)
        except CodeAssessError as exc:
            raise AssessmentUnavailable(str(exc)) from exc
        result = AssessmentCreated(assessment=assessment)
        return MutationToolResult(
            tool="create_assessment",
            action_result=result,
            idempotency_key=f"assessment:{assessment.id}",
        )

    def create_candidate_invite(
        self, candidate_id: str, assessment_id: int
    ) -> MutationToolResult:
        candidate_id = self._candidate_id(candidate_id)
        if not isinstance(assessment_id, int) or assessment_id <= 0:
            raise InvalidToolArguments("assessment_id must be a positive integer")
        self._require_assessment_service()
        candidate = self._get_candidate(candidate_id)
        try:
            invite = self._assessment_service.create_candidate_invite(
                candidate_id=candidate_id,
                profile_id=candidate_id,
                assessment_id=assessment_id,
                candidate_name=candidate.candidate_name,
                candidate_email=_email(candidate.resume_data),
            )
            invite_url = self._assessment_service.build_invite_url(invite)
        except AdapterValidationError as exc:
            raise InvalidToolArguments(str(exc)) from exc
        except CodeAssessError as exc:
            raise AssessmentUnavailable(str(exc)) from exc
        result = CandidateInviteCreated(
            candidate_id=candidate_id,
            assessment_id=assessment_id,
            invite=invite,
            invite_url=invite_url,
        )
        return MutationToolResult(
            tool="create_candidate_invite",
            action_result=result,
            affected_candidate_id=candidate_id,
            idempotency_key=f"invite:{candidate_id}:{assessment_id}",
        )

    def get_assessment_status(self, candidate_id: str) -> ReadToolResult:
        candidate_id = self._candidate_id(candidate_id)
        result = self._assessment_result(candidate_id)
        evidence = self._assessment_evidence(result, candidate_id)
        return self._read("get_assessment_status", result, evidence)

    def get_assessment_result(self, candidate_id: str) -> ReadToolResult:
        candidate_id = self._candidate_id(candidate_id)
        result = self._assessment_result(candidate_id)
        if result.status == "no_assessment":
            raise AssessmentNotFound(f"No assessment found for {candidate_id}")
        evidence = self._assessment_evidence(result, candidate_id)
        return self._read("get_assessment_result", result, evidence)

    def compare_resume_vs_assessment(self, candidate_id: str) -> ReadToolResult:
        candidate_id = self._candidate_id(candidate_id)
        candidate = self._build_evidence(candidate_id, include_assessment=True)
        comparisons = compare_resume_vs_assessment(candidate)
        data = AssessmentComparison(
            candidate_id=candidate_id,
            comparisons=comparisons,
            assessment_result=self._assessment_result(candidate_id),
        )
        comparison_ids = {
            evidence_id
            for comparison in comparisons
            for evidence_id in [
                *comparison.resume_evidence_ids,
                *comparison.assessment_evidence_ids,
            ]
        }
        evidence = [
            item
            for item in self._evidence_items(candidate)
            if item.evidence_id in comparison_ids
        ]
        return self._read("compare_resume_vs_assessment", data, evidence)

    def _rankings(self) -> list[RankingEvidence]:
        try:
            rankings = self._provider.get_rankings()
        except Exception as exc:
            raise RankingDataUnavailable("Ranking data is unavailable") from exc
        if not rankings:
            raise RankingDataUnavailable("Ranking data is unavailable")
        return [build_ranking_evidence(item) for item in sorted(rankings, key=lambda x: x.rank)]

    def _get_ranking(self, candidate_id: str) -> RankingEvidence:
        try:
            ranking = self._provider.get_candidate_ranking(candidate_id)
        except Exception as exc:
            raise RankingDataUnavailable("Ranking data is unavailable") from exc
        if ranking is None:
            raise RankingDataUnavailable(f"No ranking found for {candidate_id}")
        return ranking

    def _get_candidate(self, candidate_id: str) -> CandidateRecord:
        try:
            candidate = self._provider.get_candidate(candidate_id)
        except Exception as exc:
            raise CandidateNotFound(f"Candidate {candidate_id} was not found") from exc
        if candidate is None:
            raise CandidateNotFound(f"Candidate {candidate_id} was not found")
        return candidate

    def _optional_ranking(self, candidate_id: str) -> RankingEvidence | None:
        try:
            return self._provider.get_candidate_ranking(candidate_id)
        except Exception:
            return None

    def _build_evidence(
        self, candidate_id: str, include_assessment: bool
    ) -> CandidateEvidence:
        candidate = self._get_candidate(candidate_id)
        try:
            resume = self._provider.get_candidate_resume_data(candidate_id)
        except Exception as exc:
            raise CandidateNotFound(f"Resume data for {candidate_id} is unavailable") from exc
        assessment = self._assessment_result(candidate_id) if include_assessment else None
        return build_candidate_evidence(
            candidate_id=candidate_id,
            candidate_name=candidate.candidate_name,
            resume=resume,
            ranking=self._optional_ranking(candidate_id),
            assessment=assessment,
            document_id=candidate.document_id,
        )

    def _assessment_result(self, candidate_id: str) -> AssessmentResult:
        self._require_assessment_service()
        try:
            return self._assessment_service.get_candidate_assessment_result(candidate_id)
        except AmbiguousResultError as exc:
            raise AmbiguousAssessment(str(exc)) from exc
        except NotFoundError as exc:
            raise AssessmentNotFound(str(exc)) from exc
        except AdapterValidationError as exc:
            raise InvalidToolArguments(str(exc)) from exc
        except CodeAssessError as exc:
            raise AssessmentUnavailable("Assessment data is currently unavailable") from exc

    def _assessment_evidence(
        self, result: AssessmentResult, candidate_id: str
    ) -> list[EvidenceItem]:
        evidence = build_candidate_evidence(
            candidate_id=candidate_id,
            candidate_name=result.invite.candidate_name if result.invite else candidate_id,
            assessment=result,
        )
        return self._evidence_items(evidence)

    def _require_assessment_service(self) -> None:
        if self._assessment_service is None:
            raise AssessmentUnavailable("Assessment service is not configured")

    @staticmethod
    def _evidence_items(candidate: CandidateEvidence) -> list[EvidenceItem]:
        ranking_items = candidate.ranking_evidence.evidence if candidate.ranking_evidence else []
        return [
            *candidate.resume_evidence,
            *ranking_items,
            *candidate.assessment_evidence,
            *candidate.comparison_evidence,
        ]

    @staticmethod
    def _read(
        tool: str,
        data: object,
        evidence: list[EvidenceItem],
        warnings: list[str] | None = None,
    ) -> ReadToolResult:
        return ReadToolResult(
            tool=tool,
            data=data,
            evidence=evidence,
            warnings=warnings or [],
        )

    @classmethod
    def _validate_limit(cls, limit: int) -> None:
        if not isinstance(limit, int) or isinstance(limit, bool):
            raise InvalidToolArguments("limit must be an integer")
        if limit < 1 or limit > cls.MAX_TOP_CANDIDATES:
            raise InvalidToolArguments(
                f"limit must be between 1 and {cls.MAX_TOP_CANDIDATES}"
            )

    @staticmethod
    def _candidate_id(candidate_id: str) -> str:
        if not isinstance(candidate_id, str) or not candidate_id.strip():
            raise InvalidToolArguments("candidate_id cannot be blank")
        return candidate_id.strip()

    @staticmethod
    def _skill(skill: str) -> str:
        if not isinstance(skill, str) or not skill.strip():
            raise InvalidToolArguments("skill cannot be blank")
        return skill.strip()

    @staticmethod
    def _unique_candidates(candidates: list[CandidateRecord]) -> list[CandidateRecord]:
        result: list[CandidateRecord] = []
        seen: set[str] = set()
        for candidate in candidates:
            if candidate.candidate_id not in seen:
                seen.add(candidate.candidate_id)
                result.append(candidate)
        return result


def _tokens(value: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", value.lower()))


def _mentions(item: EvidenceItem, skill: str) -> bool:
    return bool(_tokens(skill) & _tokens(f"{item.claim} {item.value}"))


def _skills(resume: Mapping[str, object]) -> list[str]:
    values = resume.get("skills", [])
    if isinstance(values, str):
        return [values]
    if not isinstance(values, list):
        return []
    result: list[str] = []
    for value in values:
        if isinstance(value, str):
            result.append(value)
        elif isinstance(value, Mapping):
            for key in ("name", "skill", "value", "title"):
                if isinstance(value.get(key), str):
                    result.append(value[key])
                    break
    return result


def _list_field(resume: Mapping[str, object], field: str) -> list[object]:
    value = resume.get(field, [])
    if isinstance(value, list):
        return value
    return [value] if value else []


def _email(resume: Mapping[str, object]) -> str:
    email = resume.get("email")
    if not isinstance(email, str) or not email.strip():
        raise InvalidToolArguments("candidate email is required to create an invite")
    return email.strip()