/**
 * BhashaSetu - Voice-to-Text (STT) Module
 * Handles continuous speech recognition across multiple languages and integrates with Audio Clarity & Diarizer.
 */
class BhashaSTT {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.currentLanguage = 'auto'; // 'auto', 'en-US', 'es-ES', 'fr-FR', etc.
    this.stream = null;

    // Callbacks
    this.onInterimResult = null;
    this.onFinalResult = null;
    this.onError = null;
    this.onStateChange = null;

    this.initRecognition();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[STT] SpeechRecognition not supported in this browser environment');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.getBcp47(this.currentLanguage);

    this.recognition.onstart = () => {
      this.isRecording = true;
      if (this.onStateChange) this.onStateChange(true);
    };

    this.recognition.onend = () => {
      // Auto-restart if still intended to record
      if (this.isRecording) {
        try {
          this.recognition.start();
        } catch (e) {
          this.isRecording = false;
          if (this.onStateChange) this.onStateChange(false);
        }
      } else {
        if (this.onStateChange) this.onStateChange(false);
      }
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim && this.onInterimResult) {
        this.onInterimResult(interim);
      }

      if (final && this.onFinalResult) {
        this.onFinalResult(final.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[STT] Recognition event error:', event.error);
      if (event.error === 'no-speech') {
        // Normal silence timeout, no alert needed
        return;
      }
      if (this.onError) {
        this.onError(event.error);
      }
    };
  }

  getBcp47(langCode) {
    const map = {
      'auto': 'en-US',
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'ru': 'ru-RU',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ar': 'ar-SA',
      'bn': 'bn-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN',
      'pa': 'pa-IN',
      'ur': 'ur-PK',
      'hi': 'hi-IN'
    };
    return map[langCode] || langCode || 'en-US';
  }

  setLanguage(langCode) {
    this.currentLanguage = langCode;
    if (this.recognition) {
      this.recognition.lang = this.getBcp47(langCode);
      // If currently running, restart to apply new language
      if (this.isRecording) {
        this.recognition.stop();
      }
    }
  }

  async start() {
    if (!this.recognition) {
      this.initRecognition();
      if (!this.recognition) {
        throw new Error('आपके ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है। कृपया Chrome, Edge, या Safari का उपयोग करें।');
      }
    }

    try {
      // Request mic stream with high quality constraints
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false, // Let our Web Audio clarity filter handle EQ and intelligibility
            autoGainControl: true
          }
        });

        // Feed to Audio Clarity Engine
        if (window.bhashaAudio) {
          await window.bhashaAudio.initAudio(this.stream);
        }
      }

      this.isRecording = true;
      this.recognition.lang = this.getBcp47(this.currentLanguage);
      this.recognition.start();
      return true;
    } catch (err) {
      this.isRecording = false;
      console.error('[STT] Start error:', err);
      throw err;
    }
  }

  stop() {
    this.isRecording = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (window.bhashaAudio) {
      window.bhashaAudio.isListening = false;
    }

    if (this.onStateChange) {
      this.onStateChange(false);
    }
  }
}

// Global instance
window.bhashaSTT = new BhashaSTT();
