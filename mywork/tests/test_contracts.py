import unittest

from mywork.coding_assessment.schemas import AIEvaluation, AssessmentResult
from mywork.recruiter_ai.schemas import (
    Action,
    ChatRequest,
    ChatResponse,
    ResponseEvidence,
    Warning,
)
from mywork.evidence.schemas.sources import EvidenceSource


class ContractTests(unittest.TestCase):
    def test_pending_codeassess_evaluation_is_representable(self) -> None:
        evaluation = AIEvaluation(submission_id=184)
        result = AssessmentResult(profile_id="cand_014")
        self.assertIsNone(evaluation.overall_score)
        self.assertEqual(result.status, "pending")

    def test_evaluation_fields_serialize(self) -> None:
        evaluation = AIEvaluation(
            correctness_score=90,
            efficiency_score=85,
            code_quality_score=88,
            overall_score=88,
            is_correct=True,
            time_complexity="O(n)",
            space_complexity="O(1)",
            strengths=["Clear implementation"],
        )
        payload = evaluation.model_dump()
        self.assertEqual(payload["overall_score"], 88)
        self.assertEqual(payload["strengths"], ["Clear implementation"])

    def test_chat_request_and_response_contract(self) -> None:
        request = ChatRequest(
            conversation_id="conv_001",
            message="Why is Rahul ranked above Arjun?",
            candidate_ids=["cand_014", "cand_021"],
            context={"job_id": "job_003"},
        )
        response = ChatResponse(
            answer="Rahul has stronger matching evidence.",
            intent="compare_candidate_rank",
            evidence=[
                ResponseEvidence(
                    evidence_id="ev_001",
                    source=EvidenceSource.RANKING,
                    summary="Higher final score",
                    candidate_id="cand_014",
                )
            ],
            actions=[
                Action(
                    type="assessment_invite_created",
                    label="Open assessment invite",
                    payload={
                        "candidate_id": "cand_014",
                        "invite_url": "https://example.test/invite",
                    },
                )
            ],
            warnings=[Warning(code="partial_data", message="Assessment pending")],
        )
        payload = response.model_dump()
        self.assertEqual(request.context.job_id, "job_003")
        self.assertEqual(
            set(payload),
            {"answer", "intent", "evidence", "actions", "warnings"},
        )
        self.assertEqual(payload["actions"][0]["payload"]["candidate_id"], "cand_014")


if __name__ == "__main__":
    unittest.main()