from fastapi import APIRouter
from pydantic import BaseModel

from ..ai import call_deepseek

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM_PROMPT = (
    "You are a helpful AI assistant embedded in a corporate workshop app. Teams are "
    "designing an AI-enhanced workflow for their own department, following a "
    "Map -> Identify -> Evaluate -> Design framework. Help them brainstorm process "
    "steps, spot pain points and risks, suggest realistic AI agents/tools, and think "
    "through human-in-the-loop checkpoints. Be concise, practical, and encouraging."
)
MAX_HISTORY = 20


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@router.post("")
async def chat(payload: ChatRequest):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + [
        {"role": m.role, "content": m.content} for m in payload.messages[-MAX_HISTORY:]
    ]
    reply = await call_deepseek(messages)
    return {"reply": reply}
