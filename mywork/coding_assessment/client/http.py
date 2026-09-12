"""Small synchronous HTTP transport for CodeAssess."""

import os
from typing import Any

import httpx

from .errors import (
    AdapterConnectionError,
    AdapterTimeoutError,
    AuthenticationError,
    ConfigurationError,
    MalformedResponseError,
    NotFoundError,
    UpstreamClientError,
    UpstreamServerError,
)


class CodeAssessHttpClient:
    """JSON GET/POST transport with provider-neutral typed failures."""

    def __init__(
        self,
        base_url: str | None = None,
        timeout: float = 10.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        configured_url = base_url or os.getenv("CODING_ASSESSMENT_API_URL")
        if not configured_url or not configured_url.strip():
            raise ConfigurationError(
                "CODING_ASSESSMENT_API_URL is required for CodeAssess requests"
            )
        normalized_url = configured_url.rstrip("/")
        if not normalized_url.startswith(("http://", "https://")):
            raise ConfigurationError("CodeAssess API URL must use http or https")
        if timeout <= 0:
            raise ConfigurationError("CodeAssess request timeout must be positive")

        self._client = httpx.Client(
            base_url=normalized_url,
            timeout=timeout,
            transport=transport,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "CodeAssessHttpClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def get(self, path: str) -> Any:
        return self._request("GET", path)

    def post(self, path: str, payload: dict[str, Any]) -> Any:
        return self._request("POST", path, payload)

    def get_text(self, path: str) -> str:
        response = self._request_raw("GET", path)
        return response.text

    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> Any:
        response = self._request_raw(method, path, payload)

        try:
            return response.json()
        except (ValueError, TypeError) as exc:
            raise MalformedResponseError(
                "CodeAssess returned invalid JSON"
            ) from exc

    def _request_raw(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> httpx.Response:
        try:
            response = self._client.request(method, path, json=payload)
        except httpx.TimeoutException as exc:
            raise AdapterTimeoutError("CodeAssess request timed out") from exc
        except httpx.ConnectError as exc:
            raise AdapterConnectionError("Could not connect to CodeAssess") from exc
        except httpx.RequestError as exc:
            raise AdapterConnectionError("CodeAssess request failed") from exc

        if response.status_code == 401 or response.status_code == 403:
            raise AuthenticationError(
                f"CodeAssess authorization failed ({response.status_code})"
            )
        if response.status_code == 404:
            raise NotFoundError("CodeAssess resource was not found")
        if 400 <= response.status_code < 500:
            raise UpstreamClientError(
                f"CodeAssess rejected the request ({response.status_code})"
            )
        if response.status_code >= 500:
            raise UpstreamServerError(
                f"CodeAssess server error ({response.status_code})"
            )
        return response