import unittest

from mywork.coding_assessment.schemas import AssessmentCreateRequest
from mywork.recruiter_ai.tools import (
    AssessmentNotFound,
    CandidateNotFound,
    InvalidToolArguments,
    NexaToolService,
    build_tool_registry,
)
from mywork.recruiter_ai.tools.results import (
    AssessmentComparison,
    CandidateComparison,
    CandidateInviteCreated,
    CandidateSummary,
    SkillCandidate,
)
from mywork.tests.fixtures.nexa_data import (
    FixtureCodeAssessClient,
    FixtureDataProvider,
    build_fixture_tools,
)


class ToolTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tools, self.provider = build_fixture_tools()

    def test_rankings_and_top_candidates(self) -> None:
        rankings = self.tools.get_rankings()
        self.assertEqual(len(rankings.data), 3)
        top = self.tools.get_top_candidates(2)
        self.assertEqual([item.candidate_id for item in top.data], ["cand_014", "cand_021"])
        self.assertTrue(top.evidence)

    def test_top_candidate_limit_is_validated(self) -> None:
        with self.assertRaises(InvalidToolArguments):
            self.tools.get_top_candidates(0)
        with self.assertRaises(InvalidToolArguments):
            self.tools.get_top_candidates(51)

    def test_rank_explanation_and_candidate_comparison_are_structured(self) -> None:
        explanation = self.tools.explain_candidate_rank("cand_014")
        self.assertEqual(explanation.data.final_score, 91.4)
        self.assertEqual(explanation.data.semantic_score, 93)
        self.assertEqual(explanation.data.keyword_score, 88)
        comparison = self.tools.compare_candidates("cand_014", "cand_021")
        self.assertIsInstance(comparison.data, CandidateComparison)
        self.assertAlmostEqual(comparison.data.final_score_difference, 4.3)
        self.assertEqual(comparison.data.higher_final_score_candidate_id, "cand_014")

    def test_candidate_and_summary(self) -> None:
        candidate = self.tools.get_candidate("cand_014")
        self.assertEqual(candidate.data.candidate_name, "Rahul")
        summary = self.tools.get_candidate_summary("cand_014")
        self.assertIsInstance(summary.data, CandidateSummary)
        self.assertEqual(summary.data.assessment_status, "evaluation_available")
        self.assertIn("React", summary.data.key_skills)

    def test_skill_tools_use_structured_evidence(self) -> None:
        react = self.tools.find_candidates_by_skill("React")
        self.assertEqual([item.candidate_id for item in react.data], ["cand_014", "cand_021"])
        self.assertTrue(all(isinstance(item, SkillCandidate) for item in react.data))
        self.assertTrue(all(item.evidence_ids for item in react.data))
        missing = self.tools.find_candidates_missing_skill("Docker")
        self.assertEqual(len(missing.data), 3)
        self.assertTrue(all(item.state == "skill_not_evidenced" for item in missing.data))

    def test_candidate_evidence_keeps_sources_separate(self) -> None:
        result = self.tools.get_candidate_evidence("cand_014")
        self.assertEqual(result.data.candidate_id, "cand_014")
        self.assertTrue(result.data.resume_evidence)
        self.assertTrue(result.data.ranking_evidence.evidence)
        self.assertTrue(result.data.assessment_evidence)
        self.assertTrue(result.data.comparison_evidence)
        self.assertTrue(all(item.provenance.profile_id in (None, "cand_014") for item in result.evidence))

    def test_assessment_tools_and_comparison(self) -> None:
        status = self.tools.get_assessment_status("cand_014")
        self.assertEqual(status.data.status, "evaluation_available")
        assessment = self.tools.get_assessment_result("cand_014")
        self.assertEqual(assessment.data.profile_id, "cand_014")
        self.assertEqual(assessment.data.submissions[0].evaluation.id, 77)
        comparison = self.tools.compare_resume_vs_assessment("cand_014")
        self.assertIsInstance(comparison.data, AssessmentComparison)
        self.assertTrue(comparison.data.comparisons)
        self.assertTrue(any(item.assessment_evidence_ids for item in comparison.data.comparisons))

    def test_no_assessment_is_typed(self) -> None:
        class NoInviteClient(FixtureCodeAssessClient):
            def list_invites(self):
                return []

        service = __import__(
            "mywork.coding_assessment.services", fromlist=["AssessmentService"]
        ).AssessmentService(NoInviteClient())
        tools = NexaToolService(FixtureDataProvider(), service)
        self.assertEqual(tools.get_assessment_status("cand_014").data.status, "no_assessment")
        with self.assertRaises(AssessmentNotFound):
            tools.get_assessment_result("cand_014")

    def test_invite_validates_candidate_before_provider_call(self) -> None:
        client = FixtureCodeAssessClient()
        from mywork.coding_assessment.services import AssessmentService

        tools = NexaToolService(
            FixtureDataProvider(), AssessmentService(client, frontend_url="https://assess.example")
        )
        with self.assertRaises(CandidateNotFound):
            tools.create_candidate_invite("missing", 22)
        self.assertEqual(client.invite_calls, [])
        created = tools.create_candidate_invite("cand_014", 22)
        self.assertIsInstance(created.action_result, CandidateInviteCreated)
        self.assertEqual(created.affected_candidate_id, "cand_014")
        self.assertEqual(created.action_result.invite_url, "https://assess.example/candidate/test/rahul-token")

    def test_create_assessment_returns_mutation_result(self) -> None:
        created = self.tools.create_assessment(
            AssessmentCreateRequest(title="New test", interviewer_id=1)
        )
        self.assertEqual(created.action_result.assessment.id, 22)
        self.assertEqual(created.idempotency_key, "assessment:22")

    def test_candidate_identity_is_enforced(self) -> None:
        other = self.tools.get_candidate_evidence("cand_021")
        self.assertEqual(other.data.candidate_id, "cand_021")
        self.assertEqual(other.data.assessment_evidence, [])
        self.assertTrue(
            all(
                item.provenance.profile_id in (None, "cand_021")
                for item in other.evidence
            )
        )
        self.assertEqual(self.tools.get_candidate_evidence("cand_014").data.candidate_id, "cand_014")

    def test_registry_contains_all_tools(self) -> None:
        registry = build_tool_registry(self.tools)
        self.assertEqual(len(registry), 14)
        self.assertEqual(registry["get_rankings"].handler.__self__, self.tools)
        self.assertEqual(registry["get_rankings"].handler.__func__, NexaToolService.get_rankings)


if __name__ == "__main__":
    unittest.main()