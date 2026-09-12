"""Resume, ranking, and candidate aggregation builders."""

import hashlib
import json
from collections.abc import Mapping, Sequence
from typing import Any

from ..schemas.candidate import CandidateEvidence
from ...coding_assessment.schemas.responses import AssessmentResult
from ..schemas.ranking import RankingEvidence
from ..schemas.sources import EvidenceItem, EvidenceReference, EvidenceSource
from .assessment import build_assessment_evidence

_RESUME_FIELDS = {
    "skills": "skill",
    "experience": "experience",
    "projects": "project",
    "education": "education",
    "claims": "claim",
}


def build_resume_evidence(
    candidate_id: str,
    resume: Mapping[str, Any],
    document_id: str | None = None,
    default_confidence: float | None = None,
) -> list[EvidenceItem]:
    """Convert only fields present in a structured resume into evidence items."""

    if not candidate_id.strip():
        raise ValueError("candidate_id cannot be blank")
    evidence: list[EvidenceItem] = []
    for field, category in _RESUME_FIELDS.items():
        if field not in resume or resume[field] is None:
            continue
        values = _as_sequence(resume[field])
        for index, raw_value in enumerate(values):
            item_data = raw_value if isinstance(raw_value, Mapping) else {}
            value = _resume_value(raw_value)
            if not value:
                continue
            location = f"{field}[{index}]" if len(values) > 1 else field
            claim = _resume_claim(item_data, category)
            confidence = item_data.get("confidence", default_confidence)
            provenance = EvidenceReference(
                document=document_id,
                location=location,
                candidate_id=candidate_id,
            )
            evidence.append(
                EvidenceItem(
                    evidence_id=_stable_id(
                        "resume", candidate_id, document_id, location, claim, value
                    ),
                    source=EvidenceSource.RESUME,
                    category=category,
                    claim=claim,
                    value=value,
                    confidence=confidence,
                    provenance=provenance,
                )
            )
    return evidence


def build_ranking_evidence(
    ranking: RankingEvidence,
    job_id: str | None = None,
) -> RankingEvidence:
    """Wrap an existing ranking record without recalculating any score."""

    value = json.dumps(
        {
            "rank": ranking.rank,
            "final_score": ranking.final_score,
            "semantic_score": ranking.semantic_score,
            "keyword_score": ranking.keyword_score,
            "matched_skills": ranking.matched_skills,
            "missing_skills": ranking.missing_skills,
        },
        sort_keys=True,
    )
    item = EvidenceItem(
        evidence_id=_stable_id("ranking", ranking.candidate_id, job_id, value),
        source=EvidenceSource.RANKING,
        category="ranking",
        claim="Candidate ranking",
        value=value,
        score=ranking.final_score,
        confidence=None,
        provenance=EvidenceReference(
            candidate_id=ranking.candidate_id,
            job_id=job_id,
        ),
    )
    return RankingEvidence.model_validate(
        {**ranking.model_dump(), "evidence": [item]}
    )


def build_candidate_evidence(
    candidate_id: str,
    candidate_name: str,
    resume: Mapping[str, Any] | None = None,
    ranking: RankingEvidence | None = None,
    assessment: AssessmentResult | None = None,
    document_id: str | None = None,
    job_id: str | None = None,
    default_resume_confidence: float | None = None,
) -> CandidateEvidence:
    """Aggregate source-specific evidence while preserving candidate boundaries."""

    resume_evidence = build_resume_evidence(
        candidate_id,
        resume or {},
        document_id=document_id,
        default_confidence=default_resume_confidence,
    )
    ranking_evidence = None
    ranking_items: list[EvidenceItem] = []
    if ranking is not None:
        if ranking.candidate_id != candidate_id:
            raise ValueError("ranking evidence belongs to another candidate")
        ranking_evidence = build_ranking_evidence(ranking, job_id=job_id)
        ranking_items = ranking_evidence.evidence
    assessment_evidence = (
        build_assessment_evidence(assessment, candidate_id)
        if assessment is not None
        else []
    )
    all_ids = [
        item.evidence_id
        for item in [*resume_evidence, *ranking_items, *assessment_evidence]
    ]
    if len(all_ids) != len(set(all_ids)):
        raise ValueError("evidence IDs must be unique within a candidate response")
    candidate = CandidateEvidence(
        candidate_id=candidate_id,
        candidate_name=candidate_name,
        resume_evidence=resume_evidence,
        ranking_evidence=ranking_evidence,
        assessment_evidence=assessment_evidence,
        evidence_references=all_ids,
    )
    # Imported lazily because comparison.py consumes CandidateEvidence.
    from .comparison import build_comparison_evidence

    comparison_evidence = build_comparison_evidence(candidate)
    comparison_ids = [item.evidence_id for item in comparison_evidence]
    all_ids.extend(comparison_ids)
    if len(all_ids) != len(set(all_ids)):
        raise ValueError("evidence IDs must be unique within a candidate response")
    return CandidateEvidence.model_validate(
        {
            **candidate.model_dump(),
            "comparison_evidence": comparison_evidence,
            "evidence_references": all_ids,
        }
    )


def _as_sequence(value: Any) -> list[Any]:
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        return list(value)
    return [value]


def _resume_claim(item: Mapping[str, Any], category: str) -> str:
    for key in ("claim", "skill", "title", "name", "label"):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return category.replace("_", " ").title()


def _resume_value(value: Any) -> str:
    if isinstance(value, Mapping):
        for key in ("value", "text", "description", "details", "name", "title"):
            selected = value.get(key)
            if isinstance(selected, str) and selected.strip():
                return selected.strip()
        clean = {key: item for key, item in value.items() if key != "confidence"}
        return json.dumps(clean, sort_keys=True, separators=(",", ":"))
    if value is None:
        return ""
    return str(value).strip()


def _stable_id(prefix: str, *parts: object) -> str:
    canonical = json.dumps(parts, sort_keys=True, default=str, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:12]
    return f"ev_{prefix}_{digest}"