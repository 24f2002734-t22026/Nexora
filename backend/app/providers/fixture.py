"""SQLite-backed Nexora provider seeded from the existing ranking fixture."""

from typing import Any

from mywork.evidence.schemas.ranking import RankingEvidence
from mywork.recruiter_ai.provider import CandidateRecord, NexoraDataProvider
from mywork.tests.fixtures.nexa_data import FixtureDataProvider

from ..db import Database


class SQLiteNexoraProvider(NexoraDataProvider):
    def __init__(self, database: Database) -> None:
        self.database = database
        self.fixture = FixtureDataProvider()

    def get_rankings(self) -> list[RankingEvidence]:
        db_rankings = self.database.list_rankings()
        if db_rankings:
            return db_rankings
        return self.fixture.get_rankings()

    def get_candidate(self, candidate_id: str) -> CandidateRecord | None:
        state = self.database.get_candidate(candidate_id)
        if state is None:
            return None
        db_resume = self.database.get_candidate_resume_data(candidate_id)
        if db_resume is not None:
            resume_data = db_resume
        else:
            resume_data = _resume_data(self.fixture, state.candidate_id, state.email)
        return CandidateRecord(
            candidate_id=state.candidate_id,
            candidate_name=state.name,
            resume_data=resume_data,
            document_id=state.resume_ref,
        )

    def get_candidates(self) -> list[CandidateRecord]:
        return [
            candidate
            for state in self.database.list_candidates()
            if (candidate := self.get_candidate(state.candidate_id)) is not None
        ]

    def get_candidate_resume_data(self, candidate_id: str) -> dict[str, object]:
        candidate = self.get_candidate(candidate_id)
        return candidate.resume_data if candidate else {}

    def get_candidate_ranking(self, candidate_id: str) -> RankingEvidence | None:
        db_ranking = self.database.get_ranking(candidate_id)
        if db_ranking is not None:
            return db_ranking
        return self.fixture.get_candidate_ranking(candidate_id)

    def find_candidates_by_skill(self, skill: str) -> list[CandidateRecord]:
        normalized = skill.casefold()
        return [
            candidate
            for candidate in self.get_candidates()
            if any(
                isinstance(value, str) and normalized in value.casefold()
                for value in candidate.resume_data.get("skills", [])
            )
        ]

    def find_candidates_missing_skill(self, skill: str) -> list[CandidateRecord]:
        normalized = skill.casefold()
        return [
            candidate
            for candidate in self.get_candidates()
            if any(
                normalized == missing.casefold()
                for ranking in self.get_rankings()
                if ranking.candidate_id == candidate.candidate_id
                for missing in ranking.missing_skills
            )
        ]


def seed_fixture_database(database: Database) -> None:
    fixture = FixtureDataProvider()
    database.seed_analysis("analysis_demo", "Senior Full Stack Engineer", "2026-09-12T00:00:00Z")
    for candidate in fixture.candidates:
        database.seed_candidate(
            candidate.candidate_id,
            "analysis_demo",
            candidate.candidate_name,
            str(candidate.resume_data.get("email", "")),
            candidate.document_id,
        )


def _resume_data(
    fixture: FixtureDataProvider, candidate_id: str, email: str
) -> dict[str, Any]:
    candidate = fixture.get_candidate(candidate_id)
    if candidate is None:
        return {"email": email}
    data = dict(candidate.resume_data)
    data["email"] = email
    return data
