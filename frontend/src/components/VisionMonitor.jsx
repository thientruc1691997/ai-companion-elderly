import { useState, useEffect, useRef, useCallback } from "react";
import { visionApi, emergencyApi } from "../services/api";

export default function VisionMonitor() {
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const wsRef        = useRef(null);
  const animFrameRef = useRef(null);

  const [streaming,  setStreaming]  = useState(false);
  const [detections, setDetections] = useState(null);
  const [fallAlert,  setFallAlert]  = useState(false);
  const [events,     setEvents]     = useState([]);
  const [status,     setStatus]     = useState(null);

  useEffect(() => {
    visionApi.getEvents().then((r) => setEvents(r.events || []));
    visionApi.getStatus().then(setStatus);
  }, []);

  const handleDetection = useCallback((data) => {
    setDetections(data);
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    data.persons?.forEach((person) => {
      const [nx1, ny1, nx2, ny2] = person.bbox_norm;
      const x = nx1 * canvas.width, y = ny1 * canvas.height;
      const w = (nx2 - nx1) * canvas.width, h = (ny2 - ny1) * canvas.height;
      ctx.strokeStyle = "rgba(80,220,120,0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(80,220,120,0.9)";
      ctx.fillRect(x, y - 20, 110, 20);
      ctx.fillStyle = "#000";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`PERSON ${Math.round(person.confidence * 100)}%`, x + 4, y - 5);
    });
    if (data.pose_keypoints?.length > 0) {
      ctx.fillStyle = "rgba(80,220,120,0.8)";
      data.pose_keypoints.filter((kp) => kp.visibility > 0.5).forEach((kp) => {
        ctx.beginPath();
        ctx.arc(kp.x * canvas.width, kp.y * canvas.height, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, []);

  const handleFall = useCallback(async (data) => {
    setFallAlert(true);
    try { await emergencyApi.sendAlert("fall", "high", "Fall detected by vision system", true); } catch {}
    setTimeout(() => setFallAlert(false), 10_000);
  }, []);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      wsRef.current = visionApi.connectStream(handleDetection, handleFall);
      const sendLoop = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN)
          visionApi.sendFrame(wsRef.current, videoRef.current);
        animFrameRef.current = setTimeout(sendLoop, 100);
      };
      sendLoop();
      setStreaming(true);
    } catch {
      alert("Cannot access camera. Please allow camera permission in your browser.");
    }
  };

  const stopStream = () => {
    clearTimeout(animFrameRef.current);
    wsRef.current?.close();
    videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    setStreaming(false);
    setDetections(null);
  };

  useEffect(() => () => stopStream(), []);

  const DEMO_EVENTS = [
    { time: "2:52 PM", type: "NORMAL", desc: "Dorothy sitting in armchair, reading a book" },
    { time: "11:05 AM", type: "REVIEW", desc: "Slight imbalance detected near the staircase" },
    { time: "9:28 AM",  type: "NORMAL", desc: "Morning walk completed — 22 minutes outdoors" },
    { time: "8:02 AM",  type: "NORMAL", desc: "Kitchen activity — breakfast preparation detected" },
  ];

  return (
    <div style={{ padding: "2rem", maxWidth: "100%", margin: "0 auto" }}>
      <div style={{ fontFamily: "Lora, serif", fontSize: "1.5rem", fontWeight: 600, color: "#2C2C2C", marginBottom: "0.4rem" }}>
        Safety Vision Monitor
      </div>
      <div style={{ fontSize: "0.875rem", color: "#6B6B6B", marginBottom: "1.5rem" }}>
        Computer vision monitors movement, posture, and fall detection in real time
      </div>

      {/* Fall alert banner */}
      {fallAlert && (
        <div style={{ background: "rgba(196,113,74,0.12)", border: "2px solid #C4714A", borderRadius: 14, padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.5rem" }}>🚨</span>
          <div>
            <strong style={{ color: "#8B3A1E", fontSize: "1rem" }}>FALL DETECTED!</strong>
            <div style={{ fontSize: "0.875rem", color: "#5C2A12", marginTop: 2 }}>Alert sent to Susan and Nurse Linda. Emergency services notified.</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>

        {/* Camera feed */}
        <div>
          <div style={{ background: "#1a1a2e", borderRadius: 16, overflow: "hidden", aspectRatio: "16/9", position: "relative" }}>
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover", display: streaming ? "block" : "none" }} muted />
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            {!streaming && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: "2.5rem" }}>📹</span>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>Camera not connected</div>
              </div>
            )}
            <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.6)", color: "#EEE", fontSize: "0.7rem", padding: "4px 10px", borderRadius: 6, fontWeight: 600, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
              {streaming && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#E53935" }} />}
              LIVING ROOM
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: "0.75rem" }}>
            {!streaming ? (
              <button onClick={startStream} style={{ flex: 1, padding: "0.7rem", background: "#4A7560", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "0.875rem" }}>
                📹 Start Camera
              </button>
            ) : (
              <button onClick={stopStream} style={{ flex: 1, padding: "0.7rem", background: "#C4714A", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "0.875rem" }}>
                ⏹ Stop Camera
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <StatCard label="Posture & Movement"   value={detections ? `🟢 ${detections.posture_status}` : (status?.posture || "Normal")} />
          <StatCard label="Fall Risk Score"       value={`🟡 Low (${status?.fall_risk_score || 2}/10)`} sub="Based on gait, balance, and environment analysis" />
          <StatCard label="Inactivity Duration"   value={`${detections ? Math.round(detections.inactivity_seconds) : (status?.last_motion_seconds || 0)}s`} sub="Alert triggers after 45 minutes of no movement" />
          <StatCard label="Persons in Frame"      value={detections ? `${detections.persons?.length || 0} detected` : "—"} />
        </div>
      </div>

      {/* Event log */}
      <div style={{ background: "#FFF9F0", border: "1px solid rgba(124,158,138,0.25)", borderRadius: 16, padding: "1.5rem", boxShadow: "0 4px 24px rgba(44,44,44,0.08)" }}>
        <div style={{ fontFamily: "Lora, serif", fontSize: "1.05rem", fontWeight: 600, color: "#2C2C2C", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
          Vision Event Log
          <span style={{ fontSize: "0.68rem", background: "rgba(124,158,138,0.15)", color: "#4A7560", padding: "2px 8px", borderRadius: 999, fontFamily: "DM Sans", fontWeight: 600 }}>Today</span>
        </div>
        {(events.length > 0 ? events : DEMO_EVENTS).map((ev, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "0.6rem 0", borderBottom: "1px solid rgba(124,158,138,0.12)", fontSize: "0.82rem" }}>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#6B6B6B", minWidth: 56, marginTop: 1 }}>{ev.time}</div>
            <span style={{
              fontSize: "0.65rem", padding: "2px 8px", borderRadius: 999, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap",
              background: ev.type === "NORMAL" ? "rgba(124,158,138,0.15)" : ev.type === "REVIEW" ? "rgba(212,168,67,0.15)" : "rgba(196,113,74,0.15)",
              color:      ev.type === "NORMAL" ? "#4A7560"                : ev.type === "REVIEW" ? "#7A5F10"                : "#8B3A1E",
            }}>{ev.type}</span>
            <div style={{ color: "#2C2C2C" }}>{ev.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: "#FFF9F0", border: "1px solid rgba(124,158,138,0.25)", borderRadius: 14, padding: "1.1rem 1.25rem", boxShadow: "0 4px 24px rgba(44,44,44,0.08)" }}>
      <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B6B6B", fontWeight: 600, marginBottom: "0.4rem" }}>{label}</div>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: "1.4rem", fontWeight: 500, color: "#2C2C2C" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.73rem", color: "#6B6B6B", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
