import { useState } from "react";
import Dashboard from "./components/Dashboard";
import VoiceCompanion from "./components/VoiceCompanion";
import VisionMonitor from "./components/VisionMonitor";
import Medications from "./components/Medications";
import Emergency from "./components/Emergency";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const tabs = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "chat",      label: "💬 AI Companion" },
    { id: "vision",    label: "👁 Safety Vision" },
    { id: "medicines", label: "💊 Medications" },
    { id: "emergency", label: "🚨 Emergency" },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard":  return <Dashboard />;
      case "chat":       return <VoiceCompanion />;
      case "vision":     return <VisionMonitor />;
      case "medicines":  return <Medications />;
      case "emergency":  return <Emergency />;
    }
  };

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", minHeight: "100vh", background: "#FAF7F2" }}>
      <header style={{ background: "#FFF9F0", borderBottom: "1px solid rgba(124,158,138,0.25)", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, background: "linear-gradient(135deg, #7C9E8A, #4A7560)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏡</div>
          <div>
            <div style={{ fontFamily: "Lora, serif", fontSize: "1.2rem", fontWeight: 600 }}>CareCompanion</div>
            <div style={{ fontSize: "0.7rem", color: "#6B6B6B", letterSpacing: "0.08em", textTransform: "uppercase" }}>AI · Dorothy Johnson, 78</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(124,158,138,0.12)", border: "1px solid rgba(124,158,138,0.25)", borderRadius: 999, padding: "6px 14px", fontSize: "0.8rem", color: "#4A7560", fontWeight: 500 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C9E8A" }} />
          All Systems Normal
        </div>
      </header>

      <div style={{ display: "flex", background: "#FFF9F0", borderBottom: "1px solid rgba(124,158,138,0.25)", padding: "0 2rem" }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "14px 22px", border: "none", background: "transparent",
            fontFamily: "DM Sans, sans-serif", fontSize: "0.875rem",
            fontWeight: activeTab === tab.id ? 600 : 400,
            color: activeTab === tab.id ? "#4A7560" : "#6B6B6B", cursor: "pointer",
            borderBottom: activeTab === tab.id ? "3px solid #7C9E8A" : "3px solid transparent",
            transition: "all 0.2s", whiteSpace: "nowrap",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div>{renderTab()}</div>
    </div>
  );
}
