import unittest

from pydantic import ValidationError

from mywork.evidence.schemas import (
    CandidateEvidence,
    EvidenceItem,
    EvidenceReference,
    EvidenceSource,
    RankingEvidence,
)


class EvidenceTests(unittest.TestCase):
    def make_item(self, source: EvidenceSource) -> EvidenceItem:
        return EvidenceItem(
            evidence_id="ev_001",
            source=source,
            category="skill",
            claim="Backend Development",
            value="FastAPI, SQL",
            confidence=0.91,
            provenance=EvidenceReference(document="resume_014"),
        )

    def test_confidence_is_bounded(self) -> None:
        with self.assertRaises(ValidationError):
            EvidenceItem(
                evidence_id="ev_invalid",
                source=EvidenceSource.RESUME,
                category="skill",
                claim="Backend Development",
                value="FastAPI",
                confidence=1.1,
                provenance=EvidenceReference(document="resume_014"),
            )

    def test_supported_sources_and_provenance(self) -> None:
        item = self.make_item(EvidenceSource.CODING_ASSESSMENT).model_copy(
            update={
                "provenance": EvidenceReference(
                    assessment_id="test_22",
                    submission_id="184",
                    evaluation_id="77",
                )
            }
        )
        self.assertEqual(item.source, EvidenceSource.CODING_ASSESSMENT)
        self.assertEqual(item.provenance.submission_id, "184")

    def test_resume_and_assessment_remain_distinct(self) -> None:
        resume = self.make_item(EvidenceSource.RESUME)
        assessment = self.make_item(EvidenceSource.CODING_ASSESSMENT)
        candidate = CandidateEvidence(
            candidate_id="cand_014",
            candidate_name="Rahul",
            resume_evidence=[resume],
            assessment_evidence=[assessment],
            evidence_references=[resume.evidence_id, assessment.evidence_id],
        )
        self.assertEqual(candidate.resume_evidence[0].source, EvidenceSource.RESUME)
        self.assertEqual(
            candidate.assessment_evidence[0].source,
            EvidenceSource.CODING_ASSESSMENT,
        )

    def test_ranking_contract_preserves_component_scores(self) -> None:
        ranking = RankingEvidence(
            candidate_id="cand_014",
            candidate_name="Rahul",
            rank=1,
            final_score=91.4,
            semantic_score=93.0,
            keyword_score=88.0,
            matched_skills=["Python", "FastAPI", "SQL"],
            missing_skills=["Docker"],
        )
        payload = ranking.model_dump()
        self.assertEqual(payload["semantic_score"], 93.0)
        self.assertEqual(payload["keyword_score"], 88.0)
        self.assertEqual(payload["final_score"], 91.4)
        self.assertEqual(payload["missing_skills"], ["Docker"])


if __name__ == "__main__":
    unittest.main()