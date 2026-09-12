"""Safe tool-layer failures for future orchestration."""


class ToolError(Exception):
    """Base error exposed by deterministic Nexa tools."""


class InvalidToolArguments(ToolError):
    """Tool arguments failed local validation."""


class CandidateNotFound(ToolError):
    """The data provider has no matching candidate."""


class RankingDataUnavailable(ToolError):
    """Required ranking data is absent or unavailable."""


class AssessmentNotFound(ToolError):
    """Requested assessment data does not exist."""


class AssessmentUnavailable(ToolError):
    """The CodeAssess service or assessment data is unavailable."""


class AmbiguousAssessment(ToolError):
    """More than one assessment could match the requested candidate."""