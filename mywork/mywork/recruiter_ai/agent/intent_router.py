"""Small deterministic router for the approved recruiter intents."""

import re

from ..schemas.agent import IntentDecision, IntentName


class IntentRouter:
    """Recognize obvious demo questions without inventing tool names."""

    def route(self, message: str) -> IntentDecision:
        normalized = message.strip().casefold()
        if not normalized:
            return IntentDecision(intent=IntentName.CLARIFICATION_REQUIRED)
        if self._has_any(normalized, "send", "invite", "assign") and "assessment" in normalized:
            return IntentDecision(intent=IntentName.ASSESSMENT_CREATION)
        if "support" in normalized and "resume" in normalized and "assessment" in normalized:
            return IntentDecision(intent=IntentName.RESUME_ASSESSMENT_COMPARISON)
        if (
            "assessment" in normalized
            or ("how did" in normalized and "technically" in normalized)
        ) and self._has_any(
            normalized, "how did", "perform", "result", "technically"
        ):
            return IntentDecision(intent=IntentName.ASSESSMENT_RESULT)
        if "assessment" in normalized and "status" in normalized:
            return IntentDecision(intent=IntentName.ASSESSMENT_STATUS)
        if "missing" in normalized and self._has_any(
            normalized, "skill", "skills", "candidates", "candidate"
        ):
            return IntentDecision(
                intent=IntentName.MISSING_SKILL_SEARCH,
                skill=self._extract_after(normalized, "missing"),
            )
        if self._has_any(normalized, "summarize", "summary", "brief"):
            return IntentDecision(intent=IntentName.CANDIDATE_SUMMARY)
        if "evidence" in normalized and "candidate" in normalized:
            return IntentDecision(intent=IntentName.CANDIDATE_EVIDENCE)
        if self._has_any(normalized, "top candidates", "strongest candidates", "top ranked"):
            return IntentDecision(
                intent=IntentName.TOP_CANDIDATES,
                limit=self._extract_limit(normalized),
            )
        if self._has_any(normalized, "compare", "ranked above", "ranked higher", "between"):
            return IntentDecision(intent=IntentName.CANDIDATE_COMPARISON)
        if "rank" in normalized and self._has_any(normalized, "why", "explain"):
            return IntentDecision(intent=IntentName.RANK_EXPLANATION)
        if self._has_any(normalized, "who has", "strongest", "skill") and self._has_any(
            normalized, "experience", "skill", "skills"
        ):
            return IntentDecision(
                intent=IntentName.SKILL_SEARCH,
                skill=self._extract_skill_phrase(normalized),
            )
        if self._has_any(normalized, "candidate", "applicant"):
            return IntentDecision(intent=IntentName.CLARIFICATION_REQUIRED)
        return IntentDecision(intent=IntentName.UNSUPPORTED)

    @staticmethod
    def _has_any(message: str, *terms: str) -> bool:
        return any(term in message for term in terms)

    @staticmethod
    def _extract_limit(message: str) -> int | None:
        match = re.search(r"\btop\s+(\d+)\b", message)
        return int(match.group(1)) if match else None

    @staticmethod
    def _extract_after(message: str, marker: str) -> str | None:
        match = re.search(
            rf"\b{re.escape(marker)}\s+(?:the\s+)?([a-z0-9+#.\-]+)", message
        )
        return match.group(1) if match else None

    @staticmethod
    def _extract_skill_phrase(message: str) -> str | None:
        for pattern in (
            r"\bstrongest\s+([a-z0-9+#.\-]+)",
            r"\bhas\s+(?:the\s+)?([a-z0-9+#.\-]+)",
            r"\bwith\s+([a-z0-9+#.\-]+)",
        ):
            match = re.search(pattern, message)
            if match and match.group(1) not in {"the", "strongest", "best"}:
                return match.group(1)
        return None