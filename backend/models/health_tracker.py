# ============================================================
#  models/health_tracker.py  —  Health Data Tracker
#  SQLite database: vitals, medications, alerts, timeline
# ============================================================

import aiosqlite
from datetime import datetime, date
from typing import Optional
import json

DB_PATH = "carecompanion.db"


async def init_db():
    """Tạo tất cả bảng khi server khởi động lần đầu."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            -- Chỉ số sức khỏe (heart rate, BP, temperature...)
            CREATE TABLE IF NOT EXISTS vitals (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     TEXT NOT NULL,
                recorded_at TEXT NOT NULL,
                heart_rate  REAL,
                bp_systolic INTEGER,
                bp_diastolic INTEGER,
                temperature REAL,
                oxygen_sat  INTEGER,
                steps       INTEGER,
                sleep_hours REAL
            );

            -- Danh sách thuốc
            CREATE TABLE IF NOT EXISTS medications (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     TEXT NOT NULL,
                name        TEXT NOT NULL,
                dose        TEXT,
                times       TEXT,   -- JSON array: ["08:00", "20:00"]
                purpose     TEXT,
                stock       INTEGER DEFAULT 0,
                refill_at   INTEGER DEFAULT 14,
                active      INTEGER DEFAULT 1
            );

            -- Log uống thuốc
            CREATE TABLE IF NOT EXISTS dose_logs (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id         TEXT NOT NULL,
                medication_id   INTEGER,
                scheduled_time  TEXT,
                taken           INTEGER DEFAULT 0,
                taken_at        TEXT,
                log_date        TEXT NOT NULL    -- YYYY-MM-DD
            );

            -- Activity timeline
            CREATE TABLE IF NOT EXISTS activity_log (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     TEXT NOT NULL,
                timestamp   TEXT NOT NULL,
                event_type  TEXT,   -- "wake", "meal", "walk", "medication", "rest"
                description TEXT,
                icon        TEXT
            );

            -- Cảnh báo
            CREATE TABLE IF NOT EXISTS alerts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                type        TEXT,   -- "medication", "fall", "vitals", "inactivity"
                severity    TEXT,   -- "low" | "medium" | "high"
                message     TEXT,
                resolved    INTEGER DEFAULT 0
            );
        """)
        await db.commit()
    print("✅ Database initialized")


class HealthTracker:

    # ── VITALS ───────────────────────────────────────────────
    async def save_vitals(self, user_id: str, vitals: dict) -> dict:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                """INSERT INTO vitals
                   (user_id, recorded_at, heart_rate, bp_systolic, bp_diastolic,
                    temperature, oxygen_sat, steps, sleep_hours)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    user_id,
                    datetime.now().isoformat(),
                    vitals.get("heart_rate"),
                    vitals.get("bp_systolic"),
                    vitals.get("bp_diastolic"),
                    vitals.get("temperature"),
                    vitals.get("oxygen_sat"),
                    vitals.get("steps"),
                    vitals.get("sleep_hours"),
                )
            )
            await db.commit()
        return {"status": "saved", **vitals}

    # ── MEDICATIONS ──────────────────────────────────────────
    async def get_medications(self, user_id: str) -> list:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM medications WHERE user_id=? AND active=1", (user_id,)
            ) as cursor:
                rows = await cursor.fetchall()
                result = []
                for row in rows:
                    med = dict(row)
                    med["times"] = json.loads(med["times"] or "[]")
                    result.append(med)
                return result

    async def add_medication(self, user_id: str, med: dict) -> dict:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                """INSERT INTO medications (user_id, name, dose, times, purpose, stock)
                   VALUES (?,?,?,?,?,?)""",
                (
                    user_id,
                    med["name"],
                    med.get("dose", ""),
                    json.dumps(med.get("times", [])),
                    med.get("purpose", ""),
                    med.get("stock", 30),
                )
            )
            await db.commit()
        return med

    async def log_dose(self, user_id: str, dose: dict) -> dict:
        """Ghi lại việc uống thuốc, giảm stock đi 1."""
        today = date.today().isoformat()
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                """INSERT INTO dose_logs
                   (user_id, medication_id, scheduled_time, taken, taken_at, log_date)
                   VALUES (?,?,?,?,?,?)""",
                (
                    user_id,
                    dose["medication_id"],
                    dose["scheduled_time"],
                    1 if dose.get("taken") else 0,
                    datetime.now().isoformat(),
                    today,
                )
            )
            # Giảm stock
            if dose.get("taken"):
                await db.execute(
                    "UPDATE medications SET stock = stock - 1 WHERE id=?",
                    (dose["medication_id"],)
                )
            await db.commit()
        return dose

    async def get_today_schedule(self, user_id: str) -> list:
        """So sánh medications với dose_logs để biết hôm nay uống chưa."""
        today = date.today().isoformat()
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """SELECT m.*, dl.taken, dl.taken_at
                   FROM medications m
                   LEFT JOIN dose_logs dl ON dl.medication_id = m.id
                     AND dl.log_date = ?
                   WHERE m.user_id = ? AND m.active = 1""",
                (today, user_id)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]

    async def get_adherence(self, user_id: str, days: int) -> list:
        """Tỉ lệ uống đúng giờ theo ngày."""
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """SELECT log_date,
                          SUM(taken) as taken_count,
                          COUNT(*) as total_count
                   FROM dose_logs
                   WHERE user_id = ?
                   GROUP BY log_date
                   ORDER BY log_date DESC
                   LIMIT ?""",
                (user_id, days)
            ) as cursor:
                rows = await cursor.fetchall()
                return [
                    {
                        "date": r["log_date"],
                        "taken": r["taken_count"],
                        "total": r["total_count"],
                        "rate": round(r["taken_count"] / max(r["total_count"], 1), 2),
                    }
                    for r in rows
                ]

    async def get_refill_alerts(self, user_id: str) -> list:
        """Thuốc sắp hết (stock <= refill_at)."""
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM medications WHERE user_id=? AND stock <= refill_at AND active=1",
                (user_id,)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]

    # ── ACTIVITY TIMELINE ────────────────────────────────────
    async def get_daily_timeline(self, user_id: str, date_str: str) -> list:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """SELECT * FROM activity_log
                   WHERE user_id=? AND timestamp LIKE ?
                   ORDER BY timestamp ASC""",
                (user_id, f"{date_str}%")
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]

    # ── ALERTS ───────────────────────────────────────────────
    async def get_active_alerts(self, user_id: str) -> list:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """SELECT * FROM alerts
                   WHERE user_id=? AND resolved=0
                   ORDER BY created_at DESC LIMIT 10""",
                (user_id,)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]
