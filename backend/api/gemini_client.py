from __future__ import annotations

import json
import os
from pathlib import Path

import requests


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


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
    url = GEMINI_ENDPOINT.format(model=model)
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

    response = requests.post(
        url,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        json=request_body,
        timeout=45,
    )
    response.raise_for_status()

    return _extract_text(response.json())


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
