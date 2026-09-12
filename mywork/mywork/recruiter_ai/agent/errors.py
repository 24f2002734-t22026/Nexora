"""Internal orchestration failures that become clarification responses."""


class EntityResolutionError(Exception):
    """Base entity resolution failure."""


class UnknownCandidate(EntityResolutionError):
    """No known candidate matched the requested entity."""


class AmbiguousCandidate(EntityResolutionError):
    """A candidate name matched more than one candidate ID."""


class MissingEntity(EntityResolutionError):
    """A supported intent needs an entity that was not supplied."""