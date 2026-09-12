"""Typed CodeAssess API client backed by the existing FastAPI routes."""

from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

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
    SubmissionWithEvaluation,
)
from .errors import MalformedResponseError
from .http import CodeAssessHttpClient

ModelT = TypeVar("ModelT", bound=BaseModel)


class CodeAssessApiClient:
    """Implementation of the Phase 1 CodeAssess client protocol."""

    def __init__(self, http: CodeAssessHttpClient) -> None:
        self._http = http

    def create_assessment(
        self, request: AssessmentCreateRequest
    ) -> AssessmentResponse:
        payload = self._http.post("/tests", request.model_dump())
        return self._parse(AssessmentResponse, payload)

    def get_assessment(self, assessment_id: int) -> AssessmentResponse:
        payload = self._http.get(f"/tests/{assessment_id}")
        return self._parse(AssessmentResponse, payload)

    def add_question(
        self, assessment_id: int, request: QuestionCreateRequest
    ) -> QuestionResponse:
        payload = self._http.post(
            f"/tests/{assessment_id}/questions", request.model_dump()
        )
        return self._parse(QuestionResponse, payload)

    def get_questions(self, assessment_id: int) -> list[QuestionResponse]:
        payload = self._http.get(f"/tests/{assessment_id}/questions")
        return self._parse_list(QuestionResponse, payload)

    def create_invite(
        self, assessment_id: int, request: InviteCreateRequest
    ) -> InviteResponse:
        payload = self._http.post(
            f"/tests/{assessment_id}/invites", request.model_dump()
        )
        return self._parse(InviteResponse, payload)

    def resolve_invite(self, token: str) -> InviteResponse:
        payload = self._http.get(f"/tests/invites/{token}")
        return self._parse(InviteResponse, payload)

    def list_invites(self) -> list[InviteResponse]:
        payload = self._http.get("/tests/invites")
        return self._parse_list(InviteResponse, payload)

    def get_submissions(self) -> list[SubmissionWithEvaluation]:
        payload = self._http.get("/submissions")
        return self._parse_list(SubmissionWithEvaluation, payload)

    def get_submission_report(self, submission_id: int) -> str:
        return self._http.get_text(f"/submissions/{submission_id}/report")

    def evaluate_submission(self, submission_id: int) -> AIEvaluation:
        payload = self._http.post(f"/submissions/{submission_id}/evaluate", {})
        return self._parse(AIEvaluation, payload)

    @staticmethod
    def _parse(model: type[ModelT], payload: Any) -> ModelT:
        try:
            return model.model_validate(payload)
        except (ValidationError, TypeError, ValueError) as exc:
            raise MalformedResponseError(
                f"CodeAssess response did not match {model.__name__}"
            ) from exc

    @staticmethod
    def _parse_list(model: type[ModelT], payload: Any) -> list[ModelT]:
        if not isinstance(payload, list):
            raise MalformedResponseError(
                f"CodeAssess response for {model.__name__} list was not an array"
            )
        return [CodeAssessApiClient._parse(model, item) for item in payload]