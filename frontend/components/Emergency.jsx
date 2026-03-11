// ============================================================
//  components/Emergency.jsx
//  One-touch alert, danh sách liên hệ, lịch sử khẩn cấp
// ============================================================

import { useState, useEffect } from "react";
import { emergencyApi } from "../services/api";

export default function Emergency() {
  const [contacts, setContacts] = useState([]);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  useEffect(() => {
    emergencyApi.getContacts().then((r) => setContacts(r.contacts || DEMO_CONTACTS));
  }, []);

  const handleAlert = async () => {
    if (!confirm("⚠️ Điều này sẽ gửi cảnh báo khẩn cấp đến Susan và Nurse Linda. Tiếp tục?")) return;
    setSending(true);
    try {
      await emergencyApi.sendAlert("manual", "high", "Dorothy pressed the emergency button");
      setSent(true);
      setTimeout(() => setSent(false), 8000);
    } catch (err) {
      alert("Lỗi gửi alert. Hãy gọi 112 trực tiếp.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ fontFamily: "Lora, serif", fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Khẩn cấp & Liên hệ
      </div>
      <div style={{ fontSize: "0.875rem", color: "var(--soft-gray)", marginBottom: "1.5rem" }}>
        Một chạm để gửi cảnh báo và liên hệ người thân
      </div>

      {/* Success banner */}
      {sent && (
        <div style={{ background: "rgba(124,158,138,0.12)", border: "1px solid var(--sage-light)", borderRadius: 14, padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 12, fontSize: "0.9rem" }}>
          ✅ <div><strong>Đã gửi alert!</strong> Susan và Nurse Linda đã được thông báo. Giữ bình tĩnh, Dorothy. 💛</div>
        </div>
      )}

      {/* Emergency button */}
      <div style={{ background: "linear-gradient(135deg, rgba(196,113,74,0.1), rgba(196,113,74,0.05))", border: "1.5px solid rgba(196,113,74,0.35)", borderRadius: 18, padding: "2rem", marginBottom: "1.5rem", textAlign: "center" }}>
        <div style={{ fontFamily: "Lora, serif", fontSize: "1.3rem", color: "var(--terracotta)", marginBottom: "0.5rem" }}>🆘 Gửi Alert Khẩn cấp</div>
        <div style={{ fontSize: "0.875rem", color: "var(--soft-gray)", maxWidth: 400, margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
          Nhấn nút này sẽ ngay lập tức thông báo đến người thân và caregiver của bạn.
        </div>
        <button
          onClick={handleAlert}
          disabled={sending}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "1rem 2.5rem", background: "var(--terracotta)", color: "white",
            border: "none", borderRadius: 999, fontFamily: "DM Sans", fontSize: "1rem",
            fontWeight: 700, cursor: sending ? "wait" : "pointer",
            boxShadow: "0 6px 20px rgba(196,113,74,0.35)",
            opacity: sending ? 0.7 : 1, transition: "all 0.2s",
          }}
        >
          🚨 {sending ? "Đang gửi..." : "Gửi Alert Khẩn cấp"}
        </button>
      </div>

      {/* Contacts */}
      <div style={{ fontFamily: "Lora, serif", fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
        Liên hệ khẩn cấp
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        {contacts.map((c) => (
          <div key={c.name} style={{ background: "var(--warm-white)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.25rem", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow)" }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(124,158,138,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
              {c.icon || "👤"}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>{c.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--soft-gray)", marginBottom: 4 }}>{c.role}</div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "var(--sage-dark)", fontWeight: 500 }}>{c.phone}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div>
        <div style={{ fontFamily: "Lora, serif", fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
          Trạng thái AI Fall Detection
        </div>
        {[
          { type: "good", icon: "🟢", title: "Không phát hiện ngã trong 30 ngày qua", desc: "Cảm biến vision đang hoạt động ở tất cả các phòng" },
          { type: "info", icon: "📍", title: "Chia sẻ vị trí đã bật", desc: "Gia đình có thể xem vị trí của Dorothy qua ứng dụng" },
          { type: "warn", icon: "⚠️", title: "Khu vực cầu thang có cảnh báo", desc: "Phát hiện mất thăng bằng nhẹ lúc 11:05 SA — cân nhắc lắp thanh vịn" },
        ].map((a) => (
          <div key={a.title} style={{
            display: "flex", alignItems: "flex-start", gap: 12, padding: "0.875rem 1.25rem",
            borderRadius: 12, marginBottom: "0.75rem", border: "1px solid", fontSize: "0.875rem",
            background: a.type === "warn" ? "rgba(212,168,67,0.08)" : a.type === "good" ? "rgba(124,158,138,0.08)" : "rgba(91,141,184,0.06)",
            borderColor: a.type === "warn" ? "rgba(212,168,67,0.3)" : a.type === "good" ? "rgba(124,158,138,0.25)" : "rgba(91,141,184,0.2)",
          }}>
            <span style={{ fontSize: "1.1rem" }}>{a.icon}</span>
            <div><strong style={{ display: "block", marginBottom: 2 }}>{a.title}</strong>{a.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEMO_CONTACTS = [
  { name: "Susan Johnson",    role: "Con gái · Liên hệ chính", phone: "(555) 234-5678", icon: "👩",   priority: 1 },
  { name: "BS Carlos Martinez", role: "Bác sĩ gia đình",      phone: "(555) 901-2345", icon: "👨‍⚕️", priority: 2 },
  { name: "Y tá Linda Park",  role: "Y tá chăm sóc tại nhà",  phone: "(555) 345-6789", icon: "👩‍⚕️", priority: 3 },
  { name: "Cấp cứu 112",     role: "Luôn sẵn sàng",          phone: "112",             icon: "🚑",   priority: 4 },
];
