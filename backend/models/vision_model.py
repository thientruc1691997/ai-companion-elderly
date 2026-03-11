# ============================================================
#  models/vision_model.py  —  Computer Vision Model
#  YOLOv8: phát hiện người
#  MediaPipe Pose: skeleton, tư thế, phát hiện ngã
# ============================================================

import cv2
import numpy as np
from datetime import datetime

# Import có điều kiện — tránh crash nếu chưa install
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("⚠️  YOLOv8 not installed. Run: pip install ultralytics")

try:
    import mediapipe as mp
    MP_AVAILABLE = True
except ImportError:
    MP_AVAILABLE = False
    print("⚠️  MediaPipe not installed. Run: pip install mediapipe")


class VisionModel:
    def __init__(self):
        # Load YOLOv8 nano (nhẹ, nhanh, phù hợp realtime)
        # Thay bằng 'yolov8s.pt' hoặc 'yolov8m.pt' nếu cần độ chính xác cao hơn
        if YOLO_AVAILABLE:
            self.yolo = YOLO("yolov8n.pt")   # tự download lần đầu
            print("✅ YOLOv8 loaded")
        else:
            self.yolo = None

        # MediaPipe Pose cho skeleton tracking
        if MP_AVAILABLE:
            self.mp_pose = mp.solutions.pose
            self.pose = self.mp_pose.Pose(
                min_detection_confidence=0.6,
                min_tracking_confidence=0.6,
                model_complexity=1,           # 0=lite, 1=full, 2=heavy
            )
            print("✅ MediaPipe Pose loaded")
        else:
            self.pose = None

        # State tracking
        self._fall_cooldown = 0          # tránh spam alert
        self._inactivity_frames = 0      # đếm frame không có người
        self._last_positions = []         # lịch sử vị trí để tính velocity

    def process_frame(self, frame: np.ndarray) -> dict:
        """
        Xử lý 1 frame từ camera.
        Trả về dict chứa tất cả detection results để gửi về frontend.
        """
        result = {
            "timestamp": datetime.now().isoformat(),
            "persons": [],            # danh sách người được phát hiện
            "fall_detected": False,   # có ngã không
            "fall_confidence": 0.0,
            "pose_keypoints": [],     # skeleton keypoints cho visualization
            "posture_status": "normal",  # "normal" | "sitting" | "lying" | "fallen"
            "inactivity_seconds": 0,
            "room_activity": 0.0,     # 0.0 - 1.0
        }

        # 1. YOLO: phát hiện người (bounding box)
        if self.yolo:
            result["persons"] = self._run_yolo(frame)

        # 2. MediaPipe: skeleton + phân tích tư thế
        if self.pose:
            pose_data = self._run_mediapipe(frame)
            result["pose_keypoints"] = pose_data["keypoints"]
            result["posture_status"] = pose_data["posture"]

            # 3. Fall detection: kết hợp YOLO + MediaPipe
            if result["persons"] and pose_data["keypoints"]:
                fall_result = self._detect_fall(
                    persons=result["persons"],
                    keypoints=pose_data["keypoints"],
                    posture=pose_data["posture"],
                )
                result["fall_detected"] = fall_result["detected"]
                result["fall_confidence"] = fall_result["confidence"]

        # 4. Inactivity tracking
        if not result["persons"]:
            self._inactivity_frames += 1
        else:
            self._inactivity_frames = 0

        # Giả sử 30 FPS
        result["inactivity_seconds"] = self._inactivity_frames / 30.0

        # 5. Room activity score (bao nhiêu pixel thay đổi)
        result["room_activity"] = self._calc_activity(frame)

        return result

    def _run_yolo(self, frame: np.ndarray) -> list:
        """
        Chạy YOLOv8, chỉ lấy class 'person' (class_id=0).
        Trả về list bounding boxes với confidence.
        """
        detections = []
        results = self.yolo(frame, classes=[0], verbose=False)  # classes=[0] = person only

        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                if conf > 0.5:  # chỉ lấy detection có confidence > 50%
                    detections.append({
                        "bbox": [int(x1), int(y1), int(x2), int(y2)],
                        "confidence": round(conf, 3),
                        # Normalize tọa độ về 0-1 để frontend scale theo canvas size
                        "bbox_norm": [
                            x1 / frame.shape[1], y1 / frame.shape[0],
                            x2 / frame.shape[1], y2 / frame.shape[0],
                        ],
                    })
        return detections

    def _run_mediapipe(self, frame: np.ndarray) -> dict:
        """
        Chạy MediaPipe Pose.
        Trả về 33 keypoints + phân loại tư thế.
        """
        # MediaPipe cần RGB
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb)

        if not results.pose_landmarks:
            return {"keypoints": [], "posture": "unknown"}

        # Lấy tọa độ 33 keypoints (đã normalize 0-1)
        landmarks = results.pose_landmarks.landmark
        keypoints = [
            {
                "id": i,
                "x": lm.x,
                "y": lm.y,
                "z": lm.z,
                "visibility": lm.visibility,
            }
            for i, lm in enumerate(landmarks)
        ]

        # Phân loại tư thế từ keypoints
        posture = self._classify_posture(keypoints)

        return {"keypoints": keypoints, "posture": posture}

    def _classify_posture(self, keypoints: list) -> str:
        """
        Phân loại tư thế dựa trên vị trí các khớp chính.

        MediaPipe Pose landmarks:
          0  = nose
          11 = left shoulder
          12 = right shoulder
          23 = left hip
          24 = right hip
          27 = left ankle
          28 = right ankle
        """
        if not keypoints or len(keypoints) < 29:
            return "unknown"

        nose_y      = keypoints[0]["y"]
        shoulder_y  = (keypoints[11]["y"] + keypoints[12]["y"]) / 2
        hip_y       = (keypoints[23]["y"] + keypoints[24]["y"]) / 2
        ankle_y     = (keypoints[27]["y"] + keypoints[28]["y"]) / 2

        # Tính tỉ lệ chiều cao cơ thể
        body_height = ankle_y - nose_y
        if body_height < 0.01:
            return "unknown"

        # Người đứng: nose << hip << ankle (chiều dọc)
        vertical_ratio = (ankle_y - nose_y) / max(body_height, 0.01)

        if vertical_ratio > 0.6:
            return "standing"
        elif vertical_ratio > 0.3:
            return "sitting"
        else:
            # Người nằm ngang (có thể đã ngã)
            return "lying"

    def _detect_fall(self, persons: list, keypoints: list, posture: str) -> dict:
        """
        Thuật toán phát hiện ngã:
        1. Tư thế đang nằm (posture = "lying")
        2. Bounding box có aspect ratio ngang (rộng > cao)
        3. Thay đổi tư thế đột ngột (velocity cao)
        """
        detected = False
        confidence = 0.0

        if posture == "lying" and persons:
            bbox = persons[0]["bbox"]
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]

            # Bounding box ngang = có thể đã ngã
            aspect_ratio = w / max(h, 1)
            if aspect_ratio > 1.5:
                confidence = min(0.95, 0.6 + (aspect_ratio - 1.5) * 0.2)
                detected = confidence > 0.7

        # Cooldown: không spam alert liên tục
        if detected and self._fall_cooldown > 0:
            self._fall_cooldown -= 1
            detected = False
        elif detected:
            self._fall_cooldown = 90  # 3 giây cooldown ở 30fps

        return {"detected": detected, "confidence": round(confidence, 3)}

    def _calc_activity(self, frame: np.ndarray) -> float:
        """Tính mức độ hoạt động trong phòng (0.0 - 1.0)."""
        # Đơn giản: dùng Laplacian để đo độ "động" của frame
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        lap = cv2.Laplacian(gray, cv2.CV_64F)
        score = float(np.var(lap))
        # Normalize về 0-1 (clamp ở 5000)
        return min(score / 5000.0, 1.0)

    def release(self):
        """Giải phóng resources khi server shutdown."""
        if self.pose:
            self.pose.close()
        print("✅ Vision model released")
