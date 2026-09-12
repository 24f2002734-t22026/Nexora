import unittest

from mywork.coding_assessment.schemas.responses import (
    AIEvaluation,
    AssessmentResponse,
    AssessmentResult,
    InviteResponse,
    SubmissionWithEvaluation,
)
from mywork.evidence.builder import (
    build_assessment_evidence,
    build_candidate_evidence,
    build_comparison_evidence,
    build_ranking_evidence,
    build_resume_evidence,
    compare_resume_vs_assessment,
)
from mywork.evidence.schemas import (
    CandidateEvidence,
    ComparisonStatus,
    EvidenceItem,
    EvidenceReference,
    EvidenceSource,
    RankingEvidence,
)


def assessment_result(
    profile_id: str = "cand_014",
    evaluation: AIEvaluation | None = None,
) -> AssessmentResult:
    return AssessmentResult(
        profile_id=profile_id,
        assessment=AssessmentResponse(
            id=22,
            title="Backend Assessment",
            description=None,
            interviewer_id=1,
        ),
        invite=InviteResponse(
            id=9,
            test_id=22,
            candidate_name="Rahul",
            candidate_email="rahul@example.com",
            profile_id=profile_id,
            token="token-9",
            status="pending",
        ),
        submissions=(
            [
                SubmissionWithEvaluation(
                    id=184,
                    invite_id=9,
                    question_id=101,
                    code="solution",
                    language="python",
                    status="submitted",
                    stdout="ok",
                    stderr=None,
                    execution_time_ms=4,
                    evaluation=evaluation,
                )
            ]
            if evaluation is not None
            else []
        ),
    )


class EvidenceBuilderTests(unittest.TestCase):
    def test_resume_fields_and_provenance_are_preserved(self) -> None:
        resume = {
            "skills": ["Python", "FastAPI"],
            "experience": [{"claim": "Backend development", "value": "3 years"}],
            "projects": [{"title": "Hiring API", "description": "Built APIs"}],
        }
        evidence = build_resume_evidence(
            "cand_014", resume, document_id="resume_014", default_confidence=None
        )
        self.assertEqual(len(evidence), 4)
        self.assertEqual(evidence[0].source, EvidenceSource.RESUME)
        self.assertEqual(evidence[0].provenance.document, "resume_014")
        self.assertEqual(evidence[0].provenance.location, "skills[0]")
        self.assertIsNone(evidence[0].confidence)

    def test_resume_ids_are_stable_and_missing_fields_are_not_invented(self) -> None:
        resume = {"skills": ["Python"]}
        first = build_resume_evidence("cand_014", resume, "resume_014")
        second = build_resume_evidence("cand_014", resume, "resume_014")
        self.assertEqual([item.evidence_id for item in first], [item.evidence_id for item in second])
        self.assertEqual(len(first), 1)
        self.assertEqual(first[0].provenance.location, "skills")

    def test_ranking_builder_preserves_all_scores_and_skills(self) -> None:
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
        converted = build_ranking_evidence(ranking, job_id="job_003")
        self.assertEqual(converted.final_score, 91.4)
        self.assertEqual(converted.semantic_score, 93.0)
        self.assertEqual(converted.keyword_score, 88.0)
        self.assertEqual(converted.matched_skills, ranking.matched_skills)
        self.assertEqual(converted.missing_skills, ["Docker"])
        self.assertEqual(converted.evidence[0].provenance.job_id, "job_003")

    def test_assessment_builder_preserves_scores_details_and_provenance(self) -> None:
        evaluation = AIEvaluation(
            id=77,
            submission_id=184,
            correctness_score=90,
            efficiency_score=85,
            code_quality_score=88,
            overall_score=91,
            is_correct=True,
            time_complexity="O(n)",
            space_complexity="O(1)",
            detected_issues=["None"],
            strengths=["Clear implementation"],
            improvements=["Add tests"],
            explanation="Strong Python backend implementation.",
        )
        evidence = build_assessment_evidence(assessment_result(evaluation=evaluation), "cand_014")
        self.assertTrue(evidence)
        overall = next(item for item in evidence if item.claim == "Overall technical assessment")
        self.assertEqual(overall.score, 91)
        self.assertEqual(overall.provenance.assessment_id, "22")
        self.assertEqual(overall.provenance.invite_id, "9")
        self.assertEqual(overall.provenance.submission_id, "184")
        self.assertEqual(overall.provenance.evaluation_id, "77")
        self.assertTrue(any(item.claim == "Time complexity" for item in evidence))
        self.assertTrue(any(item.claim == "Strengths" for item in evidence))

    def test_incomplete_assessment_is_represented_without_fake_scores(self) -> None:
        result = assessment_result()
        result = result.model_copy(
            update={
                "submissions": [
                    SubmissionWithEvaluation(
                        id=184,
                        invite_id=9,
                        question_id=101,
                        code="solution",
                        language="python",
                        status="submitted",
                        evaluation=None,
                    )
                ]
            }
        )
        evidence = build_assessment_evidence(result, "cand_014")
        self.assertEqual(len(evidence), 1)
        self.assertIsNone(evidence[0].score)
        self.assertEqual(evidence[0].claim, "Assessment submission")

    def test_aggregation_keeps_sources_separate_and_ids_unique(self) -> None:
        ranking = RankingEvidence(
            candidate_id="cand_014",
            candidate_name="Rahul",
            rank=1,
            final_score=91,
            semantic_score=92,
            keyword_score=90,
        )
        candidate = build_candidate_evidence(
            "cand_014",
            "Rahul",
            resume={"skills": ["Python"]},
            ranking=ranking,
            assessment=assessment_result(
                evaluation=AIEvaluation(
                    overall_score=91,
                    explanation="Python backend implementation",
                )
            ),
            document_id="resume_014",
        )
        self.assertEqual(len(candidate.resume_evidence), 1)
        self.assertIsNotNone(candidate.ranking_evidence)
        self.assertTrue(candidate.assessment_evidence)
        self.assertEqual(
            len(candidate.evidence_references),
            len(set(candidate.evidence_references)),
        )

    def test_supported_comparison(self) -> None:
        candidate = CandidateEvidence(
            candidate_id="cand_014",
            candidate_name="Rahul",
            resume_evidence=[
                EvidenceItem(
                    evidence_id="ev_resume_001",
                    source=EvidenceSource.RESUME,
                    category="skill",
                    claim="Python backend",
                    value="Python backend development",
                    provenance=EvidenceReference(
                        candidate_id="cand_014", document="resume_014"
                    ),
                )
            ],
            assessment_evidence=[
                EvidenceItem(
                    evidence_id="ev_assessment_001",
                    source=EvidenceSource.CODING_ASSESSMENT,
                    category="technical_performance",
                    claim="Python backend implementation",
                    value="Strong implementation completed successfully",
                    score=91,
                    provenance=EvidenceReference(
                        candidate_id="cand_014", assessment_id="22"
                    ),
                )
            ],
        )
        result = compare_resume_vs_assessment(candidate)[0]
        self.assertEqual(result.status, ComparisonStatus.SUPPORTED)
        self.assertEqual(result.assessment_evidence_ids, ["ev_assessment_001"])

    def test_missing_topic_is_insufficient_and_no_assessment_is_unavailable(self) -> None:
        resume_item = EvidenceItem(
            evidence_id="ev_resume_docker",
            source=EvidenceSource.RESUME,
            category="skill",
            claim="Docker expertise",
            value="Docker",
            provenance=EvidenceReference(candidate_id="cand_014"),
        )
        candidate = CandidateEvidence(
            candidate_id="cand_014",
            candidate_name="Rahul",
            resume_evidence=[resume_item],
            assessment_evidence=[
                EvidenceItem(
                    evidence_id="ev_assessment_python",
                    source=EvidenceSource.CODING_ASSESSMENT,
                    category="technical_performance",
                    claim="Python implementation",
                    value="Completed successfully",
                    score=91,
                    provenance=EvidenceReference(candidate_id="cand_014"),
                )
            ],
        )
        self.assertEqual(
            compare_resume_vs_assessment(candidate)[0].status,
            ComparisonStatus.INSUFFICIENT_EVIDENCE,
        )
        candidate = candidate.model_copy(update={"assessment_evidence": []})
        self.assertEqual(
            compare_resume_vs_assessment(candidate)[0].status,
            ComparisonStatus.UNAVAILABLE,
        )

    def test_weak_relevant_evidence_is_partial(self) -> None:
        candidate = CandidateEvidence(
            candidate_id="cand_014",
            candidate_name="Rahul",
            resume_evidence=[
                EvidenceItem(
                    evidence_id="ev_resume_algo",
                    source=EvidenceSource.RESUME,
                    category="claim",
                    claim="algorithm optimization",
                    value="Expert algorithm optimization",
                    provenance=EvidenceReference(candidate_id="cand_014"),
                )
            ],
            assessment_evidence=[
                EvidenceItem(
                    evidence_id="ev_assessment_algo",
                    source=EvidenceSource.CODING_ASSESSMENT,
                    category="score",
                    claim="Algorithm optimization efficiency",
                    value="Performance issues",
                    score=45,
                    provenance=EvidenceReference(candidate_id="cand_014"),
                )
            ],
        )
        self.assertEqual(
            compare_resume_vs_assessment(candidate)[0].status,
            ComparisonStatus.PARTIALLY_SUPPORTED,
        )

    def test_cross_candidate_assessment_is_rejected(self) -> None:
        candidate = CandidateEvidence(
            candidate_id="cand_014",
            candidate_name="Rahul",
            resume_evidence=[],
            assessment_evidence=[
                EvidenceItem(
                    evidence_id="ev_wrong_candidate",
                    source=EvidenceSource.CODING_ASSESSMENT,
                    category="technical_performance",
                    claim="Python backend",
                    value="Strong",
                    provenance=EvidenceReference(candidate_id="cand_021"),
                )
            ],
        )
        with self.assertRaises(ValueError):
            compare_resume_vs_assessment(candidate)

    def test_comparison_evidence_has_related_ids_and_source(self) -> None:
        candidate = CandidateEvidence(
            candidate_id="cand_014",
            candidate_name="Rahul",
            resume_evidence=[
                EvidenceItem(
                    evidence_id="ev_resume_001",
                    source=EvidenceSource.RESUME,
                    category="skill",
                    claim="Python",
                    value="Python",
                    provenance=EvidenceReference(candidate_id="cand_014"),
                )
            ],
            assessment_evidence=[
                EvidenceItem(
                    evidence_id="ev_assessment_001",
                    source=EvidenceSource.CODING_ASSESSMENT,
                    category="technical_performance",
                    claim="Python implementation",
                    value="Completed",
                    score=90,
                    provenance=EvidenceReference(candidate_id="cand_014"),
                )
            ],
        )
        evidence = build_comparison_evidence(candidate)
        self.assertEqual(evidence[0].source, EvidenceSource.COMPARISON)
        self.assertEqual(
            evidence[0].provenance.related_evidence_ids,
            ["ev_resume_001", "ev_assessment_001"],
        )


if __name__ == "__main__":
    unittest.main()