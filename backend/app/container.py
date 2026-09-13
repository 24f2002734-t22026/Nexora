"""Application dependency container."""

from dataclasses import dataclass

from .config import Settings
from .db import Database
from .providers.fixture import SQLiteNexoraProvider, seed_fixture_database
from .services.codeassess import CodeAssessIntegration, build_integration
from .services.email import LoggingEmailService, build_email_service
from .services.pipeline import PipelineService


@dataclass
class Container:
    database: Database
    provider: SQLiteNexoraProvider
    codeassess: CodeAssessIntegration
    email: LoggingEmailService
    pipeline: PipelineService


def build_container(settings: Settings) -> Container:
    database = Database(settings.database_path)
    database.initialize()
    seed_fixture_database(database)
    provider = SQLiteNexoraProvider(database)
    codeassess = build_integration(
        settings.codeassess_mode,
        settings.codeassess_api_url,
        settings.codeassess_frontend_url,
    )
    email = build_email_service(settings.email_mode)
    return Container(
        database=database,
        provider=provider,
        codeassess=codeassess,
        email=email,
        pipeline=PipelineService(
            database=database,
            provider=provider,
            codeassess=codeassess,
            email=email,
            assessment_title=settings.assessment_title,
            interviewer_id=settings.interviewer_id,
        ),
    )
