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
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div style={{ padding: "2rem", color: "#444", fontSize: "1rem" }}>Loading dashboard...</div>
  );
  if (!data) return (
    <div style={{ padding: "2rem", color: "#444", fontSize: "1rem" }}>
      Could not load data — make sure the backend is running at <strong>localhost:8000</strong>
    </div>
  );

  const { vitals, activity, medications_today } = data;

  return (
    <div style={{ padding: "2rem", maxWidth: "100%", margin: "0 auto" }}>

      {/* Greeting */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontFamily: "Lora, serif", fontSize: "1.5rem", fontWeight: 600, color: "#2C2C2C" }}>
          Good morning, Dorothy 🌤
        </div>
        <div style={{ fontSize: "0.875rem", color: "#6B6B6B", marginTop: 4 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })} · Here's your daily overview
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <MetricCard label="Heart Rate"        value={vitals.heart_rate.value}             unit="bpm"   status={vitals.heart_rate.status}    icon="❤️" trend="Normal range" />
        <MetricCard label="Blood Pressure"    value={vitals.blood_pressure.value}         unit="mmHg"  status={vitals.blood_pressure.status} icon="🩸" trend="Slightly elevated" />
        <MetricCard label="Steps Today"       value={activity.steps.value.toLocaleString()} unit="steps" status="normal"                   icon="🚶" trend="74% of daily goal" />
        <MetricCard label="Sleep Last Night"  value={activity.sleep_hours.value}          unit="hrs"   status="normal"                      icon="😴" trend="Good quality" />
        <MetricCard label="Medications Today" value={`${medications_today.taken}/${medications_today.total}`} status="normal"              icon="💊" trend="Evening dose pending" />
        <MetricCard label="Temperature"       value={vitals.temperature.value}            unit="°F"    status={vitals.temperature.status}   icon="🌡️" trend="Normal" />
      </div>

      {/* Alerts + Timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <AlertsList alerts={alerts} />
        <Timeline items={timeline} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, status, icon, trend }) {
  const accentColor = status === "normal" ? "#7C9E8A" : status === "elevated" ? "#D4A843" : "#C4714A";
  const trendColor  = status === "normal" ? "#4A7560" : status === "elevated" ? "#7A5F10" : "#8B3A1E";

  return (
    <div style={{ background: "#FFF9F0", border: "1px solid rgba(124,158,138,0.25)", borderRadius: 16, padding: "1.5rem", position: "relative", overflow: "hidden", boxShadow: "0 4px 24px rgba(44,44,44,0.08)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentColor, borderRadius: "16px 16px 0 0" }} />
      <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", fontSize: "1.5rem", opacity: 0.25 }}>{icon}</div>
      <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B6B6B", fontWeight: 600, marginBottom: "0.75rem" }}>{label}</div>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: "1.9rem", fontWeight: 500, lineHeight: 1, color: "#2C2C2C" }}>
        {value}<span style={{ fontSize: "0.85rem", color: "#6B6B6B", marginLeft: 4 }}>{unit}</span>
      </div>
      {trend && <div style={{ fontSize: "0.78rem", fontWeight: 500, color: trendColor, marginTop: "0.5rem" }}>↗ {trend}</div>}
    </div>
  );
}

function AlertsList({ alerts }) {
  const demo = [
    { type: "warn", icon: "💊", title: "Evening medication reminder", desc: "Lisinopril 10mg due at 8:00 PM" },
    { type: "good", icon: "✅", title: "Morning routine completed",   desc: "Breakfast, morning walk, and medications all done" },
    { type: "info", icon: "📅", title: "Dr. Martinez appointment",    desc: "Friday March 13 at 10:30 AM — telehealth call" },
  ];
  const list = alerts.length > 0 ? alerts : demo;

  return (
    <div style={{ background: "#FFF9F0", border: "1px solid rgba(124,158,138,0.25)", borderRadius: 16, padding: "1.5rem", boxShadow: "0 4px 24px rgba(44,44,44,0.08)" }}>
      <div style={{ fontFamily: "Lora, serif", fontSize: "1.05rem", fontWeight: 600, color: "#2C2C2C", marginBottom: "1rem" }}>Today's Alerts</div>
      {list.map((a, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 12, padding: "0.875rem 1rem",
          borderRadius: 12, marginBottom: "0.75rem", border: "1px solid",
          background: a.type === "warn" ? "rgba(212,168,67,0.08)" : a.type === "good" ? "rgba(124,158,138,0.08)" : "rgba(91,141,184,0.06)",
          borderColor: a.type === "warn" ? "rgba(212,168,67,0.3)" : a.type === "good" ? "rgba(124,158,138,0.25)" : "rgba(91,141,184,0.2)",
          fontSize: "0.875rem",
        }}>
          <span>{a.icon}</span>
          <div>
            <strong style={{ display: "block", marginBottom: 2, color: "#2C2C2C" }}>{a.title}</strong>
            <span style={{ color: "#555" }}>{a.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Timeline({ items }) {
  const demo = [
    { icon: "☕", time: "7:14 AM",  desc: "Wake-up detected — movement in kitchen, breakfast prepared" },
    { icon: "💊", time: "8:00 AM",  desc: "Morning medications taken: Metformin + Atorvastatin" },
    { icon: "🚶", time: "9:30 AM",  desc: "Morning walk — 22 min, garden path, no fall detected" },
    { icon: "💬", time: "11:15 AM", desc: "Chat with AI companion — discussed garden plans" },
    { icon: "🍽️", time: "12:40 PM", desc: "Lunch detected — 28 min in kitchen" },
    { icon: "😴", time: "2:00 PM",  desc: "Afternoon rest — 45 min nap in bedroom" },
  ];
  const list = items.length > 0 ? items : demo;

  return (
    <div style={{ background: "#FFF9F0", border: "1px solid rgba(124,158,138,0.25)", borderRadius: 16, padding: "1.5rem", boxShadow: "0 4px 24px rgba(44,44,44,0.08)" }}>
      <div style={{ fontFamily: "Lora, serif", fontSize: "1.05rem", fontWeight: 600, color: "#2C2C2C", marginBottom: "1.25rem" }}>Today's Activity Log</div>
      {list.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "1rem", paddingBottom: "1.1rem", position: "relative" }}>
          {i < list.length - 1 && <div style={{ position: "absolute", left: 15, top: 32, bottom: 0, width: 1, background: "rgba(124,158,138,0.25)" }} />}
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(124,158,138,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0, zIndex: 1 }}>{item.icon}</div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#6B6B6B", fontWeight: 500, marginBottom: 2 }}>{item.time || item.timestamp}</div>
            <div style={{ fontSize: "0.875rem", color: "#2C2C2C" }}>{item.desc || item.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
