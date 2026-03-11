# ============================================================
#  routers/chat.py  —  AI Companion Chat API
#  Xử lý tin nhắn text + voice, gọi LLM, trả về response
# ============================================================

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from models.llm_handler import LLMHandler

router = APIRouter()
llm = LLMHandler()


# ── Request / Response schemas ───────────────────────────────
class ChatRequest(BaseModel):
    message: str                        # tin nhắn từ user
    user_id: str = "dorothy"            # ID người dùng
    conversation_id: Optional[str] = None  # để giữ context hội thoại
    context: Optional[dict] = None      # health context (BP, meds...)


class ChatResponse(BaseModel):
    reply: str                          # câu trả lời của AI
    conversation_id: str
    intent: Optional[str] = None        # "medication" | "health" | "emergency" | "chat"
    action: Optional[dict] = None       # action cần thực hiện (vd: set reminder)


# ── POST /api/chat/message ───────────────────────────────────
@router.post("/message", response_model=ChatResponse)
async def send_message(req: ChatRequest):
    """
    Nhận tin nhắn từ Dorothy, gọi LLM, trả về response.
    LLM tự động detect intent và đề xuất action nếu cần.
    """
    try:
        result = await llm.chat(
            message=req.message,
            user_id=req.user_id,
            conversation_id=req.conversation_id,
            health_context=req.context,
        )
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /api/chat/history/{user_id} ─────────────────────────
@router.get("/history/{user_id}")
async def get_history(user_id: str, limit: int = 20):
    """Lấy lịch sử hội thoại gần nhất để hiển thị trên UI."""
    history = await llm.get_history(user_id=user_id, limit=limit)
    return {"history": history}


# ── POST /api/chat/clear/{user_id} ──────────────────────────
@router.post("/clear/{user_id}")
async def clear_history(user_id: str):
    """Xóa lịch sử hội thoại (ví dụ: bắt đầu ngày mới)."""
    await llm.clear_history(user_id=user_id)
    return {"status": "cleared"}
