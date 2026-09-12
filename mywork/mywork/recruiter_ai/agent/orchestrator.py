"""Controlled recruiter-message orchestration for Nexa."""

from dataclasses import dataclass

from ...coding_assessment.schemas.requests import AssessmentCreateRequest
from ...evidence.schemas.sources import EvidenceItem
from ..provider import NexoraDataProvider
from ..schemas.agent import IntentDecision, IntentName, StructuredResponse
from ..schemas.requests import ChatRequest
from ..schemas.responses import Action, ChatResponse, ResponseEvidence, Warning
from ..tools.errors import ToolError
from ..tools.interfaces import MutationToolResult, ReadToolResult
from ..tools.results import CandidateInviteCreated
from ..tools.service import NexaToolService
from .entity_resolver import EntityResolver
from .errors import AmbiguousCandidate, EntityResolutionError, MissingEntity, UnknownCandidate
from .intent_router import IntentRouter
from .response_generator import (
    DeterministicResponseGenerator,
    ResponseGenerationError,
    ResponseGenerator,
)


@dataclass
class ToolExecution:
    data: object
    evidence: list[EvidenceItem]
    actions: list[Action]
    warnings: list[Warning]


class RecruiterAIOrchestrator:
    """Run one bounded request through intent, entities, tools, and response."""

    def __init__(
        self,
        provider: NexoraDataProvider,
        tools: NexaToolService,
        response_generator: ResponseGenerator | None = None,
        interviewer_id: int = 1,
        assessment_title: str = "Technical Coding Assessment",
    ) -> None:
        self._provider = provider
        self._tools = tools
        self._router = IntentRouter()
        self._resolver = EntityResolver(provider)
        self._response_generator = response_generator
        self._fallback = DeterministicResponseGenerator()
        self._interviewer_id = interviewer_id
        self._assessment_title = assessment_title

    def handle(self, request: ChatRequest) -> ChatResponse:
        decision = self._router.route(request.message)
        if decision.intent == IntentName.UNSUPPORTED:
            return self._simple_response(
                request,
                decision,
                "I can help with rankings, candidates, skills, and coding assessments.",
                "unsupported",
            )
        if decision.intent == IntentName.CLARIFICATION_REQUIRED:
            return self._simple_response(
                request,
                decision,
                "Please specify the candidate or supported recruiter question you want to investigate.",
                "clarification_required",
            )
        try:
            candidate_ids = self._resolver.resolve_candidates(
                decision, request.message, request.candidate_ids
            )
            execution = self._execute(decision, candidate_ids, request)
        except EntityResolutionError as exc:
            return self._clarification(request, decision, str(exc))
        except ToolError as exc:
            return self._tool_failure(request, decision, str(exc))

        return self._generate_response(request, decision, execution)

    def _execute(
        self,
        decision: IntentDecision,
        candidate_ids: list[str],
        request: ChatRequest,
    ) -> ToolExecution:
        intent = decision.intent
        if intent == IntentName.TOP_CANDIDATES:
            result = self._tools.get_top_candidates(decision.limit or 3)
            return self._read_execution(result)
        if intent == IntentName.RANK_EXPLANATION:
            self._resolver.require_count(candidate_ids, 1)
            return self._read_execution(self._tools.explain_candidate_rank(candidate_ids[0]))
        if intent == IntentName.CANDIDATE_COMPARISON:
            self._resolver.require_count(candidate_ids, 2)
            return self._read_execution(
                self._tools.compare_candidates(candidate_ids[0], candidate_ids[1])
            )
        if intent == IntentName.SKILL_SEARCH:
            return self._read_execution(
                self._tools.find_candidates_by_skill(
                    self._resolver.resolve_skill(decision, request.message)
                )
            )
        if intent == IntentName.MISSING_SKILL_SEARCH:
            return self._read_execution(
                self._tools.find_candidates_missing_skill(
                    self._resolver.resolve_skill(decision, request.message)
                )
            )
        if intent == IntentName.CANDIDATE_SUMMARY:
            self._resolver.require_count(candidate_ids, 1)
            return self._read_execution(self._tools.get_candidate_summary(candidate_ids[0]))
        if intent == IntentName.CANDIDATE_EVIDENCE:
            self._resolver.require_count(candidate_ids, 1)
            return self._read_execution(self._tools.get_candidate_evidence(candidate_ids[0]))
        if intent == IntentName.ASSESSMENT_STATUS:
            self._resolver.require_count(candidate_ids, 1)
            return self._read_execution(self._tools.get_assessment_status(candidate_ids[0]))
        if intent == IntentName.ASSESSMENT_RESULT:
            self._resolver.require_count(candidate_ids, 1)
            return self._read_execution(self._tools.get_assessment_result(candidate_ids[0]))
        if intent == IntentName.RESUME_ASSESSMENT_COMPARISON:
            self._resolver.require_count(candidate_ids, 1)
            return self._read_execution(
                self._tools.compare_resume_vs_assessment(candidate_ids[0])
            )
        if intent == IntentName.ASSESSMENT_CREATION:
            self._resolver.require_count(candidate_ids, 1)
            return self._create_assessment_action(candidate_ids[0])
        raise ToolError("This intent has no approved tool mapping")

    def _create_assessment_action(self, candidate_id: str) -> ToolExecution:
        assessment_result = self._tools.create_assessment(
            AssessmentCreateRequest(
                title=self._assessment_title,
                interviewer_id=self._interviewer_id,
            )
        )
        assessment = assessment_result.action_result.assessment
        try:
            invite_result = self._tools.create_candidate_invite(candidate_id, assessment.id)
        except ToolError as exc:
            return ToolExecution(
                data=assessment_result.action_result,
                evidence=assessment_result.evidence,
                actions=[
                    Action(
                        type="assessment_invite_failed",
                        label="Assessment invite was not created",
                        payload={"assessment_id": assessment.id},
                    )
                ],
                warnings=[
                    Warning(
                        code="assessment_invite_failed",
                        message=f"Assessment was created, but the invite was not created: {exc}",
                    )
                ],
            )
        invite = invite_result.action_result
        if not isinstance(invite, CandidateInviteCreated):
            raise ToolError("Assessment invite result was malformed")
        action = Action(
            type="assessment_invite_created",
            label="Open assessment invite",
            payload={
                "candidate_id": invite.candidate_id,
                "assessment_id": invite.assessment_id,
                "invite_url": invite.invite_url,
            },
        )
        return ToolExecution(
            data=invite,
            evidence=[*assessment_result.evidence, *invite_result.evidence],
            actions=[action],
            warnings=[],
        )

    def _generate_response(
        self,
        request: ChatRequest,
        decision: IntentDecision,
        execution: ToolExecution,
    ) -> ChatResponse:
        generator = self._response_generator or self._fallback
        try:
            generated = generator.generate(
                request.message,
                decision.intent,
                execution.data,
                execution.evidence,
            )
        except Exception as exc:
            try:
                generated = self._fallback.generate(
                    request.message,
                    decision.intent,
                    execution.data,
                    execution.evidence,
                )
            except Exception:
                generated = StructuredResponse(
                    answer="The requested information is available in the structured evidence."
                )
            execution.warnings.append(
                Warning(
                    code="response_generation_failed",
                    message="The response model was unavailable; a grounded fallback was used.",
                )
            )
        return ChatResponse(
            answer=generated.answer,
            intent=decision.intent.value,
            evidence=_response_evidence(execution.evidence),
            actions=execution.actions,
            warnings=execution.warnings,
        )

    @staticmethod
    def _read_execution(result: ReadToolResult) -> ToolExecution:
        return ToolExecution(
            data=result.data,
            evidence=result.evidence,
            actions=[],
            warnings=[Warning(code="tool_warning", message=warning) for warning in result.warnings],
        )

    def _tool_failure(
        self, request: ChatRequest, decision: IntentDecision, message: str
    ) -> ChatResponse:
        del request
        return ChatResponse(
            answer="The requested information is currently unavailable.",
            intent=decision.intent.value,
            warnings=[Warning(code="tool_unavailable", message=message)],
        )

    @staticmethod
    def _clarification(
        request: ChatRequest, decision: IntentDecision, message: str
    ) -> ChatResponse:
        del request
        return ChatResponse(
            answer="I need a little more detail before I can check the evidence.",
            intent=IntentName.CLARIFICATION_REQUIRED.value,
            warnings=[Warning(code="clarification_required", message=message)],
        )

    @staticmethod
    def _simple_response(
        request: ChatRequest,
        decision: IntentDecision,
        answer: str,
        warning_code: str,
    ) -> ChatResponse:
        del request
        return ChatResponse(
            answer=answer,
            intent=decision.intent.value,
            warnings=[Warning(code=warning_code, message=answer)],
        )


def _response_evidence(items: list[EvidenceItem]) -> list[ResponseEvidence]:
    result: list[ResponseEvidence] = []
    seen: set[str] = set()
    for item in items:
        if item.evidence_id in seen:
            continue
        seen.add(item.evidence_id)
        result.append(
            ResponseEvidence(
                evidence_id=item.evidence_id,
                source=item.source,
                summary=f"{item.claim}: {item.value}",
                candidate_id=item.provenance.candidate_id,
                confidence=item.confidence,
            )
        )
    return result