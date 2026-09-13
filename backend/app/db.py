"""Small SQLite persistence layer for Nexora-owned pipeline state."""

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Iterator

from mywork.evidence.schemas.ranking import RankingEvidence
from .models import AnalysisState, CandidateState, HRDecision, AssessmentLink


class Database:
    def __init__(self, path: str) -> None:
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def initialize(self) -> None:
        with self.connection() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS analyses (
                    analysis_id TEXT PRIMARY KEY,
                    job_title TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS candidates (
                    candidate_id TEXT PRIMARY KEY,
                    analysis_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    resume_ref TEXT,
                    current_stage TEXT NOT NULL,
                    FOREIGN KEY (analysis_id) REFERENCES analyses(analysis_id)
                );
                CREATE TABLE IF NOT EXISTS assessment_links (
                    candidate_id TEXT PRIMARY KEY,
                    assessment_id INTEGER NOT NULL,
                    invite_id INTEGER NOT NULL,
                    token TEXT NOT NULL UNIQUE,
                    status TEXT NOT NULL,
                    invite_url TEXT,
                    profile_id TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id)
                );
                CREATE TABLE IF NOT EXISTS hr_decisions (
                    candidate_id TEXT PRIMARY KEY,
                    decision TEXT NOT NULL,
                    reason TEXT,
                    decided_at TEXT,
                    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id)
                );
                CREATE TABLE IF NOT EXISTS candidate_rankings (
                    candidate_id TEXT PRIMARY KEY,
                    ranking_json TEXT NOT NULL,
                    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id)
                );
                CREATE TABLE IF NOT EXISTS candidate_resumes (
                    candidate_id TEXT PRIMARY KEY,
                    resume_json TEXT NOT NULL,
                    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id)
                );
                """
            )
            # Ensure backward-compatible column additions for existing databases
            cols_link = [row[1] for row in connection.execute("PRAGMA table_info(assessment_links)").fetchall()]
            if "profile_id" not in cols_link:
                connection.execute("ALTER TABLE assessment_links ADD COLUMN profile_id TEXT")
            if "created_at" not in cols_link:
                connection.execute("ALTER TABLE assessment_links ADD COLUMN created_at TEXT")
            if "updated_at" not in cols_link:
                connection.execute("ALTER TABLE assessment_links ADD COLUMN updated_at TEXT")

            cols_hr = [row[1] for row in connection.execute("PRAGMA table_info(hr_decisions)").fetchall()]
            if "decided_at" not in cols_hr:
                connection.execute("ALTER TABLE hr_decisions ADD COLUMN decided_at TEXT")

    def seed_candidate(
        self,
        candidate_id: str,
        analysis_id: str,
        name: str,
        email: str,
        resume_ref: str | None,
    ) -> None:
        with self.connection() as connection:
            connection.execute(
                "INSERT OR IGNORE INTO candidates "
                "(candidate_id, analysis_id, name, email, resume_ref, current_stage) "
                "VALUES (?, ?, ?, ?, ?, 'SCREENING')",
                (candidate_id, analysis_id, name, email, resume_ref),
            )

    def seed_analysis(self, analysis_id: str, job_title: str, created_at: str) -> None:
        with self.connection() as connection:
            connection.execute(
                "INSERT OR IGNORE INTO analyses (analysis_id, job_title, status, created_at) "
                "VALUES (?, ?, 'completed', ?)",
                (analysis_id, job_title, created_at),
            )

    def get_candidate(self, candidate_id: str) -> CandidateState | None:
        with self.connection() as connection:
            row = connection.execute(
                "SELECT * FROM candidates WHERE candidate_id = ?", (candidate_id,)
            ).fetchone()
        return _candidate(row) if row else None

    def get_analysis(self, analysis_id: str) -> AnalysisState | None:
        with self.connection() as connection:
            row = connection.execute(
                "SELECT * FROM analyses WHERE analysis_id = ?", (analysis_id,)
            ).fetchone()
        if not row:
            return None
        return AnalysisState(
            analysis_id=row["analysis_id"],
            job_title=row["job_title"],
            status=row["status"],
            created_at=row["created_at"],
        )

    def list_candidates(self) -> list[CandidateState]:
        with self.connection() as connection:
            rows = connection.execute(
                "SELECT * FROM candidates ORDER BY candidate_id"
            ).fetchall()
        return [_candidate(row) for row in rows]

    def update_stage(self, candidate_id: str, stage: str) -> CandidateState | None:
        with self.connection() as connection:
            connection.execute(
                "UPDATE candidates SET current_stage = ? WHERE candidate_id = ?",
                (stage, candidate_id),
            )
        return self.get_candidate(candidate_id)

    def create_candidate(
        self,
        candidate_id: str,
        analysis_id: str,
        name: str,
        email: str,
        resume_ref: str | None = None,
        stage: str = "SCREENING",
    ) -> CandidateState:
        with self.connection() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO candidates "
                "(candidate_id, analysis_id, name, email, resume_ref, current_stage) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (candidate_id, analysis_id, name, email, resume_ref, stage),
            )
        cand = self.get_candidate(candidate_id)
        assert cand is not None
        return cand

    def save_assessment_link(self, link: AssessmentLink) -> None:
        created_at = link.created_at or datetime.now(timezone.utc).isoformat()
        updated_at = link.updated_at or datetime.now(timezone.utc).isoformat()
        profile_id = link.profile_id or link.candidate_id
        with self.connection() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO assessment_links "
                "(candidate_id, assessment_id, invite_id, token, status, invite_url, profile_id, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    link.candidate_id,
                    link.assessment_id,
                    link.invite_id,
                    link.token,
                    link.status,
                    link.invite_url,
                    profile_id,
                    created_at,
                    updated_at,
                ),
            )

    def get_assessment_link(self, candidate_id: str) -> AssessmentLink | None:
        with self.connection() as connection:
            row = connection.execute(
                "SELECT * FROM assessment_links WHERE candidate_id = ?",
                (candidate_id,),
            ).fetchone()
        if not row:
            return None
        keys = row.keys()
        return AssessmentLink(
            candidate_id=row["candidate_id"],
            assessment_id=row["assessment_id"],
            invite_id=row["invite_id"],
            token=row["token"],
            status=row["status"],
            invite_url=row["invite_url"],
            profile_id=row["profile_id"] if "profile_id" in keys else row["candidate_id"],
            created_at=row["created_at"] if "created_at" in keys else None,
            updated_at=row["updated_at"] if "updated_at" in keys else None,
        )

    def save_hr_decision(self, decision: HRDecision) -> None:
        decided_at = decision.decided_at or datetime.now(timezone.utc).isoformat()
        with self.connection() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO hr_decisions (candidate_id, decision, reason, decided_at) "
                "VALUES (?, ?, ?, ?)",
                (decision.candidate_id, decision.decision, decision.reason, decided_at),
            )

    def get_hr_decision(self, candidate_id: str) -> HRDecision | None:
        with self.connection() as connection:
            row = connection.execute(
                "SELECT * FROM hr_decisions WHERE candidate_id = ?",
                (candidate_id,),
            ).fetchone()
        if not row:
            return None
        keys = row.keys()
        return HRDecision(
            candidate_id=row["candidate_id"],
            decision=row["decision"],
            reason=row["reason"],
            decided_at=row["decided_at"] if "decided_at" in keys else None,
        )

    def save_ranking(self, ranking: RankingEvidence) -> None:
        with self.connection() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO candidate_rankings (candidate_id, ranking_json) "
                "VALUES (?, ?)",
                (ranking.candidate_id, json.dumps(ranking.model_dump())),
            )

    def get_ranking(self, candidate_id: str) -> RankingEvidence | None:
        with self.connection() as connection:
            row = connection.execute(
                "SELECT ranking_json FROM candidate_rankings WHERE candidate_id = ?",
                (candidate_id,),
            ).fetchone()
        if not row:
            return None
        return RankingEvidence.model_validate(json.loads(row["ranking_json"]))

    def list_rankings(self) -> list[RankingEvidence]:
        with self.connection() as connection:
            rows = connection.execute("SELECT ranking_json FROM candidate_rankings").fetchall()
        rankings = [RankingEvidence.model_validate(json.loads(r["ranking_json"])) for r in rows]
        rankings.sort(key=lambda item: item.rank)
        return rankings

    def save_candidate_resume(self, candidate_id: str, data: dict[str, Any]) -> None:
        with self.connection() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO candidate_resumes (candidate_id, resume_json) "
                "VALUES (?, ?)",
                (candidate_id, json.dumps(data)),
            )

    def get_candidate_resume_data(self, candidate_id: str) -> dict[str, Any] | None:
        with self.connection() as connection:
            row = connection.execute(
                "SELECT resume_json FROM candidate_resumes WHERE candidate_id = ?",
                (candidate_id,),
            ).fetchone()
        if not row:
            return None
        return json.loads(row["resume_json"])


def _candidate(row: sqlite3.Row) -> CandidateState:
    return CandidateState(
        candidate_id=row["candidate_id"],
        name=row["name"],
        email=row["email"],
        resume_ref=row["resume_ref"],
        current_stage=row["current_stage"],
        analysis_id=row["analysis_id"],
    )
