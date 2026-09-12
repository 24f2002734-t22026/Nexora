"""Rahul, Arjun, and Priya fixtures for Phase 4 behavior tests."""

from mywork.coding_assessment.schemas import (
    AIEvaluation,
    AssessmentCreateRequest,
    AssessmentResponse,
    InviteCreateRequest,
    InviteResponse,
    QuestionResponse,
    SubmissionWithEvaluation,
)
from mywork.coding_assessment.services import AssessmentService
from mywork.evidence.schemas.ranking import RankingEvidence
from mywork.recruiter_ai.provider import CandidateRecord


class FixtureDataProvider:
    def __init__(self) -> None:
        self.candidates = [
            CandidateRecord(
                candidate_id="cand_014",
                candidate_name="Rahul",
                document_id="resume_014",
                resume_data={
                    "email": "rahul@example.com",
                    "skills": ["Python", "FastAPI", "React"],
                    "experience": [{"claim": "Backend development", "value": "3 years"}],
                    "projects": [{"title": "Hiring API", "description": "Built APIs"}],
                },
            ),
            CandidateRecord(
                candidate_id="cand_021",
                candidate_name="Arjun",
                document_id="resume_021",
                resume_data={
                    "email": "arjun@example.com",
                    "skills": ["Python", "React"],
                    "experience": [{"claim": "Frontend development", "value": "2 years"}],
                },
            ),
            CandidateRecord(
                candidate_id="cand_030",
                candidate_name="Priya",
                document_id="resume_030",
                resume_data={
                    "email": "priya@example.com",
                    "skills": ["Java", "SQL"],
                    "experience": [{"claim": "Data engineering", "value": "2 years"}],
                },
            ),
        ]
        self.rankings = [
            RankingEvidence(
                candidate_id="cand_014",
                candidate_name="Rahul",
                rank=1,
                final_score=91.4,
                semantic_score=93,
                keyword_score=88,
                matched_skills=["Python", "FastAPI", "React"],
                missing_skills=["Docker"],
            ),
            RankingEvidence(
                candidate_id="cand_021",
                candidate_name="Arjun",
                rank=2,
                final_score=87.1,
                semantic_score=85,
                keyword_score=89,
                matched_skills=["Python", "React"],
                missing_skills=["Docker"],
            ),
            RankingEvidence(
                candidate_id="cand_030",
                candidate_name="Priya",
                rank=3,
                final_score=75,
                semantic_score=74,
                keyword_score=76,
                matched_skills=["SQL"],
                missing_skills=["Docker", "React"],
            ),
        ]

    def get_rankings(self) -> list[RankingEvidence]:
        return self.rankings

    def get_candidate(self, candidate_id: str) -> CandidateRecord | None:
        return next((item for item in self.candidates if item.candidate_id == candidate_id), None)

    def get_candidates(self) -> list[CandidateRecord]:
        return self.candidates

    def get_candidate_resume_data(self, candidate_id: str) -> dict[str, object]:
        candidate = self.get_candidate(candidate_id)
        return candidate.resume_data if candidate else {}

    def get_candidate_ranking(self, candidate_id: str) -> RankingEvidence | None:
        return next((item for item in self.rankings if item.candidate_id == candidate_id), None)

    def find_candidates_by_skill(self, skill: str) -> list[CandidateRecord]:
        normalized = skill.casefold()
        return [
            candidate
            for candidate in self.candidates
            if any(
                isinstance(value, str) and normalized in value.casefold()
                for value in candidate.resume_data.get("skills", [])
            )
        ]

    def find_candidates_missing_skill(self, skill: str) -> list[CandidateRecord]:
        normalized = skill.casefold()
        return [
            candidate
            for candidate in self.candidates
            if any(
                normalized == missing.casefold()
                for ranking in self.rankings
                if ranking.candidate_id == candidate.candidate_id
                for missing in ranking.missing_skills
            )
        ]


class FixtureCodeAssessClient:
    def __init__(self) -> None:
        self.invite_calls: list[tuple[int, InviteCreateRequest]] = []
        self.assessment = AssessmentResponse(
            id=22,
            title="Backend Assessment",
            description="Backend skills",
            interviewer_id=1,
        )
        self.invite = InviteResponse(
            id=9,
            test_id=22,
            candidate_name="Rahul",
            candidate_email="rahul@example.com",
            profile_id="cand_014",
            token="rahul-token",
            status="pending",
        )
        self.evaluation = AIEvaluation(
            id=77,
            submission_id=184,
            correctness_score=92,
            efficiency_score=88,
            code_quality_score=90,
            overall_score=91,
            is_correct=True,
            time_complexity="O(n)",
            space_complexity="O(1)",
            strengths=["Clear implementation"],
            detected_issues=[],
            improvements=["Add more tests"],
            explanation="Strong Python backend implementation.",
        )

    def create_assessment(self, request: AssessmentCreateRequest) -> AssessmentResponse:
        return self.assessment.model_copy(update={"title": request.title})

    def get_assessment(self, assessment_id: int) -> AssessmentResponse:
        return self.assessment

    def add_question(self, assessment_id: int, request: object) -> QuestionResponse:
        raise NotImplementedError

    def get_questions(self, assessment_id: int) -> list[QuestionResponse]:
        return [
            QuestionResponse(
                id=101,
                test_id=22,
                question_text="Implement a backend API",
                language="python",
            )
        ]

    def create_invite(
        self, assessment_id: int, request: InviteCreateRequest
    ) -> InviteResponse:
        self.invite_calls.append((assessment_id, request))
        return self.invite.model_copy(
            update={
                "candidate_name": request.candidate_name,
                "candidate_email": request.candidate_email,
                "profile_id": request.profile_id,
            }
        )

    def resolve_invite(self, token: str) -> InviteResponse:
        return self.invite

    def list_invites(self) -> list[InviteResponse]:
        return [self.invite]

    def get_submissions(self) -> list[SubmissionWithEvaluation]:
        return [
            SubmissionWithEvaluation(
                id=184,
                invite_id=9,
                question_id=101,
                code="def solve(): pass",
                language="python",
                status="submitted",
                stdout="ok",
                stderr=None,
                execution_time_ms=5,
                evaluation=self.evaluation,
            )
        ]

    def get_submission_report(self, submission_id: int) -> str:
        return "<html>report</html>"

    def evaluate_submission(self, submission_id: int) -> AIEvaluation:
        return self.evaluation


def build_fixture_tools():
    from mywork.recruiter_ai.tools.service import NexaToolService

    provider = FixtureDataProvider()
    assessment_service = AssessmentService(
        FixtureCodeAssessClient(), frontend_url="https://assess.example"
    )
    return NexaToolService(provider, assessment_service), provider