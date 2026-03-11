// ============================================================
//  components/Medications.jsx
//  Hiển thị thuốc, đánh dấu đã uống, adherence chart
// ============================================================

import { useState, useEffect } from "react";
import { medicationApi } from "../services/api";

export default function Medications() {
  const [schedule,   setSchedule]   = useState([]);
  const [adherence,  setAdherence]  = useState([]);
  const [refills,    setRefills]    = useState([]);
  const [loading,    setLoading]    = useState(true);

  const load = async () => {
    try {
      const [sch, adh, ref] = await Promise.all([
        medicationApi.getTodaySchedule(),
        medicationApi.getAdherence("dorothy", 7),
        medicationApi.getRefillAlerts(),
      ]);
      setSchedule(sch.schedule || DEMO_MEDS);
      setAdherence(adh.adherence || DEMO_ADHERENCE);
      setRefills(ref.alerts || []);
    } catch {
      // Dùng demo data nếu backend chưa chạy
      setSchedule(DEMO_MEDS);
      setAdherence(DEMO_ADHERENCE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleLogDose = async (med) => {
    await medicationApi.logDose(med.id, med.times?.[0] || "08:00");
    load(); // refresh
  };

  if (loading) return <div style={{ padding: "2rem", color: "var(--soft-gray)" }}>Đang tải...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ fontFamily: "Lora, serif", fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Quản lý thuốc
      </div>
      <div style={{ fontSize: "0.875rem", color: "var(--soft-gray)", marginBottom: "1.5rem" }}>
        Theo dõi liều dùng, lịch uống và tỉ lệ tuân thủ
      </div>

      {/* Refill warnings */}
      {refills.length > 0 && refills.map((r) => (
        <div key={r.id} style={{ background: "rgba(196,113,74,0.1)", border: "1px solid rgba(196,113,74,0.3)", borderRadius: 12, padding: "0.875rem 1.25rem", marginBottom: "1rem", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 10 }}>
          ⚠️ <strong>{r.name}</strong> — chỉ còn {r.stock} viên. Cần mua thêm sớm!
        </div>
      ))}

      {/* Med cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        {schedule.map((med) => (
          <MedCard key={med.id} med={med} onLog={handleLogDose} />
        ))}
      </div>

      {/* Adherence */}
      <div style={{ background: "var(--warm-white)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", boxShadow: "var(--shadow)" }}>
        <div style={{ fontFamily: "Lora, serif", fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Tuân thủ uống thuốc — 7 ngày qua</div>
        <div style={{ fontSize: "0.85rem", color: "var(--soft-gray)", marginBottom: "1rem" }}>
          Tổng thể: <strong style={{ color: "var(--sage-dark)" }}>
            {Math.round(adherence.reduce((s, d) => s + (d.rate || d.pct || 0), 0) / adherence.length * 100)}%
          </strong> — Làm tốt lắm, Dorothy!
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {adherence.map((day, i) => {
            const pct = day.rate || day.pct || 0;
            const emoji = pct >= 1 ? "✓" : pct > 0 ? "~" : i === adherence.length - 1 ? "→" : "·";
            const bg = pct >= 1 ? "rgba(124,158,138,0.15)" : pct > 0 ? "rgba(212,168,67,0.15)" : "transparent";
            const border = pct >= 1 ? "var(--sage)" : pct > 0 ? "var(--gold)" : "var(--border)";
            return (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--soft-gray)", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
                  {day.day || ["T5","T6","T7","CN","T2","T3","T4"][i]}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: "50%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", background: bg, border: `2px solid ${border}`, fontSize: "0.9rem" }}>
                  {emoji}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Med Card ────────────────────────────────────────────────
function MedCard({ med, onLog }) {
  const colors = ["var(--sage)", "var(--gold)", "var(--terracotta)", "#5B8DB8", "#9B7DC1"];
  const accent = colors[med.id % colors.length] || colors[0];
  const taken  = med.taken === 1;

  return (
    <div style={{ background: "var(--warm-white)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.25rem 1.5rem", boxShadow: "var(--shadow)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, borderRadius: "16px 0 0 16px", background: accent }} />
      <div style={{ paddingLeft: "0.5rem" }}>
        <div style={{ fontFamily: "Lora, serif", fontSize: "1.05rem", fontWeight: 600, marginBottom: 4 }}>{med.name}</div>
        <div style={{ fontSize: "0.78rem", color: "var(--soft-gray)", marginBottom: "0.875rem" }}>{med.dose} · {med.purpose}</div>

        {/* Times */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "0.75rem" }}>
          {(typeof med.times === "string" ? JSON.parse(med.times || "[]") : med.times || []).map((t) => (
            <div key={t} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
              borderRadius: 999, fontSize: "0.75rem", fontWeight: 500,
              background: taken ? "rgba(124,158,138,0.12)" : "rgba(212,168,67,0.1)",
              border: `1px solid ${taken ? "var(--sage-light)" : "rgba(212,168,67,0.4)"}`,
              color: taken ? "var(--sage-dark)" : "#7A5F10",
            }}>
              {taken ? "✓" : "⏰"} {t}
            </div>
          ))}
        </div>

        {/* Stock */}
        <div style={{ fontSize: "0.75rem", color: med.stock <= (med.refill_at || 14) ? "var(--terracotta)" : "var(--soft-gray)", display: "flex", alignItems: "center", gap: 5, marginBottom: taken ? 0 : "0.75rem" }}>
          📦 {med.stock} viên còn lại
          {med.stock <= (med.refill_at || 14) && <span style={{ fontWeight: 600 }}> · Cần mua thêm!</span>}
        </div>

        {/* Log dose button */}
        {!taken && (
          <button
            onClick={() => onLog(med)}
            style={{ width: "100%", padding: "0.5rem", background: "var(--sage-dark)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.8rem", fontFamily: "DM Sans", fontWeight: 600 }}
          >
            ✓ Đánh dấu đã uống
          </button>
        )}
      </div>
    </div>
  );
}

// ── Demo data ────────────────────────────────────────────────
const DEMO_MEDS = [
  { id: 1, name: "Metformin",    dose: "500mg", purpose: "Tiểu đường type 2",  times: ["08:00","20:00"], stock: 28, refill_at: 14, taken: 1 },
  { id: 2, name: "Atorvastatin", dose: "20mg",  purpose: "Cholesterol",         times: ["08:00"],          stock: 14, refill_at: 14, taken: 1 },
  { id: 3, name: "Lisinopril",   dose: "10mg",  purpose: "Huyết áp",            times: ["20:00"],          stock: 30, refill_at: 14, taken: 0 },
  { id: 4, name: "Vitamin D3",   dose: "1000IU",purpose: "Bổ sung",             times: ["08:00"],          stock: 45, refill_at: 14, taken: 1 },
  { id: 5, name: "Melatonin",    dose: "3mg",   purpose: "Hỗ trợ giấc ngủ",    times: ["21:00"],          stock: 20, refill_at: 14, taken: 0 },
];

const DEMO_ADHERENCE = [
  { day: "T5", rate: 1 }, { day: "T6", rate: 1 }, { day: "T7", rate: 0.5 },
  { day: "CN", rate: 1 }, { day: "T2", rate: 1 }, { day: "T3", rate: 1 }, { day: "T4", rate: 0 },
];
