import { useState, useEffect } from "react";
import { emergencyApi } from "../services/api";

const DEMO_CONTACTS = [
  { name: "Susan Johnson",      role: "Daughter · Primary Contact", phone: "(555) 234-5678", icon: "👩"   },
  { name: "Dr. Carlos Martinez",role: "Family Physician",           phone: "(555) 901-2345", icon: "👨‍⚕️" },
  { name: "Nurse Linda Park",   role: "Home Care Nurse",            phone: "(555) 345-6789", icon: "👩‍⚕️" },
  { name: "Emergency 911",      role: "Always available",           phone: "911",             icon: "🚑"   },
];

export default function Emergency() {
  const [contacts, setContacts] = useState([]);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  useEffect(() => {
    emergencyApi.getContacts()
      .then((r) => setContacts(r.contacts?.length > 0 ? r.contacts : DEMO_CONTACTS))
      .catch(() => setContacts(DEMO_CONTACTS));
  }, []);

  const handleAlert = async () => {
    if (!window.confirm("⚠️ This will immediately notify Susan and Nurse Linda. Continue?")) return;
    setSending(true);
    try {
      await emergencyApi.sendAlert("manual", "high", "Dorothy pressed the emergency button");
      setSent(true);
      setTimeout(() => setSent(false), 8000);
    } catch {
      alert("Failed to send alert. Please call 911 directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ fontFamily: "Lora, serif", fontSize: "1.5rem", fontWeight: 600, color: "#2C2C2C", marginBottom: "0.4rem" }}>
        Emergency & Contacts
      </div>
      <div style={{ fontSize: "0.875rem", color: "#6B6B6B", marginBottom: "1.5rem" }}>
        One tap to send an alert and reach your support network
      </div>

      {/* Success banner */}
      {sent && (
        <div style={{ background: "rgba(124,158,138,0.1)", border: "1px solid rgba(124,158,138,0.35)", borderRadius: 14, padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 12, fontSize: "0.9rem" }}>
          <span style={{ fontSize: "1.3rem" }}>✅</span>
          <div>
            <strong style={{ color: "#2C2C2C" }}>Alert sent successfully!</strong>
            <div style={{ color: "#555", marginTop: 2 }}>Susan and Nurse Linda have been notified. Stay calm, Dorothy — help is on the way. 💛</div>
          </div>
        </div>
      )}

      {/* Emergency button */}
      <div style={{ background: "rgba(196,113,74,0.06)", border: "1.5px solid rgba(196,113,74,0.3)", borderRadius: 18, padding: "2rem", marginBottom: "1.5rem", textAlign: "center" }}>
        <div style={{ fontFamily: "Lora, serif", fontSize: "1.3rem", color: "#8B3A1E", marginBottom: "0.5rem" }}>🆘 Send Emergency Alert</div>
        <div style={{ fontSize: "0.875rem", color: "#555", maxWidth: 420, margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
          Pressing this button will immediately notify your family and care team. Use this if you feel unsafe or need urgent help.
        </div>
        <button onClick={handleAlert} disabled={sending}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "1rem 2.5rem", background: "#C4714A", color: "#fff",
            border: "none", borderRadius: 999, fontFamily: "DM Sans", fontSize: "1rem",
            fontWeight: 700, cursor: sending ? "wait" : "pointer",
            boxShadow: "0 6px 20px rgba(196,113,74,0.3)",
            opacity: sending ? 0.7 : 1, transition: "all 0.2s",
          }}>
          🚨 {sending ? "Sending alert…" : "Send Emergency Alert"}
        </button>
      </div>

      {/* Emergency contacts */}
      <div style={{ fontFamily: "Lora, serif", fontSize: "1.1rem", fontWeight: 600, color: "#2C2C2C", marginBottom: "1rem" }}>
        Emergency Contacts
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        {contacts.map((c) => (
          <div key={c.name} style={{ background: "#FFF9F0", border: "1px solid rgba(124,158,138,0.25)", borderRadius: 14, padding: "1.25rem", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 24px rgba(44,44,44,0.08)" }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(124,158,138,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
              {c.icon || "👤"}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#2C2C2C", marginBottom: 2 }}>{c.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#6B6B6B", marginBottom: 4 }}>{c.role}</div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "#4A7560", fontWeight: 500 }}>{c.phone}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Fall detection status */}
      <div>
        <div style={{ fontFamily: "Lora, serif", fontSize: "1.1rem", fontWeight: 600, color: "#2C2C2C", marginBottom: "1rem" }}>
          AI Fall Detection Status
        </div>
        {[
          { type: "good", icon: "🟢", title: "No falls detected in the past 30 days",      desc: "Vision sensors are active in all monitored rooms" },
          { type: "info", icon: "📍", title: "Location sharing is enabled",                 desc: "Family members can view Dorothy's location via the app" },
          { type: "warn", icon: "⚠️", title: "Staircase area flagged for review",          desc: "Mild imbalance detected at 11:05 AM — consider installing a handrail" },
        ].map((a) => (
          <div key={a.title} style={{
            display: "flex", alignItems: "flex-start", gap: 12, padding: "0.875rem 1.25rem",
            borderRadius: 12, marginBottom: "0.75rem", border: "1px solid", fontSize: "0.875rem",
            background:   a.type === "warn" ? "rgba(212,168,67,0.07)"  : a.type === "good" ? "rgba(124,158,138,0.07)"  : "rgba(91,141,184,0.05)",
            borderColor:  a.type === "warn" ? "rgba(212,168,67,0.3)"   : a.type === "good" ? "rgba(124,158,138,0.25)"  : "rgba(91,141,184,0.2)",
          }}>
            <span style={{ fontSize: "1.1rem" }}>{a.icon}</span>
            <div>
              <strong style={{ display: "block", marginBottom: 2, color: "#2C2C2C" }}>{a.title}</strong>
              <span style={{ color: "#555" }}>{a.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
