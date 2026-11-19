"""OpenAI-compatible client for structured LLM extraction with retry logic."""

import json
import logging
import re
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMError(Exception):
    """Base exception for LLM operations."""


class LLMConnectionError(LLMError):
    """Raised when LLM server is unreachable."""


class LLMValidationError(LLMError):
    """Raised when LLM output fails schema validation after retries."""


class LLMClient:
    """Client for OpenAI-compatible LLM endpoints (e.g. Ollama, vLLM, OpenAI)."""

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        api_key: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self.base_url = (base_url or settings.llm_base_url).rstrip("/")
        self.model = model or settings.llm_model
        self.api_key = api_key or settings.llm_api_key
        self.timeout = timeout or settings.llm_timeout

    def check_connection(self) -> bool:
        """Verifies if the LLM service is running and accessible."""
        try:
            with httpx.Client(timeout=3.0) as client:
                res = client.get(f"{self.base_url}/models")
                return res.status_code == 200
        except Exception:
            try:
                # Fallback check for Ollama /api/tags or root
                with httpx.Client(timeout=3.0) as client:
                    root_url = self.base_url.replace("/v1", "")
                    res = client.get(f"{root_url}/api/tags")
                    return res.status_code == 200
            except Exception:
                return False

    def chat_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.0,
        response_format: dict[str, str] | None = None,
    ) -> str:
        """Sends chat completion request to the OpenAI-compatible endpoint."""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if response_format:
            payload["response_format"] = response_format

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise LLMError(
                        f"LLM request failed with status {response.status_code}: {response.text}"
                    )
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.ConnectError as exc:
            logger.error("Failed to connect to LLM at %s: %s", url, exc)
            raise LLMConnectionError(f"Could not connect to LLM at {url}: {exc}") from exc
        except httpx.TimeoutException as exc:
            logger.error("LLM request timed out at %s: %s", url, exc)
            raise LLMConnectionError(f"LLM request timed out: {exc}") from exc
        except Exception as exc:
            if isinstance(exc, LLMError):
                raise
            logger.error("Unexpected error during LLM call: %s", exc)
            raise LLMError(f"LLM call failed: {exc}") from exc

    @staticmethod
    def _clean_json_text(text: str) -> str:
        """Strips markdown code blocks and whitespace from LLM output."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        return cleaned.strip()

    def extract_structured(
        self,
        prompt: str,
        schema_cls: type[T],
        system_prompt: str,
        max_retries: int = 1,
    ) -> T:
        """Extracts structured data validating against schema_cls with 1 retry on failure."""
        schema_json = json.dumps(schema_cls.model_json_schema(), indent=2)
        full_system_prompt = (
            f"{system_prompt}\n\n"
            f"You MUST output ONLY valid JSON matching this JSON Schema:\n{schema_json}\n"
            "Do not include any explanation or markdown formatting outside the JSON."
        )

        messages = [
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": prompt},
        ]

        last_error: Exception | None = None
        for attempt in range(max_retries + 1):
            raw_response = self.chat_completion(
                messages,
                temperature=0.0,
                response_format={"type": "json_object"},
            )

            try:
                cleaned_text = self._clean_json_text(raw_response)
                parsed_data = json.loads(cleaned_text)
                return schema_cls.model_validate(parsed_data)
            except (json.JSONDecodeError, ValidationError) as exc:
                last_error = exc
                logger.warning(
                    "LLM response failed validation on attempt %d: %s",
                    attempt + 1,
                    exc,
                )
                if attempt < max_retries:
                    # Provide feedback to the LLM for correction
                    messages.append({"role": "assistant", "content": raw_response})
                    messages.append(
                        {
                            "role": "user",
                            "content": (
                                f"The previous output failed validation: {exc}. "
                                "Please fix the output to strictly conform to the JSON schema."
                            ),
                        }
                    )

        raise LLMValidationError(
            f"LLM output failed validation for {schema_cls.__name__} "
            f"after {max_retries + 1} attempts: {last_error}"
        )


llm_client = LLMClient()
