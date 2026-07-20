import httpx
from fastapi import HTTPException

from .config import DEEPSEEK_API_BASE, DEEPSEEK_API_KEY, DEEPSEEK_MODEL

DEEPSEEK_API_URL = f"{DEEPSEEK_API_BASE.rstrip('/')}/chat/completions"


async def call_deepseek(messages: list[dict], *, json_mode: bool = False, timeout: float = 45.0) -> str:
    api_key = DEEPSEEK_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="AI features are not configured on this server.")

    body = {"model": DEEPSEEK_MODEL, "messages": messages, "stream": False}
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            res = await client.post(
                DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            res.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502, detail="The AI assistant is unavailable right now."
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502, detail="Could not reach the AI assistant."
            ) from exc

    return res.json()["choices"][0]["message"]["content"]
