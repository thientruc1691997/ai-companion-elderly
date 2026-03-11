# ============================================================
#  routers/medications.py  —  Medication Tracking API
#  CRUD thuốc, đánh dấu đã uống, nhắc nhở, lịch sử adherence
# ============================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from models.health_tracker import HealthTracker

router = APIRouter()
tracker = HealthTracker()


# ── Schemas ──────────────────────────────────────────────────
class Medication(BaseModel):
    id: Optional[int] = None
    name: str                        # tên thuốc, vd: "Metformin"
    dose: str                        # liều lượng, vd: "500mg"
    times: List[str]                 # giờ uống, vd: ["08:00", "20:00"]
    purpose: str                     # mục đích, vd: "Type 2 Diabetes"
    stock: int                       # số viên còn lại
    refill_threshold: int = 14       # cảnh báo khi còn bao nhiêu viên


class DoseLog(BaseModel):
    medication_id: int
    scheduled_time: str              # giờ dự kiến uống
    taken: bool = True
    taken_at: Optional[str] = None   # giờ thực tế uống


# ── GET /api/medications/ ────────────────────────────────────
@router.get("/")
async def get_medications(user_id: str = "dorothy"):
    """Lấy danh sách tất cả thuốc của người dùng."""
    meds = await tracker.get_medications(user_id)
    return {"medications": meds}


# ── POST /api/medications/ ───────────────────────────────────
@router.post("/")
async def add_medication(med: Medication, user_id: str = "dorothy"):
    """Thêm thuốc mới vào danh sách."""
    result = await tracker.add_medication(user_id, med.dict())
    return {"status": "added", "medication": result}


# ── POST /api/medications/log ────────────────────────────────
@router.post("/log")
async def log_dose(dose: DoseLog, user_id: str = "dorothy"):
    """
    Dorothy xác nhận đã uống thuốc.
    Cập nhật adherence record và giảm stock.
    """
    result = await tracker.log_dose(user_id, dose.dict())
    return {"status": "logged", "record": result}


# ── GET /api/medications/today ───────────────────────────────
@router.get("/today")
async def get_today_schedule(user_id: str = "dorothy"):
    """
    Lịch uống thuốc hôm nay: đã uống, chưa uống, bỏ lỡ.
    Frontend dùng endpoint này để hiển thị status pills.
    """
    schedule = await tracker.get_today_schedule(user_id)
    return {"schedule": schedule, "date": datetime.now().strftime("%Y-%m-%d")}


# ── GET /api/medications/adherence ──────────────────────────
@router.get("/adherence")
async def get_adherence(user_id: str = "dorothy", days: int = 7):
    """Tỉ lệ uống thuốc đúng giờ trong N ngày qua (cho biểu đồ)."""
    data = await tracker.get_adherence(user_id, days)
    return {"adherence": data, "period_days": days}


# ── GET /api/medications/refills ────────────────────────────
@router.get("/refills")
async def get_refill_alerts(user_id: str = "dorothy"):
    """Danh sách thuốc sắp hết, cần mua thêm."""
    alerts = await tracker.get_refill_alerts(user_id)
    return {"alerts": alerts}
