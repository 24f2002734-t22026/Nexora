"""Conversion of normalized CodeAssess results into assessment evidence."""

import hashlib
import json

from ...coding_assessment.mapper.candidate_mapping import CandidateMapping
from ...coding_assessment.schemas.responses import AssessmentResult, SubmissionWithEvaluation
from ..schemas.sources import EvidenceItem, EvidenceReference, EvidenceSource


def build_assessment_evidence(
    result: AssessmentResult,
    candidate_id: str,
) -> list[EvidenceItem]:
    """Build provenance-rich observations while rejecting cross-candidate data."""

    _validate_candidate(result, candidate_id)
    assessment_id = str(result.assessment.id) if result.assessment else None
    invite_id = str(result.invite.id) if result.invite else None
    evidence: list[EvidenceItem] = []
    for submission in result.submissions:
        evaluation = submission.evaluation
        reference = EvidenceReference(
            candidate_id=candidate_id,
            profile_id=result.profile_id,
            assessment_id=assessment_id,
            invite_id=invite_id,
            submission_id=str(submission.id),
            evaluation_id=str(evaluation.id) if evaluation and evaluation.id else None,
        )
        if evaluation is None:
            evidence.append(
                _item(
                    reference,
                    "submission",
                    "Assessment submission",
                    submission.status,
                )
            )
            continue
        if evaluation.overall_score is not None:
            evidence.append(
                _item(
                    reference,
                    "technical_performance",
                    "Overall technical assessment",
                    evaluation.explanation or "Evaluation completed",
                    score=evaluation.overall_score,
                )
            )
        for field, label in (
            ("correctness_score", "Correctness score"),
            ("efficiency_score", "Efficiency score"),
            ("code_quality_score", "Code quality score"),
        ):
            score = getattr(evaluation, field)
            if score is not None:
                evidence.append(
                    _item(reference, "score", label, str(score), score=score)
                )
        for field, label in (
            ("time_complexity", "Time complexity"),
            ("space_complexity", "Space complexity"),
        ):
            value = getattr(evaluation, field)
            if value:
                evidence.append(_item(reference, "complexity", label, value))
        for field, label in (
            ("detected_issues", "Detected issues"),
            ("strengths", "Strengths"),
            ("improvements", "Suggested improvements"),
        ):
            values = getattr(evaluation, field)
            if values:
                evidence.append(
                    _item(
                        reference,
                        "evaluation_detail",
                        label,
                        json.dumps(values, sort_keys=True),
                    )
                )
        if evaluation.is_correct is not None:
            evidence.append(
                _item(
                    reference,
                    "correctness",
                    "Solution appears correct",
                    str(evaluation.is_correct).lower(),
                )
            )
    return evidence


def _validate_candidate(result: AssessmentResult, candidate_id: str) -> None:
    try:
        CandidateMapping.create(candidate_id, result.profile_id)
    except ValueError as exc:
        raise ValueError("assessment evidence belongs to another candidate") from exc
    if result.invite and result.invite.profile_id not in (None, candidate_id):
        raise ValueError("assessment invite belongs to another candidate")


def _item(
    reference: EvidenceReference,
    category: str,
    claim: str,
    value: str,
    score: float | None = None,
) -> EvidenceItem:
    canonical = json.dumps(
        [category, claim, value, reference.model_dump()],
        sort_keys=True,
        default=str,
        separators=(",", ":"),
    )
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:12]
    return EvidenceItem(
        evidence_id=f"ev_assessment_{digest}",
        source=EvidenceSource.CODING_ASSESSMENT,
        category=category,
        claim=claim,
        value=value,
        score=score,
        confidence=None,
        provenance=reference,
    )