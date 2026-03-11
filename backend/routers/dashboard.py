# ============================================================
#  routers/dashboard.py  —  Health Metrics Dashboard API
#  Tổng hợp dữ liệu sức khỏe, activity log, alerts
# ============================================================

from fastapi import APIRouter
from models.health_tracker import HealthTracker
from datetime import datetime

router = APIRouter()
tracker = HealthTracker()


# ── GET /api/dashboard/overview ─────────────────────────────
@router.get("/overview")
async def get_overview(user_id: str = "dorothy"):
    """
    Tổng hợp tất cả chỉ số sức khỏe cho màn hình Dashboard.
    Frontend gọi endpoint này khi load tab Dashboard.
    """
    return {
        "user": {"name": "Dorothy Johnson", "age": 78},
        "vitals": {
            "heart_rate":     {"value": 72,    "unit": "bpm",   "status": "normal"},
            "blood_pressure": {"value": "128/82", "unit": "mmHg", "status": "elevated"},
            "temperature":    {"value": 98.4,  "unit": "°F",    "status": "normal"},
            "oxygen_sat":     {"value": 97,    "unit": "%",     "status": "normal"},
        },
        "activity": {
            "steps":      {"value": 2341, "goal": 3000},
            "sleep_hours": {"value": 7.2, "quality": "good"},
            "active_min":  {"value": 34},
        },
        "medications_today": {
            "taken": 2,
            "total": 3,
            "next_due": "Lisinopril 10mg at 8:00 PM",
        },
        "last_updated": datetime.now().isoformat(),
    }


# ── GET /api/dashboard/alerts ────────────────────────────────
@router.get("/alerts")
async def get_alerts(user_id: str = "dorothy"):
    """Các cảnh báo cần chú ý hôm nay."""
    alerts = await tracker.get_active_alerts(user_id)
    return {"alerts": alerts}


# ── GET /api/dashboard/timeline ─────────────────────────────
@router.get("/timeline")
async def get_timeline(user_id: str = "dorothy", date: str = None):
    """
    Activity timeline trong ngày:
    thức dậy, ăn sáng, đi bộ, uống thuốc...
    """
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    timeline = await tracker.get_daily_timeline(user_id, date)
    return {"timeline": timeline, "date": date}


# ── POST /api/dashboard/vitals ───────────────────────────────
@router.post("/vitals")
async def update_vitals(user_id: str = "dorothy", vitals: dict = {}):
    """
    Cập nhật chỉ số sức khỏe mới (từ thiết bị đeo tay,
    máy đo huyết áp kết nối Bluetooth, v.v.)
    """
    result = await tracker.save_vitals(user_id, vitals)
    return {"status": "saved", "record": result}
