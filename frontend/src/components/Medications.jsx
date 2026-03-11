import { useState, useEffect } from "react";
import { medicationApi } from "../services/api";

const DEMO_MEDS = [
  { id: 1, name: "Metformin",    dose: "500mg",  purpose: "Type 2 Diabetes management", times: ["8:00 AM","8:00 PM"], stock: 28, refill_at: 14, taken: 1 },
  { id: 2, name: "Atorvastatin", dose: "20mg",   purpose: "Cholesterol control",         times: ["8:00 AM"],          stock: 14, refill_at: 14, taken: 1 },
  { id: 3, name: "Lisinopril",   dose: "10mg",   purpose: "Blood pressure management",   times: ["8:00 PM"],          stock: 30, refill_at: 14, taken: 0 },
  { id: 4, name: "Vitamin D3",   dose: "1000IU", purpose: "Bone health supplement",      times: ["8:00 AM"],          stock: 45, refill_at: 14, taken: 1 },
  { id: 5, name: "Melatonin",    dose: "3mg",    purpose: "Sleep support",               times: ["9:00 PM"],          stock: 20, refill_at: 14, taken: 0 },
];

const DEMO_ADHERENCE = [
  { day: "Thu", rate: 1 }, { day: "Fri", rate: 1 }, { day: "Sat", rate: 0.5 },
  { day: "Sun", rate: 1 }, { day: "Mon", rate: 1 }, { day: "Tue", rate: 1 }, { day: "Wed", rate: 0 },
];

export default function Medications() {
  const [schedule,  setSchedule]  = useState([]);
  const [adherence, setAdherence] = useState([]);
  const [refills,   setRefills]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  const load = async () => {
    try {
      const [sch, adh, ref] = await Promise.all([
        medicationApi.getTodaySchedule(),
        medicationApi.getAdherence("dorothy", 7),
        medicationApi.getRefillAlerts(),
      ]);
      setSchedule(sch.schedule?.length > 0 ? sch.schedule : DEMO_MEDS);
      setAdherence(adh.adherence?.length > 0 ? adh.adherence : DEMO_ADHERENCE);
      setRefills(ref.alerts || []);
    } catch {
      setSchedule(DEMO_MEDS);
      setAdherence(DEMO_ADHERENCE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleLogDose = async (med) => {
    await medicationApi.logDose(med.id, med.times?.[0] || "08:00");
    load();
  };

  const avgAdherence = adherence.length > 0
    ? Math.round(adherence.reduce((s, d) => s + (d.rate || d.pct || 0), 0) / adherence.length * 100)
    : 0;

  if (loading) return <div style={{ padding: "2rem", color: "#444" }}>Loading medications...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "100%", margin: "0 auto" }}>
      <div style={{ fontFamily: "Lora, serif", fontSize: "1.5rem", fontWeight: 600, color: "#2C2C2C", marginBottom: "0.4rem" }}>
        Medication Manager
      </div>
      <div style={{ fontSize: "0.875rem", color: "#6B6B6B", marginBottom: "1.5rem" }}>
        Track daily doses, schedules, and adherence history
      </div>

      {/* Refill warnings */}
      {refills.map((r) => (
        <div key={r.id} style={{ background: "rgba(196,113,74,0.08)", border: "1px solid rgba(196,113,74,0.3)", borderRadius: 12, padding: "0.875rem 1.25rem", marginBottom: "1rem", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 10 }}>
          <span>⚠️</span>
          <span style={{ color: "#2C2C2C" }}><strong>{r.name}</strong> — only {r.stock} tablets remaining. Please reorder soon.</span>
        </div>
      ))}

      {/* Med cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        {schedule.map((med) => (
          <MedCard key={med.id} med={med} onLog={handleLogDose} />
        ))}
      </div>

      {/* Adherence chart */}
      <div style={{ background: "#FFF9F0", border: "1px solid rgba(124,158,138,0.25)", borderRadius: 16, padding: "1.5rem", boxShadow: "0 4px 24px rgba(44,44,44,0.08)" }}>
        <div style={{ fontFamily: "Lora, serif", fontSize: "1.1rem", fontWeight: 600, color: "#2C2C2C", marginBottom: "0.4rem" }}>
          Medication Adherence — Last 7 Days
        </div>
        <div style={{ fontSize: "0.85rem", color: "#6B6B6B", marginBottom: "1.25rem" }}>
          Overall: <strong style={{ color: "#4A7560" }}>{avgAdherence}%</strong> — Keep it up, Dorothy!
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {adherence.map((day, i) => {
            const pct    = day.rate || day.pct || 0;
            const symbol = pct >= 1 ? "✓" : pct > 0 ? "~" : i === adherence.length - 1 ? "→" : "·";
            const bg     = pct >= 1 ? "rgba(124,158,138,0.15)" : pct > 0 ? "rgba(212,168,67,0.15)" : "transparent";
            const border = pct >= 1 ? "#7C9E8A" : pct > 0 ? "#D4A843" : "rgba(124,158,138,0.25)";
            const color  = pct >= 1 ? "#4A7560" : pct > 0 ? "#7A5F10" : "#6B6B6B";
            return (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.65rem", color: "#6B6B6B", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
                  {day.day || ["Thu","Fri","Sat","Sun","Mon","Tue","Wed"][i]}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: "50%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", background: bg, border: `2px solid ${border}`, fontSize: "0.9rem", color, fontWeight: 600 }}>
                  {symbol}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MedCard({ med, onLog }) {
  const ACCENTS = ["#7C9E8A", "#D4A843", "#C4714A", "#5B8DB8", "#9B7DC1"];
  const accent  = ACCENTS[med.id % ACCENTS.length];
  const taken   = med.taken === 1;
  const times   = typeof med.times === "string" ? JSON.parse(med.times || "[]") : (med.times || []);
  const lowStock = med.stock <= (med.refill_at || 14);

  return (
    <div style={{ background: "#FFF9F0", border: "1px solid rgba(124,158,138,0.25)", borderRadius: 16, padding: "1.25rem 1.5rem", boxShadow: "0 4px 24px rgba(44,44,44,0.08)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, borderRadius: "16px 0 0 16px", background: accent }} />
      <div style={{ paddingLeft: "0.5rem" }}>
        <div style={{ fontFamily: "Lora, serif", fontSize: "1.05rem", fontWeight: 600, color: "#2C2C2C", marginBottom: 3 }}>{med.name}</div>
        <div style={{ fontSize: "0.78rem", color: "#6B6B6B", marginBottom: "0.875rem" }}>{med.dose} · {med.purpose}</div>

        {/* Dose times */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "0.75rem" }}>
          {times.map((t) => (
            <div key={t} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 500,
              background: taken ? "rgba(124,158,138,0.12)" : "rgba(212,168,67,0.1)",
              border:     `1px solid ${taken ? "rgba(124,158,138,0.4)" : "rgba(212,168,67,0.4)"}`,
              color:      taken ? "#4A7560" : "#7A5F10",
            }}>
              {taken ? "✓" : "⏰"} {t}
            </div>
          ))}
        </div>

        {/* Stock */}
        <div style={{ fontSize: "0.75rem", color: lowStock ? "#8B3A1E" : "#6B6B6B", display: "flex", alignItems: "center", gap: 5, marginBottom: taken ? 0 : "0.75rem" }}>
          📦 {med.stock} tablets remaining {lowStock && <strong>· Refill needed!</strong>}
        </div>

        {/* Log button */}
        {!taken && (
          <button onClick={() => onLog(med)}
            style={{ width: "100%", padding: "0.5rem", background: "#4A7560", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.8rem", fontFamily: "DM Sans", fontWeight: 600 }}>
            ✓ Mark as Taken
          </button>
        )}

        {taken && (
          <div style={{ fontSize: "0.78rem", color: "#4A7560", fontWeight: 500 }}>✅ Taken today</div>
        )}
      </div>
    </div>
  );
}
