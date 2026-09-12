"""Evidence-aware response providers and deterministic fallbacks."""

import json
import os
from collections.abc import Mapping
from typing import Any, Protocol

import httpx
from pydantic import ValidationError

from ...evidence.schemas.candidate import CandidateEvidence
from ...evidence.schemas.ranking import RankingEvidence
from ...coding_assessment.schemas.responses import AssessmentResult
from ..prompts.recruiter import RECRUITER_SYSTEM_PROMPT
from ..schemas.agent import IntentName, StructuredResponse
from ..schemas.responses import Action
from ..tools.results import (
    AssessmentComparison,
    AssessmentCreated,
    CandidateComparison,
    CandidateInviteCreated,
    CandidateSummary,
    SkillCandidate,
)


class ResponseGenerationError(Exception):
    """The optional response provider could not return valid structured output."""


class ResponseGenerator(Protocol):
    def generate(
        self,
        message: str,
        intent: IntentName,
        tool_data: object,
        evidence: list[object],
    ) -> StructuredResponse: ...


class OpenRouterResponseGenerator:
    """Minimal OpenRouter provider; it never selects or executes tools."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = 30.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self._model = model or os.getenv("OPENROUTER_MODEL", "openrouter/free")
        self._timeout = timeout
        self._transport = transport

    def generate(
        self,
        message: str,
        intent: IntentName,
        tool_data: object,
        evidence: list[object],
    ) -> StructuredResponse:
        if not self._api_key:
            raise ResponseGenerationError("OPENROUTER_API_KEY is not configured")
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": RECRUITER_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "recruiter_message": message,
                            "approved_intent": intent.value,
                            "TOOL_DATA": _serialize(tool_data),
                            "EVIDENCE_DATA": _serialize(evidence),
                        },
                        sort_keys=True,
                        default=str,
                    ),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "nexa_response",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "answer": {"type": "string"},
                            "key_points": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                        "required": ["answer", "key_points"],
                        "additionalProperties": False,
                    },
                },
            },
            "temperature": 0.1,
        }
        try:
            with httpx.Client(timeout=self._timeout, transport=self._transport) as client:
                response = client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                        "X-Title": "Nexora Nexa",
                    },
                    json=payload,
                )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            if isinstance(content, str):
                content = json.loads(content)
            return StructuredResponse.model_validate(content)
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, ValidationError) as exc:
            raise ResponseGenerationError("OpenRouter returned an invalid response") from exc


class DeterministicResponseGenerator:
    """Fallback generator that formats only structured tool facts."""

    def generate(
        self,
        message: str,
        intent: IntentName,
        tool_data: object,
        evidence: list[object],
    ) -> StructuredResponse:
        del message, evidence
        if isinstance(tool_data, CandidateComparison):
            first = tool_data.candidate_a
            second = tool_data.candidate_b
            answer = (
                f"{first.candidate_name} ranks above {second.candidate_name} with a final score of "
                f"{first.final_score:g} versus {second.final_score:g}. "
                f"Semantic scores are {first.semantic_score:g} versus {second.semantic_score:g}; "
                f"keyword scores are {first.keyword_score:g} versus {second.keyword_score:g}."
            )
            return StructuredResponse(answer=answer)
        if isinstance(tool_data, RankingEvidence):
            return StructuredResponse(
                answer=(
                    f"{tool_data.candidate_name} is ranked {tool_data.rank} with a final score of "
                    f"{tool_data.final_score:g}, semantic score {tool_data.semantic_score:g}, "
                    f"and keyword score {tool_data.keyword_score:g}."
                )
            )
        if isinstance(tool_data, CandidateSummary):
            skills = ", ".join(tool_data.key_skills) or "no recorded skills"
            return StructuredResponse(
                answer=f"{tool_data.candidate_name}'s structured summary includes {skills}."
            )
        if isinstance(tool_data, list) and all(isinstance(item, RankingEvidence) for item in tool_data):
            names = ", ".join(item.candidate_name for item in tool_data)
            return StructuredResponse(answer=f"Top candidates by ranking are: {names}.")
        if isinstance(tool_data, list) and all(isinstance(item, SkillCandidate) for item in tool_data):
            names = ", ".join(item.candidate_name for item in tool_data)
            if intent == IntentName.MISSING_SKILL_SEARCH:
                return StructuredResponse(answer=f"The skill is not evidenced for: {names or 'no candidates found'}.")
            return StructuredResponse(answer=f"The skill is evidenced for: {names or 'no candidates found'}.")
        if isinstance(tool_data, CandidateEvidence):
            return StructuredResponse(
                answer=(
                    f"{tool_data.candidate_name} has {len(tool_data.resume_evidence)} resume evidence item(s), "
                    f"{len(tool_data.assessment_evidence)} assessment evidence item(s), and "
                    f"{len(tool_data.comparison_evidence)} comparison item(s)."
                )
            )
        if isinstance(tool_data, AssessmentComparison):
            supported = sum(
                comparison.status.value == "supported"
                for comparison in tool_data.comparisons
            )
            return StructuredResponse(
                answer=(
                    f"The assessment comparison for {tool_data.candidate_id} contains "
                    f"{supported} supported resume claim(s); all conclusions use structured evidence."
                )
            )
        if isinstance(tool_data, AssessmentResult):
            score = f" with an overall score of {tool_data.overall_score:g}" if tool_data.overall_score is not None else ""
            return StructuredResponse(answer=f"Assessment status is {tool_data.status}{score}.")
        if isinstance(tool_data, CandidateInviteCreated):
            return StructuredResponse(answer=f"A coding assessment invite was created for {tool_data.invite.candidate_name}.")
        if isinstance(tool_data, AssessmentCreated):
            return StructuredResponse(answer=f"Assessment {tool_data.assessment.title} was created.")
        return StructuredResponse(answer="The requested structured information is available.")


def _serialize(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, Mapping):
        return {key: _serialize(item) for key, item in value.items()}
    return value