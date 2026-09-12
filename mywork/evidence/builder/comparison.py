"""Transparent resume-to-assessment comparison without an LLM."""

import hashlib
import json
import re

from ..schemas.candidate import CandidateEvidence
from ..schemas.comparison import ComparisonResult, ComparisonStatus
from ..schemas.sources import EvidenceItem, EvidenceReference, EvidenceSource

_STOP_WORDS = {
    "a",
    "an",
    "and",
    "the",
    "of",
    "with",
    "in",
    "on",
    "for",
    "experience",
    "development",
}


def compare_resume_vs_assessment(
    candidate_evidence: CandidateEvidence,
) -> list[ComparisonResult]:
    """Compare each resume claim only with assessment evidence for that candidate."""

    _validate_candidate_sources(candidate_evidence)
    results: list[ComparisonResult] = []
    for resume_item in candidate_evidence.resume_evidence:
        if not candidate_evidence.assessment_evidence:
            results.append(
                _result(
                    candidate_evidence.candidate_id,
                    resume_item,
                    ComparisonStatus.UNAVAILABLE,
                    [],
                    "No coding assessment evidence is available for this candidate.",
                )
            )
            continue
        matching = [
            item
            for item in candidate_evidence.assessment_evidence
            if _tokens(resume_item.claim + " " + resume_item.value)
            & _tokens(item.claim + " " + item.value)
        ]
        if not matching:
            results.append(
                _result(
                    candidate_evidence.candidate_id,
                    resume_item,
                    ComparisonStatus.INSUFFICIENT_EVIDENCE,
                    [],
                    "The assessment does not contain evidence relevant to this resume claim.",
                )
            )
            continue
        status = _status_for(matching)
        reason = {
            ComparisonStatus.SUPPORTED: (
                "Assessment evidence demonstrates the relevant capability described by the resume claim."
            ),
            ComparisonStatus.PARTIALLY_SUPPORTED: (
                "Assessment evidence is relevant but includes limited score or performance support."
            ),
            ComparisonStatus.CONTRADICTED: (
                "Assessment evidence explicitly contradicts the resume claim."
            ),
        }[status]
        results.append(
            _result(
                candidate_evidence.candidate_id,
                resume_item,
                status,
                matching,
                reason,
            )
        )
    return results


def build_comparison_evidence(
    candidate_evidence: CandidateEvidence,
) -> list[EvidenceItem]:
    """Turn deterministic comparison results into traceable comparison evidence."""

    results = compare_resume_vs_assessment(candidate_evidence)
    items: list[EvidenceItem] = []
    for result in results:
        related = [*result.resume_evidence_ids, *result.assessment_evidence_ids]
        canonical = json.dumps(
            [result.model_dump(), related], sort_keys=True, separators=(",", ":")
        )
        digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:12]
        items.append(
            EvidenceItem(
                evidence_id=f"ev_comparison_{digest}",
                source=EvidenceSource.COMPARISON,
                category="resume_assessment_comparison",
                claim=result.claim,
                value=f"{result.status.value}: {result.reason}",
                confidence=None,
                provenance=EvidenceReference(
                    candidate_id=result.candidate_id,
                    related_evidence_ids=related,
                ),
            )
        )
    return items


def _validate_candidate_sources(candidate: CandidateEvidence) -> None:
    for item in [*candidate.resume_evidence, *candidate.assessment_evidence]:
        source_candidate = item.provenance.candidate_id
        source_profile = item.provenance.profile_id
        if source_candidate not in (None, candidate.candidate_id):
            raise ValueError("evidence belongs to another candidate")
        if source_profile not in (None, candidate.candidate_id):
            raise ValueError("evidence profile belongs to another candidate")


def _result(
    candidate_id: str,
    resume_item: EvidenceItem,
    status: ComparisonStatus,
    assessment_items: list[EvidenceItem],
    reason: str,
) -> ComparisonResult:
    return ComparisonResult(
        candidate_id=candidate_id,
        claim=resume_item.claim,
        status=status,
        resume_evidence_ids=[resume_item.evidence_id],
        assessment_evidence_ids=[item.evidence_id for item in assessment_items],
        reason=reason,
    )


def _tokens(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", value.lower())
        if token not in _STOP_WORDS and len(token) > 1
    }


def _status_for(items: list[EvidenceItem]) -> ComparisonStatus:
    text = " ".join(f"{item.claim} {item.value}" for item in items).lower()
    if any(marker in text for marker in ("contradicts", "explicitly false")):
        return ComparisonStatus.CONTRADICTED
    scores = [item.score for item in items if item.score is not None]
    if scores and max(scores) < 60:
        return ComparisonStatus.PARTIALLY_SUPPORTED
    if any(marker in text for marker in ("failed", "incorrect", "poor", "weak")):
        return ComparisonStatus.PARTIALLY_SUPPORTED
    return ComparisonStatus.SUPPORTED