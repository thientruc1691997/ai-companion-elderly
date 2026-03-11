// ============================================================
//  components/Dashboard.jsx
//  Màn hình tổng quan sức khỏe — gọi /api/dashboard/overview
// ============================================================

import { useState, useEffect } from "react";
import { dashboardApi } from "../services/api";

export default function Dashboard() {
  const [data,     setData]     = useState(null);
  const [alerts,   setAlerts]   = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [overview, alertsRes, timelineRes] = await Promise.all([
          dashboardApi.getOverview(),
          dashboardApi.getAlerts(),
          dashboardApi.getTimeline(),
        ]);
        setData(overview);
        setAlerts(alertsRes.alerts || []);
        setTimeline(timelineRes.timeline || []);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
    // Refresh mỗi 60 giây
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{ padding: "2rem", color: "var(--soft-gray)" }}>Đang tải...</div>;
  if (!data) return <div style={{ padding: "2rem", color: "var(--soft-gray)" }}>Không thể tải dữ liệu</div>;

  const { vitals, activity, medications_today } = data;

  return (
    <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Greeting */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontFamily: "Lora, serif", fontSize: "1.5rem", fontWeight: 600 }}>
          Chào buổi sáng, Dorothy 🌤
        </div>
        <div style={{ fontSize: "0.875rem", color: "var(--soft-gray)", marginTop: 4 }}>
          {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <MetricCard label="Nhịp tim"       value={vitals.heart_rate.value}    unit="bpm"  status={vitals.heart_rate.status}   icon="❤️" />
        <MetricCard label="Huyết áp"       value={vitals.blood_pressure.value} unit="mmHg" status={vitals.blood_pressure.status} icon="🩸" />
        <MetricCard label="Số bước đi"     value={activity.steps.value.toLocaleString()} unit="bước" status="normal" icon="🚶" />
        <MetricCard label="Giấc ngủ"       value={activity.sleep_hours.value}  unit="giờ"  status={activity.sleep_hours.quality} icon="😴" />
        <MetricCard label="Thuốc hôm nay"  value={`${medications_today.taken}/${medications_today.total}`} status="normal" icon="💊" />
        <MetricCard label="Nhiệt độ"       value={vitals.temperature.value}    unit="°F"   status={vitals.temperature.status}   icon="🌡️" />
      </div>

      {/* Alerts + Timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <AlertsList alerts={alerts} />
        <Timeline items={timeline} />
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────
function MetricCard({ label, value, unit, status, icon }) {
  const accentColor = status === "normal" ? "var(--sage)"
    : status === "elevated" || status === "warn" ? "var(--gold)"
    : "var(--terracotta)";

  return (
    <div style={{
      background: "var(--warm-white)", border: "1px solid var(--border)", borderRadius: 16,
      padding: "1.5rem", position: "relative", overflow: "hidden",
      boxShadow: "var(--shadow)",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentColor, borderRadius: "16px 16px 0 0" }} />
      <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", fontSize: "1.5rem", opacity: 0.25 }}>{icon}</div>
      <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--soft-gray)", fontWeight: 600, marginBottom: "0.75rem" }}>{label}</div>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: "1.9rem", fontWeight: 500, lineHeight: 1 }}>
        {value}<span style={{ fontSize: "0.85rem", color: "var(--soft-gray)", marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

function AlertsList({ alerts }) {
  // fallback demo nếu DB chưa có data
  const demo = [
    { type: "warn", icon: "💊", title: "Nhắc thuốc buổi tối", desc: "Lisinopril 10mg lúc 8 giờ tối" },
    { type: "good", icon: "✅", title: "Hoàn thành buổi sáng", desc: "Bữa sáng, đi bộ và thuốc đã xong" },
    { type: "info", icon: "📅", title: "Cuộc hẹn với BS Martinez", desc: "Thứ 6, 13/3 lúc 10:30 SA — telehealth" },
  ];
  const list = alerts.length > 0 ? alerts : demo;

  return (
    <div style={{ background: "var(--warm-white)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", boxShadow: "var(--shadow)" }}>
      <div style={{ fontFamily: "Lora, serif", fontSize: "1.05rem", fontWeight: 600, marginBottom: "1rem" }}>Cảnh báo hôm nay</div>
      {list.map((a, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 12, padding: "0.875rem 1rem",
          borderRadius: 12, marginBottom: "0.75rem", border: "1px solid",
          background: a.type === "warn" ? "rgba(212,168,67,0.08)" : a.type === "good" ? "rgba(124,158,138,0.08)" : "rgba(91,141,184,0.06)",
          borderColor: a.type === "warn" ? "rgba(212,168,67,0.3)" : a.type === "good" ? "rgba(124,158,138,0.25)" : "rgba(91,141,184,0.2)",
          fontSize: "0.875rem",
        }}>
          <span>{a.icon}</span>
          <div><strong style={{ display: "block", marginBottom: 2 }}>{a.title}</strong>{a.desc}</div>
        </div>
      ))}
    </div>
  );
}

function Timeline({ items }) {
  const demo = [
    { icon: "☕", time: "7:14 SA", desc: "Phát hiện thức dậy — di chuyển vào bếp" },
    { icon: "💊", time: "8:00 SA", desc: "Uống thuốc buổi sáng: Metformin + Atorvastatin" },
    { icon: "🚶", time: "9:30 SA", desc: "Đi bộ sáng — 22 phút, không phát hiện ngã" },
  ];
  const list = items.length > 0 ? items : demo;

  return (
    <div style={{ background: "var(--warm-white)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", boxShadow: "var(--shadow)" }}>
      <div style={{ fontFamily: "Lora, serif", fontSize: "1.05rem", fontWeight: 600, marginBottom: "1.25rem" }}>Hoạt động hôm nay</div>
      {list.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "1rem", paddingBottom: "1.1rem", position: "relative" }}>
          {i < list.length - 1 && <div style={{ position: "absolute", left: 15, top: 32, bottom: 0, width: 1, background: "var(--border)" }} />}
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(124,158,138,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0, zIndex: 1 }}>{item.icon}</div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--soft-gray)", fontWeight: 500, marginBottom: 2 }}>{item.time || item.timestamp}</div>
            <div style={{ fontSize: "0.875rem" }}>{item.desc || item.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
