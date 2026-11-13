/**
 * BhashaSetu - Voice-to-Text (STT) Module
 * Handles continuous speech recognition across 40+ Indian & International languages
 * and integrates with Audio Clarity, Speaker Diarizer & Device/Media Audio Capture.
 */
class BhashaSTT {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.currentLanguage = 'auto';
    this.captureMode = 'mic'; // 'mic' | 'ambient-media' | 'system-tab'
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
      if (this.onStateChange) this.onStateChange(true, this.captureMode);
    };

    this.recognition.onend = () => {
      if (this.isRecording) {
        try {
          this.recognition.start();
        } catch (e) {
          this.isRecording = false;
          if (this.onStateChange) this.onStateChange(false, this.captureMode);
        }
      } else {
        if (this.onStateChange) this.onStateChange(false, this.captureMode);
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
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (this.onError) {
        this.onError(event.error);
      }
    };
  }

  getBcp47(langCode) {
    if (window.LANGUAGE_CATALOG && window.LANGUAGE_CATALOG[langCode]) {
      return window.LANGUAGE_CATALOG[langCode].bcp47;
    }
    const map = {
      'auto': 'en-US',
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'ru': 'ru-RU',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'ar': 'ar-SA',
      'bn': 'bn-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN',
      'pa': 'pa-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'or': 'or-IN',
      'as': 'as-IN',
      'ur': 'ur-PK',
      'ne': 'ne-NP',
      'pt': 'pt-BR',
      'it': 'it-IT',
      'nl': 'nl-NL',
      'tr': 'tr-TR',
      'fa': 'fa-IR',
      'vi': 'vi-VN',
      'th': 'th-TH',
      'id': 'id-ID',
      'ms': 'ms-MY',
      'sw': 'sw-KE',
      'pl': 'pl-PL',
      'uk': 'uk-UA',
      'el': 'el-GR',
      'he': 'he-IL',
      'hi': 'hi-IN'
    };
    return map[langCode] || langCode || 'en-US';
  }

  setLanguage(langCode) {
    this.currentLanguage = langCode;
    if (this.recognition) {
      this.recognition.lang = this.getBcp47(langCode);
      if (this.isRecording) {
        try {
          this.recognition.stop();
        } catch (e) {}
      }
    }
  }

  async start(mode = 'mic', externalStream = null) {
    this.captureMode = mode;
    if (!this.recognition) {
      this.initRecognition();
      if (!this.recognition) {
        throw new Error('आपके ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है। कृपया Chrome, Edge, या Safari का उपयोग करें।');
      }
    }

    try {
      if (externalStream) {
        this.stream = externalStream;
      } else if (!this.stream) {
        // For 'ambient-media' mode (capturing device speaker / TV / tablet / mobile media audio),
        // disable echoCancellation so the device doesn't filter out media playing on or near the device.
        const isAmbientMedia = mode === 'ambient-media';
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: !isAmbientMedia,
            noiseSuppression: false,
            autoGainControl: true
          }
        });
      }

      if (window.bhashaAudio && this.stream && this.stream.getAudioTracks().length > 0) {
        await window.bhashaAudio.initAudio(this.stream);
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
      this.onStateChange(false, this.captureMode);
    }
  }
}

window.bhashaSTT = new BhashaSTT();
