"""Provider-specific protocol for a future CodeAssess HTTP client."""

from typing import Protocol

from ..schemas.requests import (
    AssessmentCreateRequest,
    InviteCreateRequest,
    QuestionCreateRequest,
)
from ..schemas.responses import (
    AIEvaluation,
    AssessmentResponse,
    InviteResponse,
    QuestionResponse,
    SubmissionResponse,
    SubmissionWithEvaluation,
)


class CodeAssessClient(Protocol):
    """Operations needed by Nexora; implementations may use any transport."""

    def create_assessment(
        self, request: AssessmentCreateRequest
    ) -> AssessmentResponse: ...

    def get_assessment(self, assessment_id: int) -> AssessmentResponse: ...

    def add_question(
        self, assessment_id: int, request: QuestionCreateRequest
    ) -> QuestionResponse: ...

    def get_questions(self, assessment_id: int) -> list[QuestionResponse]: ...

    def create_invite(
        self, assessment_id: int, request: InviteCreateRequest
    ) -> InviteResponse: ...

    def resolve_invite(self, token: str) -> InviteResponse: ...

    def list_invites(self) -> list[InviteResponse]: ...

    def get_submissions(self) -> list[SubmissionWithEvaluation]: ...

    def get_submission_report(self, submission_id: int) -> str: ...

    def evaluate_submission(self, submission_id: int) -> AIEvaluation: ...