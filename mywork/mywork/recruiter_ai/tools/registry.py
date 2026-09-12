"""Lightweight discovery registry for the future Nexa orchestrator."""

from dataclasses import dataclass
from typing import Any, Callable

from .service import NexaToolService


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    handler: Callable[..., Any]


def build_tool_registry(tools: NexaToolService) -> dict[str, ToolDefinition]:
    definitions = [
        ("get_rankings", "Return deterministic candidate rankings."),
        ("get_top_candidates", "Return the highest-ranked candidates."),
        ("explain_candidate_rank", "Return structured ranking facts for a candidate."),
        ("compare_candidates", "Compare two ranking records deterministically."),
        ("get_candidate", "Return provider-backed candidate data."),
        ("get_candidate_summary", "Return a structured candidate summary."),
        ("get_candidate_evidence", "Return complete candidate evidence."),
        ("find_candidates_by_skill", "Find candidates with evidenced skills."),
        ("find_candidates_missing_skill", "Find candidates where a skill is not evidenced."),
        ("create_assessment", "Create an assessment through CodeAssess."),
        ("create_candidate_invite", "Create a candidate invite through CodeAssess."),
        ("get_assessment_status", "Return normalized assessment status."),
        ("get_assessment_result", "Return normalized assessment results."),
        ("compare_resume_vs_assessment", "Compare resume and assessment evidence."),
    ]
    return {
        name: ToolDefinition(name, description, getattr(tools, name))
        for name, description in definitions
    }