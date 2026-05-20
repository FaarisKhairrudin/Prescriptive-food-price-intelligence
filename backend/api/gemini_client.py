from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
DEFAULT_GEMINI_FALLBACK_MODELS = [
    "gemini-2.0-flash",
    "gemini-flash-lite-latest",
    "gemini-2.5-flash",
]
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
MAX_QUOTA_RETRY_SECONDS = 70


class GeminiAPIError(RuntimeError):
    pass


class GeminiQuotaError(GeminiAPIError):
    def __init__(self, message: str, retry_after: float | None = None):
        super().__init__(message)
        self.retry_after = retry_after


class GeminiModelUnavailableError(GeminiAPIError):
    pass


def load_env_file(path: Path = ENV_PATH) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def is_gemini_configured() -> bool:
    load_env_file()
    return bool(os.environ.get("GEMINI_API_KEY"))


def _extract_text(payload: dict) -> str:
    try:
        return payload["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError) as exc:
        raise RuntimeError(
            f"Respons Gemini tidak sesuai format: {json.dumps(payload)[:500]}"
        ) from exc


def _strip_json_fence(text: str) -> str:
    clean = text.strip()
    if clean.startswith("```"):
        clean = clean.strip("`")
        if clean.lower().startswith("json"):
            clean = clean[4:]
    return clean.strip()


def _unique_items(items: list[str]) -> list[str]:
    seen = set()
    unique = []
    for item in items:
        clean = item.strip()
        if clean and clean not in seen:
            unique.append(clean)
            seen.add(clean)
    return unique


def _candidate_models(primary_model: str) -> list[str]:
    configured_fallbacks = os.environ.get("GEMINI_FALLBACK_MODELS", "")
    fallback_models = [
        item.strip()
        for item in configured_fallbacks.split(",")
        if item.strip()
    ] or DEFAULT_GEMINI_FALLBACK_MODELS

    return _unique_items([primary_model, *fallback_models])


def _retry_after_from_error(error_payload: dict, fallback_text: str) -> float | None:
    for detail in error_payload.get("error", {}).get("details", []):
        retry_delay = detail.get("retryDelay")
        if isinstance(retry_delay, str):
            match = re.match(r"^([\d.]+)s$", retry_delay)
            if match:
                return float(match.group(1))

    match = re.search(r"retry in ([\d.]+)s", fallback_text, re.IGNORECASE)
    if match:
        return float(match.group(1))

    return None


def _post_json_once(url: str, headers: dict, body: dict, timeout: int = 45) -> dict:
    encoded_body = json.dumps(body).encode("utf-8")
    request = urllib_request.Request(
        url,
        data=encoded_body,
        headers=headers,
        method="POST",
    )

    try:
        with urllib_request.urlopen(request, timeout=timeout) as response:
            response_body = response.read().decode("utf-8")
            return json.loads(response_body)
    except urllib_error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        try:
            error_payload = json.loads(error_body)
        except json.JSONDecodeError:
            error_payload = {}

        message = (
            error_payload.get("error", {}).get("message")
            if isinstance(error_payload, dict)
            else None
        ) or error_body
        clean_message = " ".join(str(message).split())

        if exc.code == 429:
            retry_after = _retry_after_from_error(error_payload, error_body)
            raise GeminiQuotaError(
                f"Gemini API quota/rate limit: {clean_message[:500]}",
                retry_after=retry_after,
            ) from exc

        if exc.code == 404:
            raise GeminiModelUnavailableError(
                f"Gemini model tidak tersedia: {clean_message[:500]}"
            ) from exc

        raise GeminiAPIError(
            f"Gemini API error {exc.code}: {clean_message[:700]}"
        ) from exc
    except urllib_error.URLError as exc:
        raise GeminiAPIError(f"Gagal menghubungi Gemini API: {exc.reason}") from exc


def _post_json(url: str, headers: dict, body: dict, timeout: int = 45) -> dict:
    for attempt in range(2):
        try:
            return _post_json_once(url, headers, body, timeout)
        except GeminiQuotaError as exc:
            retry_after = exc.retry_after
            can_retry = (
                attempt == 0
                and retry_after is not None
                and retry_after <= MAX_QUOTA_RETRY_SECONDS
            )
            if not can_retry:
                raise

            time.sleep(retry_after + 1)

    raise GeminiAPIError("Gemini API gagal setelah retry.")


def generate_gemini_text(
    prompt: str,
    system_instruction: str | None = None,
    response_mime_type: str | None = None,
) -> str:
    load_env_file()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY belum tersedia di environment atau .env.")

    model = os.environ.get("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    request_body = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.35,
            "topP": 0.85,
            "maxOutputTokens": 4096,
        },
    }

    if system_instruction:
        request_body["systemInstruction"] = {
            "parts": [
                {
                    "text": system_instruction,
                }
            ]
        }

    if response_mime_type:
        request_body["generationConfig"]["responseMimeType"] = response_mime_type

    errors = []
    payload = None
    for candidate_model in _candidate_models(model):
        url = GEMINI_ENDPOINT.format(model=candidate_model)
        try:
            payload = _post_json(
                url,
                {
                    "Content-Type": "application/json",
                    "x-goog-api-key": api_key,
                },
                body=request_body,
                timeout=45,
            )
            break
        except (GeminiModelUnavailableError, GeminiQuotaError) as exc:
            errors.append(f"{candidate_model}: {exc}")
            continue

    if payload is None:
        raise GeminiAPIError("Semua model Gemini gagal: " + " | ".join(errors))

    return _extract_text(payload)


def generate_gemini_json(
    prompt: str,
    system_instruction: str | None = None,
) -> dict:
    text = generate_gemini_text(
        prompt=prompt,
        system_instruction=system_instruction,
        response_mime_type="application/json",
    )

    try:
        return json.loads(_strip_json_fence(text))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Respons Gemini bukan JSON valid: {text[:500]}") from exc
