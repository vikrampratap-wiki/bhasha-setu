/**
 * BhashaSetu - Millisecond-Response Voice-to-Text (STT) Module
 *
 * Key Fixes for Millisecond Speed & Zero Voice Clash:
 * 1. 380ms Fast Pause-Commit (Eliminates 4-5s SpeechRecognition isFinal Delay):
 *    Browsers normally wait 3-5 seconds of silence before marking a spoken sentence `isFinal = true`.
 *    Now, as soon as the speaker pauses for just 380ms, we immediately commit and translate the utterance!
 * 2. Real-Time Millisecond Interim Translation:
 *    Every word spoken is translated in <1ms via `translateInstant()` while the speaker is still talking!
 * 3. Self-Echo Suppression (`isMutedForTTS`):
 *    While BhashaTTS is speaking the Hindi translation aloud, the microphone ignores the app's own voice
 *    so the speaker's voice and the app's voice NEVER clash or loop!
 */
class BhashaSTT {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.isMutedForTTS = false;
    this.currentLanguage = 'auto';
    this.captureMode = 'mic';
    this.stream = null;
    this.restartTimer = null;
    this.interimCommitTimer = null;
    this.pendingInterimText = '';
    this.lastCommittedText = '';
    this.lastCommitTime = 0;
    this.lastStartTimestamp = 0;
    this.rapidAbortCount = 0;
    this.gotResultInSession = false;

    // Callbacks
    this.onInterimResult = null;
    this.onFinalResult = null;
    this.onError = null;
    this.onStateChange = null;

    this.initRecognition();
  }

  isSupported() {
    return !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));
  }

  initRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.getBcp47(this.currentLanguage);

    this.recognition.onstart = () => {
      // Prevent zombie state if user clicked stop before hardware initialized
      if (!this.isRecording) {
        try { this.recognition.abort(); } catch (_) {}
        return;
      }
      this.lastStartTimestamp = Date.now();
      this.gotResultInSession = false;
      this.isRecording = true;
      if (window.bhashaAudio) window.bhashaAudio.isListening = true;
      if (this.onStateChange) this.onStateChange(true, this.captureMode);
    };

    this.recognition.onend = () => {
      if (this.pendingInterimText.trim()) {
        this.commitUtterance(this.pendingInterimText.trim());
      }

      if (!this.isRecording) {
        if (window.bhashaAudio) window.bhashaAudio.isListening = false;
        if (this.onStateChange) this.onStateChange(false, this.captureMode);
        return;
      }

      const elapsed = Date.now() - this.lastStartTimestamp;
      if (elapsed < 1800 && !this.gotResultInSession) {
        this.rapidAbortCount++;
      } else {
        this.rapidAbortCount = 0;
      }

      // If hardware mic is blocked by a playing video or OS permission (2+ rapid aborts),
      // stop hammering the mic so we NEVER pause or stutter the user's video!
      if (this.rapidAbortCount >= 2) {
        this.isRecording = false;
        if (window.bhashaAudio) window.bhashaAudio.isListening = false;
        if (this.onStateChange) this.onStateChange(false, this.captureMode);
        return;
      }

      if (this.restartTimer) clearTimeout(this.restartTimer);
      this.restartTimer = setTimeout(() => {
        if (!this.isRecording) return;
        try {
          this.recognition.lang = this.getBcp47(this.currentLanguage);
          this.recognition.start();
        } catch (e) {}
      }, 650);
    };

    this.recognition.onresult = (event) => {
      // Ignore microphone pick-up while the app itself is speaking Hindi TTS (prevents double-voice echo!)
      if (this.isMutedForTTS) return;

      this.gotResultInSession = true;
      this.rapidAbortCount = 0;
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

      if (final && final.trim()) {
        if (this.interimCommitTimer) {
          clearTimeout(this.interimCommitTimer);
          this.interimCommitTimer = null;
        }
        this.pendingInterimText = '';
        this.commitUtterance(final.trim());
        return;
      }

      if (interim && interim.trim()) {
        const cleanInterim = interim.trim();
        this.pendingInterimText = cleanInterim;

        if (this.onInterimResult) {
          this.onInterimResult(cleanInterim);
        }

        // MILLISECOND FAST-COMMIT:
        // Don't wait 4-5 seconds for browser `isFinal`! If the speaker pauses for 380ms,
        // commit and speak the translation immediately!
        if (this.interimCommitTimer) clearTimeout(this.interimCommitTimer);
        this.interimCommitTimer = setTimeout(() => {
          if (this.pendingInterimText.trim()) {
            const textToCommit = this.pendingInterimText.trim();
            this.pendingInterimText = '';
            this.commitUtterance(textToCommit);
          }
        }, 380);
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.rapidAbortCount += 3;
        this.isRecording = false;
        if (this.onStateChange) this.onStateChange(false, this.captureMode);
        if (this.onError) {
          this.onError('माइक्रोफ़ोन की अनुमति अस्वीकृत है। कृपया ब्राउज़र सेटिंग्स में जाकर माइक को अनुमति दें।');
        }
      } else if (event.error === 'audio-capture') {
        this.rapidAbortCount += 3;
        this.isRecording = false;
        if (this.onStateChange) this.onStateChange(false, this.captureMode);
        if (this.onError) {
          this.onError('माइक्रोफ़ोन हार्डवेयर उपलब्ध नहीं है या किसी अन्य ऐप द्वारा व्यस्त है।');
        }
      } else if (event.error === 'network') {
        if (this.restartTimer) {
          clearTimeout(this.restartTimer);
          this.restartTimer = null;
        }
        if (this.onError) {
          this.onError('स्पीच रिकग्निशन नेटवर्क त्रुटि। कृपया इंटरनेट कनेक्शन जांचें अथवा त्वरित टेक्स्ट बॉक्स का उपयोग करें।');
        }
      } else {
        if (this.onError) {
          this.onError(`वाक् पहचान त्रुटि (${event.error})`);
        }
      }
    };
  }

  commitUtterance(text) {
    if (!text) return;
    const now = Date.now();
    // Deduplicate if `isFinal` fires right after our 380ms fast-commit
    if (text.toLowerCase() === this.lastCommittedText.toLowerCase() && (now - this.lastCommitTime) < 2500) {
      return;
    }
    this.lastCommittedText = text;
    this.lastCommitTime = now;
    if (this.onFinalResult) {
      this.onFinalResult(text);
    }
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
    }
  }

  async start(mode = 'mic', externalStream = null) {
    this.captureMode = mode;
    this.rapidAbortCount = 0;
    this.pendingInterimText = '';

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (window.bhashaTTS && window.bhashaTTS.getAudioContext) {
      window.bhashaTTS.getAudioContext();
    }

    if (!this.isSupported()) {
      this.isRecording = false;
      if (this.onStateChange) this.onStateChange(false, this.captureMode);
      if (this.onError) {
        this.onError('आपके ब्राउज़र (जैसे Firefox) में स्पीच रिकग्निशन समर्थित नहीं है। कृपया त्वरित टेक्स्ट बॉक्स या Chrome/Edge/Safari का उपयोग करें।');
      }
      return false;
    }

    this.isRecording = true;
    if (window.bhashaAudio) {
      window.bhashaAudio.isListening = true;
    }

    if (this.onStateChange) {
      this.onStateChange(true, this.captureMode);
    }

    if (this.recognition) {
      try {
        this.recognition.lang = this.getBcp47(this.currentLanguage);
        this.recognition.start();
      } catch (e) {
        console.warn('[STT] recognition.start warning:', e.message);
      }
    }

    // Connect real audio stream to Audio Clarity Engine & Pitch Diarizer
    if (mode === 'mic' && !externalStream) {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: false, // Let our high-definition Web Audio clarity filter handle EQ
              autoGainControl: true
            }
          });
          if (window.bhashaAudio) {
            await window.bhashaAudio.initAudio(this.stream);
          }
        } catch (micErr) {
          console.warn('[STT] Could not capture mic for audio visualizer/EQ:', micErr.message);
        }
      }
    } else if (externalStream && window.bhashaAudio && externalStream.getAudioTracks().length > 0) {
      this.stream = externalStream;
      await window.bhashaAudio.initAudio(externalStream);
    }

    return true;
  }

  stop() {
    this.isRecording = false;
    this.rapidAbortCount = 0;
    this.pendingInterimText = '';
    if (this.interimCommitTimer) {
      clearTimeout(this.interimCommitTimer);
      this.interimCommitTimer = null;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.stream) {
      try {
        this.stream.getTracks().forEach(track => track.stop());
      } catch (_) {}
      this.stream = null;
    }

    if (window.bhashaAudio) {
      window.bhashaAudio.isListening = false;
      if (typeof window.bhashaAudio.stopAudio === 'function') {
        window.bhashaAudio.stopAudio();
      }
    }

    if (this.captureMode === 'system-tab' && window.bhashaDeviceMedia) {
      try {
        window.bhashaDeviceMedia.stopSystemScreenCapture();
      } catch (_) {}
    }

    if (this.onStateChange) {
      this.onStateChange(false, this.captureMode);
    }
  }
}

if (typeof window !== 'undefined') {
  window.bhashaSTT = new BhashaSTT();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BhashaSTT };
}
