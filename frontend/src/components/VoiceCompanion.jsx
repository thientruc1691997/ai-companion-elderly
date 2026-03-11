import { useState, useCallback } from "react";
import { chatApi } from "../services/api";
import { recognizer, tts } from "../services/speech";

const STATE = { IDLE: "idle", LISTENING: "listening", SPEAKING: "speaking" };

export default function VoiceCompanion() {
  const [orbState,    setOrbState]    = useState(STATE.IDLE);
  const [messages,    setMessages]    = useState([]);
  const [textInput,   setTextInput]   = useState("");
  const [interimText, setInterimText] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [toast,       setToast]       = useState(null);
  const conversationId = { current: null };

  const sendToAI = useCallback(async (userMessage) => {
    if (!userMessage.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);
    setOrbState(STATE.SPEAKING);
    try {
      const result = await chatApi.sendMessage(userMessage, null);
      conversationId.current = result.conversation_id;
      setMessages((prev) => [...prev, { role: "ai", text: result.reply }]);
      tts.speak(result.reply, { rate: 0.88, pitch: 1.05, lang: "en-US" },
        () => setOrbState(STATE.SPEAKING),
        () => setOrbState(STATE.IDLE),
      );
      if (result.action) handleAction(result.action);
    } catch (err) {
      console.error("AI error:", err);
      showToast("❌", "Connection Error", "Could not reach the AI backend");
      setOrbState(STATE.IDLE);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleOrbClick = useCallback(() => {
    if (orbState !== STATE.IDLE) return;
    if (!recognizer.supported) {
      showToast("⚠️", "Voice not supported", "Please type your message below");
      return;
    }
    setOrbState(STATE.LISTENING);
    tts.stop();
    recognizer.start({
      onInterim: (text) => setInterimText(text),
      onResult:  (final) => { setInterimText(""); sendToAI(final); },
      onEnd:     () => { setInterimText(""); if (orbState === STATE.LISTENING) setOrbState(STATE.IDLE); },
      onError:   () => { setInterimText(""); setOrbState(STATE.IDLE); showToast("🎤", "No speech detected", "Try again or type below"); },
    });
  }, [orbState, sendToAI]);

  const handleTextSend = () => {
    if (!textInput.trim()) return;
    sendToAI(textInput);
    setTextInput("");
  };

  const handleAction = (action) => {
    if (action.type === "show_medications") showToast("💊", "Medication info", "Check the Medications tab");
    if (action.type === "show_emergency")   showToast("🚨", "Emergency detected", "Go to the Emergency tab");
  };

  const showToast = (icon, title, sub) => {
    setToast({ icon, title, sub });
    setTimeout(() => setToast(null), 4000);
  };

  const shortcuts = [
    { label: "❤️ How am I doing today?",       text: "How am I doing health-wise today?" },
    { label: "💊 What medications do I need?",  text: "What medications do I need to take today?" },
    { label: "📞 Call Susan",                   text: "Can you call Susan for me?" },
    { label: "🌤 What's the weather?",          text: "What is the weather like today?" },
    { label: "📋 What are my reminders?",       text: "What do I need to do today?" },
    { label: "💛 I feel a bit lonely",          text: "I feel a little lonely today." },
    { label: "🧘 Gentle exercise guide",        text: "I would like to do some gentle exercises." },
    { label: "💬 Just chat",                    text: "I just want to have a chat." },
  ];

  const displayMessages = messages.slice(-4);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", height: "calc(100vh - 110px)" }}>

      {/* Sidebar */}
      <div style={{ background: "#FFF9F0", borderRight: "1px solid rgba(124,158,138,0.25)", padding: "1.5rem", overflowY: "auto" }}>
        <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#6B6B6B", fontWeight: 600, marginBottom: "0.75rem" }}>
          Say or tap a shortcut:
        </div>
        {shortcuts.map((item) => (
          <button key={item.label} onClick={() => sendToAI(item.text)} disabled={loading}
            style={{ width: "100%", padding: "0.7rem 1rem", background: "transparent", border: "1px solid rgba(124,158,138,0.25)", borderRadius: 10, textAlign: "left", fontFamily: "DM Sans, sans-serif", fontSize: "0.82rem", color: "#2C2C2C", cursor: "pointer", marginBottom: "0.4rem", transition: "all 0.2s", opacity: loading ? 0.5 : 1 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,158,138,0.1)"; e.currentTarget.style.borderColor = "#A8C5B3"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(124,158,138,0.25)"; }}
          >
            {item.label}
          </button>
        ))}

        {/* Reminders */}
        <div style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", borderRadius: 10, padding: "0.875rem", marginTop: "0.75rem" }}>
          <div style={{ fontWeight: 600, color: "#7A5F10", marginBottom: "0.5rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>⏰ Today's Reminders</div>
          <div style={{ fontSize: "0.8rem", color: "#5A4510", padding: "2px 0" }}>🌙 Lisinopril at 8:00 PM</div>
          <div style={{ fontSize: "0.8rem", color: "#5A4510", padding: "2px 0" }}>📅 Dr. Martinez — Fri 10:30 AM</div>
          <div style={{ fontSize: "0.8rem", color: "#5A4510", padding: "2px 0" }}>🌿 Water the plants (3 days)</div>
        </div>
      </div>

      {/* Voice orb area */}
      <div style={{ display: "flex", flexDirection: "column", background: "#0F1215", position: "relative", overflow: "hidden" }}>

        {/* Ambient glow */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,158,138,0.14), transparent 70%)", top: -80, right: -80, filter: "blur(80px)", animation: "drift1 14s ease-in-out infinite" }} />
          {orbState === STATE.LISTENING && (
            <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(122,184,154,0.2), transparent 70%)", bottom: -120, left: -80, filter: "blur(80px)" }} />
          )}
          {orbState === STATE.SPEAKING && (
            <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,168,67,0.14), transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", filter: "blur(80px)", animation: "pulseBig 2.5s ease-in-out infinite" }} />
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", background: "rgba(28,36,46,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, minWidth: 260, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 10 }}>
            <span style={{ fontSize: "1.3rem" }}>{toast.icon}</span>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#EEE8DF" }}>{toast.title}</div>
              <div style={{ fontSize: "0.75rem", color: "rgba(238,232,223,0.6)" }}>{toast.sub}</div>
            </div>
          </div>
        )}

        {/* Center */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", zIndex: 1 }}>

          {/* Greeting */}
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(238,232,223,0.4)", marginBottom: 6, fontFamily: "DM Mono, monospace" }}>
              Your AI Companion
            </div>
            <div style={{ fontFamily: "Lora, serif", fontSize: "1.9rem", fontWeight: 300, color: "#EEE8DF" }}>
              Hello, <em style={{ fontStyle: "italic", color: "#E8B86A" }}>Dorothy</em>
            </div>
          </div>

          {/* Orb */}
          <div style={{ position: "relative", marginBottom: "1.25rem" }}>
            {[0,1,2].map((i) => (
              <div key={i} style={{ position: "absolute", borderRadius: "50%", border: "1px solid rgba(124,158,138,0.15)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", animation: `compRingExpand 3s ease-out ${i}s infinite`, opacity: 0, pointerEvents: "none" }} />
            ))}
            <button onClick={handleOrbClick} disabled={loading} style={{
              width: 148, height: 148, borderRadius: "50%", border: "none", cursor: loading ? "wait" : "pointer",
              background: orbState === STATE.LISTENING ? "radial-gradient(circle at 38% 38%, #1A3828, #0D1E14)"
                        : orbState === STATE.SPEAKING  ? "radial-gradient(circle at 38% 38%, #3A2E14, #1E180A)"
                        : "radial-gradient(circle at 38% 38%, #2A3A2E, #111A14)",
              boxShadow: orbState === STATE.LISTENING ? "0 0 0 2px rgba(122,184,154,0.5), 0 0 80px rgba(122,184,154,0.3), 0 20px 60px rgba(0,0,0,0.7)"
                       : orbState === STATE.SPEAKING  ? "0 0 0 2px rgba(232,184,106,0.5), 0 0 100px rgba(232,184,106,0.28), 0 20px 60px rgba(0,0,0,0.7)"
                       : "0 0 0 1px rgba(124,158,138,0.2), 0 0 40px rgba(124,158,138,0.1), 0 20px 60px rgba(0,0,0,0.7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
              animation: orbState === STATE.LISTENING ? "compOrbPulse 1.5s ease-in-out infinite"
                       : orbState === STATE.SPEAKING  ? "compOrbSpeak 0.8s ease-in-out infinite" : "none",
            }}>
              {orbState === STATE.IDLE && <span style={{ fontSize: 46, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}>🌿</span>}
              {orbState === STATE.LISTENING && (
                <div style={{ display: "flex", gap: 5, alignItems: "center", height: 38 }}>
                  {[14,22,34,26,18].map((h,i) => (
                    <div key={i} style={{ width: 4, background: "#7AB89A", borderRadius: 2, height: h, animation: `barAnim 0.7s ease-in-out ${i*0.1}s infinite` }} />
                  ))}
                </div>
              )}
              {orbState === STATE.SPEAKING && (
                <div style={{ display: "flex", gap: 5, alignItems: "center", height: 38 }}>
                  {[0,1,2,3,4].map((i) => (
                    <div key={i} style={{ width: 7, height: 7, background: "#E8B86A", borderRadius: "50%", animation: `waveDot 1s ease-in-out ${i*0.15}s infinite` }} />
                  ))}
                </div>
              )}
            </button>
          </div>

          {/* Status */}
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.25rem", height: 18, color: orbState === STATE.LISTENING ? "#7AB89A" : orbState === STATE.SPEAKING ? "#E8B86A" : "rgba(238,232,223,0.35)" }}>
            {orbState === STATE.IDLE && "Tap to speak"}
            {orbState === STATE.LISTENING && "Listening…"}
            {orbState === STATE.SPEAKING && "Speaking…"}
          </div>

          {interimText && (
            <div style={{ fontFamily: "Lora, serif", fontStyle: "italic", fontSize: "0.95rem", color: "rgba(238,232,223,0.5)", marginBottom: "0.75rem", textAlign: "center" }}>
              "{interimText}"
            </div>
          )}

          {/* Chat bubbles */}
          <div style={{ width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 10, minHeight: 60 }}>
            {displayMessages.map((msg, i) => (
              <div key={i} style={{
                maxWidth: "88%", padding: "12px 16px", borderRadius: 18,
                fontFamily: "Lora, serif", fontSize: "1rem", lineHeight: 1.55,
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                background: msg.role === "user" ? "rgba(255,255,255,0.07)" : "linear-gradient(135deg, rgba(30,46,36,0.95), rgba(26,40,32,0.95))",
                border: msg.role === "user" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(122,184,154,0.2)",
                color: msg.role === "user" ? "rgba(238,232,223,0.75)" : "#EEE8DF",
                fontStyle: msg.role === "user" ? "italic" : "normal",
                borderBottomRightRadius: msg.role === "user" ? 4 : 18,
                borderBottomLeftRadius:  msg.role === "ai"   ? 4 : 18,
                animation: "compBubbleIn 0.4s ease both",
              }}>
                {msg.text}
              </div>
            ))}
          </div>

          {messages.length === 0 && (
            <div style={{ fontFamily: "Lora, serif", fontSize: "1rem", color: "rgba(238,232,223,0.3)", textAlign: "center", marginTop: "0.5rem" }}>
              Tap the orb or choose a shortcut on the left to begin
            </div>
          )}
        </div>

        {/* Text input bar */}
        <div style={{ background: "rgba(22,28,34,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0.875rem 1.25rem", display: "flex", gap: 8, alignItems: "center", position: "relative", zIndex: 2 }}>
          <input value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
            placeholder="Or type a message here…" disabled={loading}
            style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "0.6rem 1rem", fontFamily: "DM Sans, sans-serif", fontSize: "0.875rem", color: "#EEE8DF", outline: "none" }}
          />
          <button onClick={handleTextSend} disabled={loading || !textInput.trim()}
            style={{ width: 38, height: 38, borderRadius: 9, border: "none", background: "linear-gradient(135deg, #4A7560, #7AB89A)", color: "#fff", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: loading || !textInput.trim() ? 0.5 : 1 }}>
            ➤
          </button>
        </div>

        <style>{`
          @keyframes drift1       { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,30px)} }
          @keyframes pulseBig     { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.1)} }
          @keyframes compRingExpand { 0%{width:140px;height:140px;opacity:.5} 100%{width:280px;height:280px;opacity:0} }
          @keyframes compOrbPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
          @keyframes compOrbSpeak { 0%,100%{transform:scale(1)} 50%{transform:scale(1.07)} }
          @keyframes barAnim      { 0%,100%{transform:scaleY(.4)} 50%{transform:scaleY(1)} }
          @keyframes waveDot      { 0%,100%{transform:translateY(0);opacity:.3} 50%{transform:translateY(-10px);opacity:1} }
          @keyframes compBubbleIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
      </div>
    </div>
  );
}
