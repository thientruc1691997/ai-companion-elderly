// ============================================================
//  services/api.js  —  Gọi Backend API
//  Tất cả fetch/WebSocket calls tập trung ở đây
//  → Dễ thay đổi base URL khi deploy
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const WS_URL   = import.meta.env.VITE_WS_URL  || "ws://localhost:8000/api";

// ── Helper: fetch với error handling ────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}


// ════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════
export const dashboardApi = {
  /** Lấy tổng hợp sức khỏe cho màn Dashboard */
  getOverview:  (userId = "dorothy") => apiFetch(`/dashboard/overview?user_id=${userId}`),
  getAlerts:    (userId = "dorothy") => apiFetch(`/dashboard/alerts?user_id=${userId}`),
  getTimeline:  (userId = "dorothy") => apiFetch(`/dashboard/timeline?user_id=${userId}`),

  /** Cập nhật vitals từ thiết bị đeo tay */
  updateVitals: (vitals, userId = "dorothy") =>
    apiFetch(`/dashboard/vitals?user_id=${userId}`, {
      method: "POST",
      body: JSON.stringify(vitals),
    }),
};


// ════════════════════════════════════════════════════════════
//  CHAT (AI Companion)
// ════════════════════════════════════════════════════════════
export const chatApi = {
  /**
   * Gửi tin nhắn text đến AI
   * @param {string} message   - tin nhắn của user
   * @param {object} context   - health context (optional)
   * @returns {Promise<{reply, intent, action}>}
   */
  sendMessage: (message, context = null) =>
    apiFetch("/chat/message", {
      method: "POST",
      body: JSON.stringify({
        message,
        user_id: "dorothy",
        context,
      }),
    }),

  getHistory: (userId = "dorothy") =>
    apiFetch(`/chat/history/${userId}`),

  clearHistory: (userId = "dorothy") =>
    apiFetch(`/chat/clear/${userId}`, { method: "POST" }),
};


// ════════════════════════════════════════════════════════════
//  VISION (Computer Vision)
// ════════════════════════════════════════════════════════════
export const visionApi = {
  getEvents: (userId = "dorothy") =>
    apiFetch(`/vision/events?user_id=${userId}`),

  getStatus: () =>
    apiFetch("/vision/status"),

  /**
   * WebSocket connection cho camera stream
   * @param {Function} onMessage  - callback nhận detection results
   * @param {Function} onFall     - callback khi phát hiện ngã
   * @returns {WebSocket}
   */
  connectStream: (onMessage, onFall) => {
    const ws = new WebSocket(`${WS_URL}/vision/stream`);

    ws.onopen = () => console.log("📹 Vision stream connected");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);

      // Tự động gọi onFall callback nếu phát hiện ngã
      if (data.fall_detected && data.fall_confidence > 0.7) {
        onFall(data);
      }
    };

    ws.onerror = (err) => console.error("Vision stream error:", err);
    ws.onclose = () => console.log("📹 Vision stream disconnected");

    return ws;
  },

  /**
   * Gửi 1 frame ảnh qua WebSocket (gọi trong requestAnimationFrame loop)
   * @param {WebSocket} ws
   * @param {HTMLVideoElement|HTMLCanvasElement} source
   */
  sendFrame: (ws, source) => {
    if (ws.readyState !== WebSocket.OPEN) return;

    // Capture frame từ video thành base64 JPEG
    const canvas = document.createElement("canvas");
    canvas.width  = source.videoWidth  || source.width  || 640;
    canvas.height = source.videoHeight || source.height || 480;
    canvas.getContext("2d").drawImage(source, 0, 0);

    const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
    ws.send(JSON.stringify({ frame: base64 }));
  },
};


// ════════════════════════════════════════════════════════════
//  MEDICATIONS
// ════════════════════════════════════════════════════════════
export const medicationApi = {
  getAll:       (userId = "dorothy") => apiFetch(`/medications/?user_id=${userId}`),
  getTodaySchedule: (userId = "dorothy") => apiFetch(`/medications/today?user_id=${userId}`),
  getAdherence: (userId = "dorothy", days = 7) =>
    apiFetch(`/medications/adherence?user_id=${userId}&days=${days}`),
  getRefillAlerts: (userId = "dorothy") => apiFetch(`/medications/refills?user_id=${userId}`),

  /** Dorothy xác nhận đã uống thuốc */
  logDose: (medicationId, scheduledTime, userId = "dorothy") =>
    apiFetch(`/medications/log?user_id=${userId}`, {
      method: "POST",
      body: JSON.stringify({ medication_id: medicationId, scheduled_time: scheduledTime }),
    }),
};


// ════════════════════════════════════════════════════════════
//  EMERGENCY
// ════════════════════════════════════════════════════════════
export const emergencyApi = {
  getContacts: (userId = "dorothy") =>
    apiFetch(`/emergency/contacts?user_id=${userId}`),

  /**
   * Kích hoạt emergency alert
   * @param {"fall"|"manual"|"inactivity"|"vitals"} type
   * @param {"low"|"medium"|"high"|"critical"} severity
   */
  sendAlert: (type, severity = "high", message = "", autoDetected = false) =>
    apiFetch("/emergency/alert", {
      method: "POST",
      body: JSON.stringify({
        user_id: "dorothy",
        type,
        severity,
        message,
        auto_detected: autoDetected,
      }),
    }),

  getLog: (userId = "dorothy") =>
    apiFetch(`/emergency/log?user_id=${userId}`),
};
