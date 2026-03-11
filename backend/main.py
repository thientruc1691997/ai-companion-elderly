# ============================================================
#  main.py  —  FastAPI Entry Point
#  Khởi động server, đăng ký tất cả routers, cấu hình CORS
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from routers import chat, vision, medications, dashboard, emergency
from models.vision_model import VisionModel
from models.health_tracker import init_db


# ── Lifespan: chạy khi server start / stop ──────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: load models, khởi tạo database
    print("🚀 Starting CareCompanion AI server...")
    await init_db()                    # tạo bảng SQLite nếu chưa có
    app.state.vision_model = VisionModel()   # load YOLOv8 + MediaPipe một lần
    print("✅ Models loaded. Server ready.")
    yield
    # SHUTDOWN: giải phóng tài nguyên
    print("🛑 Shutting down server...")
    app.state.vision_model.release()


# ── Khởi tạo app ────────────────────────────────────────────
app = FastAPI(
    title="CareCompanion AI",
    description="AI-powered elderly care assistant — Chat, Vision, Health Tracking",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS: cho phép frontend React gọi API ───────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Đăng ký routers ─────────────────────────────────────────
app.include_router(dashboard.router,   prefix="/api/dashboard",   tags=["Dashboard"])
app.include_router(chat.router,        prefix="/api/chat",         tags=["AI Companion"])
app.include_router(vision.router,      prefix="/api/vision",       tags=["Computer Vision"])
app.include_router(medications.router, prefix="/api/medications",  tags=["Medications"])
app.include_router(emergency.router,   prefix="/api/emergency",    tags=["Emergency"])


# ── Health check endpoint ────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "ok", "message": "CareCompanion AI is running "}


# ── Chạy trực tiếp bằng: python main.py ─────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
