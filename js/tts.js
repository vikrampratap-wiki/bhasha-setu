/**
 * BhashaSetu - Text-to-Speech (TTS) Engine with Distinct Multi-Speaker Profiles
 * Ensures that different speakers sound audibly unique and crystal clear when speaking Hindi.
 */
class BhashaTTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.hindiVoice = null;
    this.isPlaying = false;
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const load = () => {
      this.voices = this.synth.getVoices();
      // Look for Hindi voice
      this.hindiVoice = this.voices.find(v => v.lang === 'hi-IN' || v.lang.startsWith('hi')) ||
                        this.voices.find(v => v.lang.includes('IN')) ||
                        this.voices[0];
      console.log('[TTS] Voices loaded:', this.voices.length, 'Selected Hindi voice:', this.hindiVoice ? this.hindiVoice.name : 'Default');
    };

    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  /**
   * Speak Hindi text with custom pitch, rate, and timbre according to the speaker profile
   */
  speak(text, speaker = null, onEndCallback = null) {
    if (!this.synth) {
      console.warn('[TTS] SpeechSynthesis not supported');
      return;
    }

    if (!text || text.trim() === '') return;

    // Cancel any previous speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';

    if (this.hindiVoice) {
      utterance.voice = this.hindiVoice;
    }

    // Apply distinct acoustic modulation per speaker
    if (speaker) {
      utterance.pitch = speaker.pitch !== undefined ? speaker.pitch : 1.0;
      utterance.rate = speaker.rate !== undefined ? speaker.rate : 1.0;
    } else {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    }

    utterance.onstart = () => {
      this.isPlaying = true;
      const speakerBadge = document.getElementById('active-tts-indicator');
      if (speakerBadge) {
        speakerBadge.classList.remove('hidden');
        speakerBadge.textContent = `🔊 बोल रहा है: ${speaker ? speaker.name : 'हिन्दी वाचक'}`;
      }
    };

    utterance.onend = () => {
      this.isPlaying = false;
      const speakerBadge = document.getElementById('active-tts-indicator');
      if (speakerBadge) speakerBadge.classList.add('hidden');
      if (typeof onEndCallback === 'function') onEndCallback();
    };

    utterance.onerror = (e) => {
      console.warn('[TTS] Speech synthesis error:', e);
      this.isPlaying = false;
      const speakerBadge = document.getElementById('active-tts-indicator');
      if (speakerBadge) speakerBadge.classList.add('hidden');
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
      const speakerBadge = document.getElementById('active-tts-indicator');
      if (speakerBadge) speakerBadge.classList.add('hidden');
    }
  }

  /**
   * Preview a speaker's distinctive voice sample
   */
  previewSpeaker(speaker) {
    const sampleText = `नमस्ते! मैं ${speaker.name} हूँ। भाषा सेतु में आपका स्वागत है।`;
    this.speak(sampleText, speaker);
  }
}

// Global instance
window.bhashaTTS = new BhashaTTS();
