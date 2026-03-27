from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI

from app.core.config import settings

router = APIRouter(prefix="/model", tags=["model"])

client = None
if settings.OPENAI_API_KEY:
    client = OpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL,
    )


class ChatRequest(BaseModel):
    messages: list[dict]


class ChatResponse(BaseModel):
    message: dict


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not client:
        raise HTTPException(status_code=503, detail="Model not configured")

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=request.messages,
        )
        return ChatResponse(
            message={
                "role": "assistant",
                "content": response.choices[0].message.content,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
