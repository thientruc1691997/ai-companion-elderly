# ============================================================
#  routers/vision.py  —  Computer Vision API
#  WebSocket stream camera, detect fall, track movement
# ============================================================

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Request
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import base64
import json

router = APIRouter()


# ── WebSocket /api/vision/stream ─────────────────────────────
@router.websocket("/stream")
async def camera_stream(websocket: WebSocket, request: Request):
    """
    Frontend gửi frame ảnh base64 qua WebSocket.
    Backend xử lý YOLOv8 + MediaPipe, trả về kết quả detection.

    Flow:
      Frontend → gửi frame (base64 JPEG)
      Backend  → chạy model → trả về JSON {detections, fall_detected, pose_keypoints}
      Frontend → vẽ bounding box lên canvas
    """
    await websocket.accept()
    vision_model = request.app.state.vision_model

    try:
        while True:
            # Nhận frame từ frontend
            data = await websocket.receive_text()
            payload = json.loads(data)

            # Decode base64 → numpy array
            img_bytes = base64.b64decode(payload["frame"])
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            # Chạy inference
            result = vision_model.process_frame(frame)

            # Gửi kết quả về frontend
            await websocket.send_json(result)

    except WebSocketDisconnect:
        print("Camera stream disconnected")
    except Exception as e:
        print(f"Vision stream error: {e}")
        await websocket.close()


# ── POST /api/vision/analyze ─────────────────────────────────
@router.post("/analyze")
async def analyze_image(request: Request, file: UploadFile = File(...)):
    """
    Upload một ảnh tĩnh để phân tích (test / debug).
    Trả về detection results dạng JSON.
    """
    vision_model = request.app.state.vision_model

    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    result = vision_model.process_frame(frame)
    return JSONResponse(content=result)


# ── GET /api/vision/events ───────────────────────────────────
@router.get("/events")
async def get_events(user_id: str = "dorothy", limit: int = 50):
    """
    Lấy danh sách sự kiện vision đã lưu:
    - Phát hiện ngã
    - Bất thường tư thế
    - Thời gian không hoạt động
    """
    # TODO: đọc từ database
    # Tạm thời trả về mock data
    events = [
        {"time": "14:52", "type": "NORMAL", "desc": "Dorothy sitting in armchair, reading"},
        {"time": "11:05", "type": "REVIEW", "desc": "Slight imbalance detected near stairs"},
        {"time": "09:28", "type": "NORMAL", "desc": "Morning walk — 22 minutes outdoor"},
    ]
    return {"events": events}


# ── GET /api/vision/status ───────────────────────────────────
@router.get("/status")
async def get_status(request: Request):
    """Trạng thái hiện tại: fall risk, activity, last motion."""
    # TODO: lấy từ in-memory state của vision_model
    return {
        "posture": "normal",
        "fall_risk_score": 2,
        "last_motion_seconds": 240,
        "active_room": "living_room",
    }
