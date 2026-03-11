# ============================================================
#  models/llm_handler.py  —  LLM Handler (Claude API)
#  Quản lý hội thoại, intent detection, health-aware responses
# ============================================================

import os
from anthropic import AsyncAnthropic
from typing import Optional
from dotenv import load_dotenv

load_dotenv()  # đọc ANTHROPIC_API_KEY từ file .env


# ── System prompt cho Dorothy's companion ───────────────────
SYSTEM_PROMPT = """
You are CareCompanion, a warm and gentle AI assistant for Dorothy Johnson, 78 years old,
who lives independently at home. Your role is to help her stay safe, healthy, and connected.

PERSONALITY:
- Speak warmly, slowly, and clearly — like a caring friend
- Use simple language, avoid medical jargon
- Be encouraging and positive, never alarming
- Address her as "Dorothy" occasionally to feel personal

CAPABILITIES:
- Answer health questions based on her current vitals and medications
- Remind her about medications and appointments
- Detect emotional distress and respond with empathy
- Recognize emergency situations and suggest calling for help

INTENT DETECTION — always identify one of:
- "medication": questions about pills, doses, refills
- "health": vitals, symptoms, how she's feeling
- "emergency": pain, fall, can't breathe, urgent help needed
- "social": loneliness, family, chat, emotions
- "activity": exercise, walk, weather, daily routine
- "reminder": appointments, tasks, schedule

HEALTH CONTEXT (current):
{health_context}

Always respond in the same language Dorothy uses (Vietnamese or English).
Keep responses under 3 sentences for voice — clear and easy to hear.
"""


class LLMHandler:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        # Lưu conversation history trong memory (production: dùng Redis/DB)
        self._histories: dict[str, list] = {}

    async def chat(
        self,
        message: str,
        user_id: str = "dorothy",
        conversation_id: Optional[str] = None,
        health_context: Optional[dict] = None,
    ) -> dict:
        """
        Gửi tin nhắn đến Claude và nhận phản hồi.
        Tự động phát hiện intent, đề xuất action nếu cần.
        """
        # Lấy lịch sử hội thoại
        conv_key = conversation_id or user_id
        history = self._histories.get(conv_key, [])

        # Thêm tin nhắn mới vào history
        history.append({"role": "user", "content": message})

        # Format health context vào system prompt
        context_str = self._format_health_context(health_context)
        system = SYSTEM_PROMPT.format(health_context=context_str)

        # Gọi Claude API
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,          # giữ ngắn cho voice
            system=system,
            messages=history,
        )

        reply = response.content[0].text

        # Thêm response vào history
        history.append({"role": "assistant", "content": reply})

        # Giữ tối đa 20 turns để tránh token overflow
        if len(history) > 40:
            history = history[-40:]
        self._histories[conv_key] = history

        # Detect intent từ response
        intent = self._detect_intent(message, reply)
        action = self._suggest_action(intent, message)

        return {
            "reply": reply,
            "conversation_id": conv_key,
            "intent": intent,
            "action": action,
        }

    async def get_history(self, user_id: str, limit: int = 20) -> list:
        """Lấy N tin nhắn gần nhất."""
        history = self._histories.get(user_id, [])
        return history[-limit:]

    async def clear_history(self, user_id: str):
        """Xóa lịch sử hội thoại."""
        self._histories.pop(user_id, None)

    def _format_health_context(self, context: Optional[dict]) -> str:
        """Chuyển health data dict thành text cho system prompt."""
        if not context:
            return "No current health data available."
        lines = []
        if "heart_rate" in context:
            lines.append(f"- Heart rate: {context['heart_rate']} bpm")
        if "blood_pressure" in context:
            lines.append(f"- Blood pressure: {context['blood_pressure']}")
        if "medications_due" in context:
            lines.append(f"- Medications due today: {', '.join(context['medications_due'])}")
        if "last_fall" in context:
            lines.append(f"- Last fall detected: {context['last_fall']}")
        return "\n".join(lines) if lines else "Health data unavailable."

    def _detect_intent(self, message: str, reply: str) -> str:
        """Rule-based intent detection"""
        msg = message.lower()
        if any(w in msg for w in ["medication", "pill", "dose"]):
            return "medication"
        if any(w in msg for w in ["pain", "fall", "ngã", "help", "emergency"]):
            return "emergency"
        if any(w in msg for w in ["lonely", "miss"]):
            return "social"
        if any(w in msg for w in ["exercise", "walk"]):
            return "activity"
        if any(w in msg for w in ["reminder", "appointment"]):
            return "reminder"
        if any(w in msg for w in ["health", "feeling", "symptom"]):
            return "health"
        return "chat"

    def _suggest_action(self, intent: str, message: str) -> Optional[dict]:
        """Đề xuất action cho frontend thực hiện."""
        if intent == "medication":
            return {"type": "show_medications"}
        if intent == "emergency":
            return {"type": "show_emergency", "auto_alert": True}
        if intent == "reminder":
            return {"type": "show_reminders"}
        return None
