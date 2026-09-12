import unittest

from mywork.coding_assessment.client.errors import (
    AdapterValidationError,
    AmbiguousResultError,
)
from mywork.coding_assessment.schemas import (
    AIEvaluation,
    AssessmentCreateRequest,
    AssessmentResponse,
    InviteCreateRequest,
    InviteResponse,
    QuestionResponse,
    SubmissionWithEvaluation,
)
from mywork.coding_assessment.services import AssessmentService


class FakeCodeAssessClient:
    def __init__(self) -> None:
        self.invites: list[InviteResponse] = []
        self.submissions: list[SubmissionWithEvaluation] = []
        self.create_invite_calls: list[tuple[int, InviteCreateRequest]] = []

    def create_assessment(self, request: AssessmentCreateRequest) -> AssessmentResponse:
        return AssessmentResponse(
            id=22,
            title=request.title,
            description=request.description,
            interviewer_id=request.interviewer_id,
        )

    def get_assessment(self, assessment_id: int) -> AssessmentResponse:
        return AssessmentResponse(
            id=assessment_id,
            title="Backend Assessment",
            description=None,
            interviewer_id=1,
        )

    def add_question(self, assessment_id: int, request: object) -> object:
        raise NotImplementedError

    def get_questions(self, assessment_id: int) -> list[QuestionResponse]:
        return [
            QuestionResponse(
                id=101,
                test_id=assessment_id,
                question_text="Implement an API",
                language="python",
            )
        ]

    def create_invite(
        self, assessment_id: int, request: InviteCreateRequest
    ) -> InviteResponse:
        self.create_invite_calls.append((assessment_id, request))
        return InviteResponse(
            id=9,
            test_id=assessment_id,
            candidate_name=request.candidate_name,
            candidate_email=request.candidate_email,
            profile_id=request.profile_id,
            scheduled_at=request.scheduled_at,
            token="token-9",
            status="pending",
        )

    def resolve_invite(self, token: str) -> InviteResponse:
        raise NotImplementedError

    def list_invites(self) -> list[InviteResponse]:
        return self.invites

    def get_submissions(self) -> list[SubmissionWithEvaluation]:
        return self.submissions

    def get_submission_report(self, submission_id: int) -> str:
        raise NotImplementedError

    def evaluate_submission(self, submission_id: int) -> AIEvaluation:
        raise NotImplementedError


def make_invite(
    invite_id: int = 9,
    profile_id: str | None = "cand_014",
    test_id: int = 22,
) -> InviteResponse:
    return InviteResponse(
        id=invite_id,
        test_id=test_id,
        candidate_name="Rahul",
        candidate_email="rahul@example.com",
        profile_id=profile_id,
        token=f"token-{invite_id}",
        status="pending",
    )


def make_submission(
    submission_id: int,
    invite_id: int,
    evaluation: AIEvaluation | None,
    question_id: int = 101,
) -> SubmissionWithEvaluation:
    return SubmissionWithEvaluation(
        id=submission_id,
        invite_id=invite_id,
        question_id=question_id,
        code="return 1",
        language="python",
        status="submitted",
        stdout="1",
        stderr=None,
        execution_time_ms=3,
        evaluation=evaluation,
    )


class AssessmentServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = FakeCodeAssessClient()
        self.service = AssessmentService(
            self.client, frontend_url="https://assess.example"
        )

    def test_create_assessment_and_invite_preserve_profile_id(self) -> None:
        assessment = self.service.create_assessment(
            AssessmentCreateRequest(title="Backend", interviewer_id=1)
        )
        invite = self.service.create_candidate_invite(
            candidate_id="cand_014",
            profile_id="cand_014",
            assessment_id=assessment.id,
            candidate_name="Rahul",
            candidate_email="rahul@example.com",
        )
        self.assertEqual(invite.profile_id, "cand_014")
        self.assertEqual(self.client.create_invite_calls[0][1].profile_id, "cand_014")
        self.assertEqual(
            self.service.build_invite_url(invite),
            "https://assess.example/candidate/test/token-9",
        )

    def test_invalid_mapping_does_not_call_provider(self) -> None:
        with self.assertRaises(AdapterValidationError):
            self.service.create_candidate_invite(
                candidate_id="cand_014",
                profile_id="cand_999",
                assessment_id=22,
                candidate_name="Rahul",
                candidate_email="rahul@example.com",
            )
        self.assertEqual(self.client.create_invite_calls, [])

    def test_no_invite_returns_no_assessment(self) -> None:
        result = self.service.get_candidate_assessment_result("cand_014")
        self.assertEqual(result.status, "no_assessment")
        self.assertIsNone(result.invite)

    def test_only_exact_profile_id_is_correlated(self) -> None:
        self.client.invites = [make_invite(profile_id="cand_999")]
        self.client.submissions = [make_submission(1, invite_id=9, evaluation=None)]
        result = self.service.get_candidate_assessment_result("cand_014")
        self.assertEqual(result.status, "no_assessment")
        self.assertEqual(result.submissions, [])

    def test_missing_evaluation_is_pending(self) -> None:
        self.client.invites = [make_invite()]
        self.client.submissions = [make_submission(1, 9, None)]
        result = self.service.get_candidate_assessment_status("cand_014")
        self.assertEqual(result.status, "pending_evaluation")

    def test_completed_evaluation_and_duplicate_submission_are_deterministic(self) -> None:
        self.client.invites = [make_invite()]
        self.client.submissions = [
            make_submission(
                4,
                9,
                AIEvaluation(submission_id=4, overall_score=20),
            ),
            make_submission(
                8,
                9,
                AIEvaluation(submission_id=8, overall_score=90),
            ),
            make_submission(
                3,
                999,
                AIEvaluation(submission_id=3, overall_score=100),
            ),
        ]
        result = self.service.get_candidate_assessment_result("cand_014")
        self.assertEqual(result.status, "evaluation_available")
        self.assertEqual(len(result.submissions), 2)
        self.assertEqual(result.overall_score, 55)

    def test_multiple_invites_are_ambiguous(self) -> None:
        self.client.invites = [make_invite(9), make_invite(10)]
        with self.assertRaises(AmbiguousResultError):
            self.service.get_candidate_assessment_result("cand_014")

    def test_frontend_url_is_optional(self) -> None:
        service = AssessmentService(self.client, frontend_url=None)
        self.assertIsNone(service.build_invite_url(make_invite()))


if __name__ == "__main__":
    unittest.main()