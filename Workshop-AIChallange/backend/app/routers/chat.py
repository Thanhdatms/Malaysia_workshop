import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import DEEPSEEK_API_BASE, DEEPSEEK_API_KEY, DEEPSEEK_MODEL

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    """Stateless single-turn AI chat: no conversation history is kept or
    stored, each question stands on its own (see CLAUDE.md)."""
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if not DEEPSEEK_API_KEY:
        raise HTTPException(status_code=503, detail="AI chat is not configured on this server")

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.post(
                f"{DEEPSEEK_API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
                json={
                    "model": DEEPSEEK_MODEL,
                    "messages": [{"role": "user", "content": message}],
                    "stream": False,
                },
            )
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"Could not reach AI provider: {exc}") from exc

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"AI provider error ({resp.status_code}): {resp.text[:300]}")

    data = resp.json()
    try:
        reply = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Unexpected response from AI provider")

    return ChatResponse(reply=reply)
