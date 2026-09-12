import json
import unittest

import httpx

from mywork.coding_assessment.client import (
    AdapterConnectionError,
    AdapterTimeoutError,
    CodeAssessApiClient,
    CodeAssessHttpClient,
    ConfigurationError,
    MalformedResponseError,
    NotFoundError,
    UpstreamClientError,
    UpstreamServerError,
)
from mywork.coding_assessment.schemas import AssessmentCreateRequest


class CodeAssessHttpTests(unittest.TestCase):
    def test_successful_get_and_post_use_expected_json(self) -> None:
        seen: list[tuple[str, str, dict | None]] = []

        def handler(request: httpx.Request) -> httpx.Response:
            body = json.loads(request.content) if request.content else None
            seen.append((request.method, request.url.path, body))
            if request.method == "POST":
                return httpx.Response(
                    200,
                    json={
                        "id": 7,
                        "title": body["title"],
                        "description": None,
                        "interviewer_id": 1,
                    },
                )
            return httpx.Response(
                200,
                json={
                    "id": 7,
                    "title": "Backend",
                    "description": None,
                    "interviewer_id": 1,
                },
            )

        with CodeAssessHttpClient(
            base_url="https://codeassess.test",
            transport=httpx.MockTransport(handler),
        ) as http:
            api = CodeAssessApiClient(http)
            self.assertEqual(api.get_assessment(7).id, 7)
            created = api.create_assessment(
                AssessmentCreateRequest(title="Backend", interviewer_id=1)
            )

        self.assertEqual(created.title, "Backend")
        self.assertEqual(seen[0], ("GET", "/tests/7", None))
        self.assertEqual(seen[1][0:2], ("POST", "/tests"))
        self.assertEqual(seen[1][2]["interviewer_id"], 1)

    def test_missing_configuration_is_typed(self) -> None:
        with self.assertRaises(ConfigurationError):
            CodeAssessHttpClient(base_url="")

    def test_status_errors_are_typed(self) -> None:
        cases = [
            (404, NotFoundError),
            (400, UpstreamClientError),
            (500, UpstreamServerError),
        ]
        for status, error_type in cases:
            with self.subTest(status=status):
                transport = httpx.MockTransport(
                    lambda request, status=status: httpx.Response(status)
                )
                with CodeAssessHttpClient(
                    base_url="https://codeassess.test", transport=transport
                ) as http:
                    with self.assertRaises(error_type):
                        http.get("/resource")

    def test_malformed_json_is_typed(self) -> None:
        transport = httpx.MockTransport(
            lambda request: httpx.Response(200, text="not-json")
        )
        with CodeAssessHttpClient(
            base_url="https://codeassess.test", transport=transport
        ) as http:
            with self.assertRaises(MalformedResponseError):
                http.get("/resource")

    def test_timeout_and_connection_errors_are_typed(self) -> None:
        timeout_transport = httpx.MockTransport(
            lambda request: (_ for _ in ()).throw(httpx.ReadTimeout("slow"))
        )
        with CodeAssessHttpClient(
            base_url="https://codeassess.test", transport=timeout_transport
        ) as http:
            with self.assertRaises(AdapterTimeoutError):
                http.get("/resource")

        connection_transport = httpx.MockTransport(
            lambda request: (_ for _ in ()).throw(
                httpx.ConnectError("offline", request=request)
            )
        )
        with CodeAssessHttpClient(
            base_url="https://codeassess.test", transport=connection_transport
        ) as http:
            with self.assertRaises(AdapterConnectionError):
                http.get("/resource")

    def test_api_rejects_malformed_typed_payload(self) -> None:
        transport = httpx.MockTransport(
            lambda request: httpx.Response(200, json={"unexpected": True})
        )
        with CodeAssessHttpClient(
            base_url="https://codeassess.test", transport=transport
        ) as http:
            with self.assertRaises(MalformedResponseError):
                CodeAssessApiClient(http).get_assessment(7)


if __name__ == "__main__":
    unittest.main()