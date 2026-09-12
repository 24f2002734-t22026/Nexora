"""Typed failures raised by the CodeAssess adapter."""


class CodeAssessError(Exception):
    """Base error that is safe for upper layers to handle."""


class ConfigurationError(CodeAssessError):
    """The adapter is missing or has invalid configuration."""


class AdapterValidationError(CodeAssessError):
    """A request or candidate mapping failed local validation."""


class AuthenticationError(CodeAssessError):
    """CodeAssess rejected credentials or authorization."""


class NotFoundError(CodeAssessError):
    """The requested CodeAssess resource does not exist."""


class UpstreamClientError(CodeAssessError):
    """CodeAssess rejected a request with another 4xx response."""


class UpstreamServerError(CodeAssessError):
    """CodeAssess failed with a 5xx response."""


class AdapterTimeoutError(CodeAssessError):
    """The CodeAssess request exceeded its timeout."""


class AdapterConnectionError(CodeAssessError):
    """The CodeAssess service could not be reached."""


class MalformedResponseError(CodeAssessError):
    """CodeAssess returned invalid JSON or an unexpected payload."""


class AmbiguousResultError(CodeAssessError):
    """More than one invite could represent the requested candidate result."""