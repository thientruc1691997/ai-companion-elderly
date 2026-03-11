// ============================================================
//  services/speech.js  —  Web Speech API wrapper
//  STT (Speech-to-Text): nhận giọng nói của Dorothy
//  TTS (Text-to-Speech): đọc response của AI
// ============================================================


// ════════════════════════════════════════════════════════════
//  SPEECH-TO-TEXT  (SpeechRecognition API)
// ════════════════════════════════════════════════════════════
export class SpeechRecognizer {
  constructor() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("⚠️ SpeechRecognition not supported in this browser");
      this.supported = false;
      return;
    }

    this.supported   = true;
    this.recognition = new SpeechRecognition();

    // Cấu hình
    this.recognition.continuous    = false;   // dừng sau 1 câu
    this.recognition.interimResults = true;   // hiện text đang nói
    this.recognition.lang           = "vi-VN"; // Tiếng Việt (thay "en-US" nếu cần)
    this.recognition.maxAlternatives = 1;

    this._isListening = false;
  }

  /**
   * Bắt đầu lắng nghe
   * @param {Function} onResult   - callback(finalText) khi có kết quả final
   * @param {Function} onInterim  - callback(interimText) khi đang nói
   * @param {Function} onEnd      - callback khi kết thúc
   * @param {Function} onError    - callback(error)
   */
  start({ onResult, onInterim, onEnd, onError } = {}) {
    if (!this.supported || this._isListening) return;

    this._isListening = true;

    this.recognition.onresult = (event) => {
      let interimText = "";
      let finalText   = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (interimText && onInterim) onInterim(interimText);
      if (finalText   && onResult)  onResult(finalText.trim());
    };

    this.recognition.onend = () => {
      this._isListening = false;
      if (onEnd) onEnd();
    };

    this.recognition.onerror = (event) => {
      this._isListening = false;
      console.error("STT error:", event.error);
      if (onError) onError(event.error);
    };

    this.recognition.start();
  }

  stop() {
    if (this._isListening) {
      this.recognition.stop();
      this._isListening = false;
    }
  }

  get isListening() {
    return this._isListening;
  }
}


// ════════════════════════════════════════════════════════════
//  TEXT-TO-SPEECH  (SpeechSynthesis API)
// ════════════════════════════════════════════════════════════
export class TextToSpeech {
  constructor() {
    this.supported = "speechSynthesis" in window;
    this._voices   = [];

    if (this.supported) {
      // Preload danh sách giọng đọc
      this._loadVoices();
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        this._loadVoices();
      });
    }
  }

  _loadVoices() {
    this._voices = window.speechSynthesis.getVoices();
  }

  /**
   * Đọc text thành tiếng
   * @param {string}   text      - nội dung cần đọc
   * @param {object}   options   - { rate, pitch, lang }
   * @param {Function} onStart   - callback khi bắt đầu đọc
   * @param {Function} onEnd     - callback khi đọc xong
   */
  speak(text, { rate = 0.88, pitch = 1.05, lang = "vi-VN" } = {}, onStart, onEnd) {
    if (!this.supported) return;

    // Dừng nếu đang đọc dở
    window.speechSynthesis.cancel();

    const utterance      = new SpeechSynthesisUtterance(text);
    utterance.rate       = rate;
    utterance.pitch      = pitch;
    utterance.lang       = lang;
    utterance.volume     = 1.0;

    // Chọn giọng phù hợp
    const preferredVoice = this._pickVoice(lang);
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => onStart && onStart();
    utterance.onend   = () => onEnd   && onEnd();
    utterance.onerror = (e) => console.error("TTS error:", e);

    window.speechSynthesis.speak(utterance);
  }

  stop() {
    if (this.supported) window.speechSynthesis.cancel();
  }

  get isSpeaking() {
    return this.supported && window.speechSynthesis.speaking;
  }

  _pickVoice(lang) {
    const voices = this._voices;
    // Ưu tiên giọng bản địa theo ngôn ngữ
    return (
      voices.find((v) => v.lang === lang && !v.localService === false) ||
      voices.find((v) => v.lang.startsWith(lang.split("-")[0])) ||
      voices.find((v) => /female|samantha|karen|moira/i.test(v.name)) ||
      null
    );
  }
}


// ════════════════════════════════════════════════════════════
//  Convenience: singleton instances dùng trong components
// ════════════════════════════════════════════════════════════
export const recognizer = new SpeechRecognizer();
export const tts        = new TextToSpeech();
