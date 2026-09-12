"""Typed evidence schemas."""

from .candidate import CandidateEvidence
from .comparison import ComparisonResult, ComparisonStatus
from .ranking import RankingEvidence
from .sources import EvidenceItem, EvidenceReference, EvidenceSource

__all__ = [
    "CandidateEvidence",
    "ComparisonResult",
    "ComparisonStatus",
    "EvidenceItem",
    "EvidenceReference",
    "EvidenceSource",
    "RankingEvidence",
]