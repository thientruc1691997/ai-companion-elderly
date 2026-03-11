# ============================================================
#  routers/emergency.py  —  Emergency Alert API
#  Gửi alert cho gia đình, caregiver, hoặc gọi 112
# ============================================================

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────
class EmergencyAlert(BaseModel):
    user_id: str = "dorothy"
    type: str                        # "fall" | "manual" | "inactivity" | "vitals"
    severity: str = "high"           # "low" | "medium" | "high" | "critical"
    message: Optional[str] = None
    location: Optional[str] = None   # phòng đang ở (từ vision)
    auto_detected: bool = False      # AI tự phát hiện hay user bấm nút


# ── POST /api/emergency/alert ────────────────────────────────
@router.post("/alert")
async def send_alert(alert: EmergencyAlert, background_tasks: BackgroundTasks):
    """
    Kích hoạt emergency alert:
    1. Lưu log vào database
    2. Gửi notification cho Susan (con gái) + Nurse Linda
    3. Nếu severity = critical → tự động gọi 112

    BackgroundTasks: gửi notification không block response
    → Dorothy nhận phản hồi ngay lập tức
    """
    timestamp = datetime.now().isoformat()

    # Chạy nền: gửi SMS/push notification
    background_tasks.add_task(notify_contacts, alert, timestamp)

    if alert.severity == "critical":
        background_tasks.add_task(call_emergency_services, alert)

    return {
        "status": "alert_sent",
        "timestamp": timestamp,
        "notified": ["Susan Johnson", "Nurse Linda Park"],
        "message": "Help is on the way, Dorothy. Stay calm. 💛",
    }


# ── GET /api/emergency/contacts ──────────────────────────────
@router.get("/contacts")
async def get_contacts(user_id: str = "dorothy"):
    """Danh sách liên hệ khẩn cấp."""
    # TODO: lấy từ database
    return {
        "contacts": [
            {"name": "Susan Johnson",   "role": "Daughter",     "phone": "+1-555-234-5678", "priority": 1},
            {"name": "Dr. Martinez",    "role": "Physician",    "phone": "+1-555-901-2345", "priority": 2},
            {"name": "Nurse Linda Park","role": "Home Nurse",   "phone": "+1-555-345-6789", "priority": 3},
            {"name": "Emergency 112",   "role": "Emergency",    "phone": "112",              "priority": 4},
        ]
    }


# ── GET /api/emergency/log ───────────────────────────────────
@router.get("/log")
async def get_emergency_log(user_id: str = "dorothy", limit: int = 10):
    """Lịch sử các lần alert (để bác sĩ review)."""
    # TODO: lấy từ database
    return {"log": [], "total": 0}


# ── Background tasks (internal) ──────────────────────────────
async def notify_contacts(alert: EmergencyAlert, timestamp: str):
    """
    Gửi SMS / Push notification cho contacts.
    TODO: tích hợp Twilio SMS hoặc Firebase Push Notification.
    """
    print(f"📱 [NOTIFY] Sending alert to contacts at {timestamp}")
    print(f"   Type: {alert.type} | Severity: {alert.severity}")
    # twilio_client.messages.create(...)


async def call_emergency_services(alert: EmergencyAlert):
    """
    Tự động gọi 112 khi phát hiện ngã nghiêm trọng.
    TODO: tích hợp Twilio Programmable Voice.
    """
    print(f"🚨 [CRITICAL] Auto-calling emergency services for {alert.user_id}")
    # twilio_client.calls.create(...)
