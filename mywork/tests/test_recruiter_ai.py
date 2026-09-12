import unittest

import httpx

from mywork.coding_assessment.client.errors import CodeAssessError
from mywork.recruiter_ai.agent import RecruiterAIOrchestrator
from mywork.recruiter_ai.agent.intent_router import IntentRouter
from mywork.recruiter_ai.agent.response_generator import (
    OpenRouterResponseGenerator,
    ResponseGenerationError,
)
from mywork.recruiter_ai.schemas import ChatRequest, IntentName, StructuredResponse
from mywork.recruiter_ai.tools import AssessmentUnavailable, NexaToolService
from mywork.tests.fixtures.nexa_data import (
    FixtureDataProvider,
    build_fixture_tools,
)


class MockResponseGenerator:
    def __init__(self, response: StructuredResponse | None = None, error: Exception | None = None):
        self.response = response
        self.error = error
        self.received: tuple[str, IntentName, object, list[object]] | None = None

    def generate(self, message, intent, tool_data, evidence):
        self.received = (message, intent, tool_data, evidence)
        if self.error:
            raise self.error
        return self.response or StructuredResponse(answer="Grounded model response")


class RecruiterAITests(unittest.TestCase):
    def setUp(self) -> None:
        self.tools, self.provider = build_fixture_tools()

    def orchestrator(self, generator=None) -> RecruiterAIOrchestrator:
        return RecruiterAIOrchestrator(
            self.provider,
            self.tools,
            response_generator=generator,
            interviewer_id=1,
        )

    def test_router_covers_core_demo_questions(self) -> None:
        router = IntentRouter()
        cases = {
            "Why is Rahul ranked above Arjun?": IntentName.CANDIDATE_COMPARISON,
            "Who has the strongest React experience?": IntentName.SKILL_SEARCH,
            "Show candidates missing Docker.": IntentName.MISSING_SKILL_SEARCH,
            "Summarize Rahul.": IntentName.CANDIDATE_SUMMARY,
            "How did Rahul perform technically?": IntentName.ASSESSMENT_RESULT,
            "Does Rahul's assessment support his resume?": IntentName.RESUME_ASSESSMENT_COMPARISON,
            "Compare Rahul and Arjun technically.": IntentName.CANDIDATE_COMPARISON,
            "Send Rahul a coding assessment.": IntentName.ASSESSMENT_CREATION,
        }
        for message, expected in cases.items():
            with self.subTest(message=message):
                self.assertEqual(router.route(message).intent, expected)

    def test_core_demo_questions_use_correct_tools_and_evidence(self) -> None:
        cases = [
            ("Why is Rahul ranked above Arjun?", "candidate_comparison", "cand_014"),
            ("Who has the strongest React experience?", "skill_search", "cand_014"),
            ("Show candidates missing Docker.", "missing_skill_search", "cand_014"),
            ("Summarize Rahul.", "candidate_summary", "cand_014"),
            ("How did Rahul perform technically?", "assessment_result", "cand_014"),
            ("Does Rahul's assessment support his resume?", "resume_assessment_comparison", "cand_014"),
            ("Compare Rahul and Arjun technically.", "candidate_comparison", "cand_014"),
            ("Send Rahul a coding assessment.", "assessment_creation", "cand_014"),
        ]
        for message, intent, candidate_id in cases:
            with self.subTest(message=message):
                response = self.orchestrator().handle(ChatRequest(message=message))
                self.assertEqual(response.intent, intent)
                self.assertTrue(response.answer)
                if intent not in {"missing_skill_search", "assessment_creation"}:
                    self.assertTrue(
                        any(item.candidate_id == candidate_id for item in response.evidence)
                    )

    def test_case_insensitive_and_direct_id_resolution(self) -> None:
        lowercase = self.orchestrator().handle(ChatRequest(message="summarize rahul"))
        self.assertEqual(lowercase.intent, IntentName.CANDIDATE_SUMMARY.value)
        direct = self.orchestrator().handle(
            ChatRequest(message="summarize this candidate", candidate_ids=["cand_014"])
        )
        self.assertEqual(direct.intent, IntentName.CANDIDATE_SUMMARY.value)
        self.assertIn("Rahul", direct.answer)

    def test_unknown_and_ambiguous_entities_require_clarification(self) -> None:
        unknown = self.orchestrator().handle(ChatRequest(message="Summarize Morgan."))
        self.assertEqual(unknown.intent, IntentName.CLARIFICATION_REQUIRED.value)
        self.assertEqual(unknown.warnings[0].code, "clarification_required")

        duplicate = FixtureDataProvider()
        duplicate.candidates.append(duplicate.candidates[0].model_copy(update={"candidate_id": "cand_099"}))
        tools = NexaToolService(duplicate)
        response = RecruiterAIOrchestrator(duplicate, tools).handle(
            ChatRequest(message="Summarize Rahul.")
        )
        self.assertEqual(response.intent, IntentName.CLARIFICATION_REQUIRED.value)

    def test_unsupported_and_missing_entities_are_safe(self) -> None:
        unsupported = self.orchestrator().handle(ChatRequest(message="What is the weather?"))
        self.assertEqual(unsupported.intent, IntentName.UNSUPPORTED.value)
        clarification = self.orchestrator().handle(ChatRequest(message="Compare candidates."))
        self.assertEqual(clarification.intent, IntentName.CLARIFICATION_REQUIRED.value)

    def test_mocked_response_generator_receives_grounded_data(self) -> None:
        generator = MockResponseGenerator(StructuredResponse(answer="Model answer"))
        response = self.orchestrator(generator).handle(
            ChatRequest(message="Why is Rahul ranked above Arjun?")
        )
        self.assertEqual(response.answer, "Model answer")
        self.assertIsNotNone(generator.received)
        self.assertEqual(generator.received[1], IntentName.CANDIDATE_COMPARISON)
        self.assertTrue(generator.received[3])

    def test_llm_failure_uses_grounded_fallback_and_warning(self) -> None:
        generator = MockResponseGenerator(error=ResponseGenerationError("offline"))
        response = self.orchestrator(generator).handle(
            ChatRequest(message="Why is Rahul ranked above Arjun?")
        )
        self.assertIn("91.4", response.answer)
        self.assertIn("87.1", response.answer)
        self.assertEqual(response.warnings[0].code, "response_generation_failed")

    def test_openrouter_structured_response_is_mockable(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": '{"answer":"Grounded","key_points":[]}'
                            }
                        }
                    ]
                },
            )

        generator = OpenRouterResponseGenerator(
            api_key="test-key",
            model="test-model",
            transport=httpx.MockTransport(handler),
        )
        result = generator.generate("Summarize Rahul", IntentName.CANDIDATE_SUMMARY, {}, [])
        self.assertEqual(result.answer, "Grounded")

    def test_malformed_openrouter_response_is_typed(self) -> None:
        generator = OpenRouterResponseGenerator(
            api_key="test-key",
            transport=httpx.MockTransport(lambda request: httpx.Response(200, text="bad")),
        )
        with self.assertRaises(ResponseGenerationError):
            generator.generate("Summarize Rahul", IntentName.CANDIDATE_SUMMARY, {}, [])

    def test_tool_failure_does_not_expose_raw_exception(self) -> None:
        class FailingTools(NexaToolService):
            def get_candidate_summary(self, candidate_id):
                raise AssessmentUnavailable("provider offline")

        response = RecruiterAIOrchestrator(
            self.provider, FailingTools(self.provider)
        ).handle(ChatRequest(message="Summarize Rahul."))
        self.assertEqual(response.answer, "The requested information is currently unavailable.")
        self.assertEqual(response.warnings[0].code, "tool_unavailable")
        self.assertNotIn("Traceback", response.answer)

    def test_assessment_action_is_structured(self) -> None:
        response = self.orchestrator().handle(
            ChatRequest(message="Send Rahul a coding assessment.")
        )
        self.assertEqual(response.actions[0].type, "assessment_invite_created")
        self.assertEqual(response.actions[0].payload["candidate_id"], "cand_014")
        self.assertIn("rahul-token", response.actions[0].payload["invite_url"])

    def test_failed_invite_is_not_reported_as_success(self) -> None:
        def fail(candidate_id, assessment_id):
            raise AssessmentUnavailable("invite service offline")

        self.tools.create_candidate_invite = fail
        response = self.orchestrator().handle(
            ChatRequest(message="Send Rahul a coding assessment.")
        )
        self.assertEqual(response.actions[0].type, "assessment_invite_failed")
        self.assertEqual(response.warnings[0].code, "assessment_invite_failed")
        self.assertNotIn("assessment_invite_created", [action.type for action in response.actions])


if __name__ == "__main__":
    unittest.main()