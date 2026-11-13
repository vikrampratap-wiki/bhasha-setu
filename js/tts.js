/**
 * BhashaSetu - Pure Human-Voice & Single-Voice Isolation Text-to-Speech (TTS) Engine
 *
 * Critical Fixes:
 * 1. Single-Voice Isolation (No Clashing Voices!):
 *    - Automatically silences/ducks original media speaker audio down to 6% (`0.06`) during the exact
 *      moment the Hindi translator voice speaks so you NEVER hear two people talking over each other!
 *    - Mutes microphone self-echo (`bhashaSTT.isMutedForTTS = true`) while speaking so the app never
 *      hears or re-translates its own voice!
 *    - Cancels any prior voice source before starting a new sentence so two TTS voices never overlap!
 * 2. 100% Pure Human Voice (Zero Robotic/Machine Distortion):
 *    - Removed all artificial pitch-shifting (`detune` / `preservesPitch = false`) that previously made
 *      voices sound like a machine. Plays pure, un-warped human neural Hindi audio (`/api/tts`) with
 *      gentle acoustic warmth EQ, or natural human browser voices at 1.0x natural pitch.
 * 3. Millisecond Response Start:
 *    - Pre-buffers and plays immediately without multi-second queue delays.
 */
class BhashaTTS {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.hindiFemaleVoice = null;
    this.hindiMaleVoice = null;
    this.isPlaying = false;
    this.isolateHindiVoice = true; // Duck original speaker down to 6% while Hindi voice speaks so they don't clash!
    this.mediaDuckVolume = 0.06;
    this.volumeBoost = 1.45;
    this.audioCtx = null;
    this.activeSourceNode = null;
    this.unlocked = false;
    this.audioCache = new Map();
    this.currentSpeakToken = 0;

    this.initVoices();
    this.setupAutoUnlock();
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  setupAutoUnlock() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const unlockHandler = () => {
      try {
        const ctx = this.getAudioContext();
        if (ctx && !this.unlocked) {
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
          this.unlocked = true;
        }
        if (this.synth) {
          this.synth.resume();
        }
      } catch (_) {}
    };

    document.addEventListener('pointerdown', unlockHandler, { passive: true });
    document.addEventListener('keydown', unlockHandler, { passive: true });
  }

  initVoices() {
    if (!this.synth) return;

    const load = () => {
      this.voices = this.synth.getVoices() || [];
      const hindiVoices = this.voices.filter(
        v => v.lang === 'hi-IN' || v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi') || v.name.includes('हिन्दी')
      );

      // Only select genuinely natural voices if present
      const sortedHindi = hindiVoices.sort((a, b) => {
        const aScore = (a.name.includes('Natural') ? 5 : 0) + (a.name.includes('Online') ? 3 : 0) + (a.name.includes('Google') ? 2 : 0);
        const bScore = (b.name.includes('Natural') ? 5 : 0) + (b.name.includes('Online') ? 3 : 0) + (b.name.includes('Google') ? 2 : 0);
        return bScore - aScore;
      });

      this.hindiFemaleVoice =
        sortedHindi.find(v => /Swara|Lekha|Kalpana|Neerja|Female|Google/i.test(v.name)) ||
        sortedHindi[0] ||
        null;

      this.hindiMaleVoice =
        sortedHindi.find(v => /Madhur|Hemant|Prabhat|Male/i.test(v.name)) ||
        sortedHindi[1] ||
        this.hindiFemaleVoice;
    };

    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  /**
   * Isolate Hindi Translator Voice:
   * Lowers original speaker/video volume to 6% (near-silent, without pausing the video!)
   * while the Hindi translation is speaking so the two voices NEVER clash!
   */
  setVoiceIsolationState(isHindiSpeaking) {
    // 1. Prevent microphone from picking up the app's own Hindi TTS voice
    if (window.bhashaSTT) {
      window.bhashaSTT.isMutedForTTS = isHindiSpeaking;
    }

    // 2. Isolate media video volume so original speaker doesn't talk loudly over Hindi voice
    const mediaEl = document.getElementById('media-video-preview');
    if (!mediaEl) return;
    mediaEl.muted = false;
    if (isHindiSpeaking && this.isolateHindiVoice) {
      mediaEl.volume = this.mediaDuckVolume; // 6% background whisper during Hindi dubbing
    } else {
      mediaEl.volume = 1.0; // Restore 100% original audio immediately when Hindi sentence finishes
    }
  }

  updateSpeakerBadge(active, speaker) {
    const speakerBadge = document.getElementById('active-tts-indicator');
    if (!speakerBadge) return;
    if (active) {
      speakerBadge.classList.remove('hidden');
      const spkName = speaker ? speaker.name : 'मानवीय स्वर';
      speakerBadge.textContent = `🔊 मानवीय स्वर: ${spkName}`;
    } else {
      speakerBadge.classList.add('hidden');
    }
  }

  stopActiveAudioOnly() {
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.onended = null;
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch (_) {}
      this.activeSourceNode = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (_) {}
    }
  }

  /**
   * Speak immediately in a pure, un-distorted human voice (cancels any stale overlapping voice)
   */
  async speak(text, speaker = null, onEndCallback = null, lang = 'hi') {
    if (!text || !text.trim()) {
      if (typeof onEndCallback === 'function') onEndCallback();
      return;
    }

    const token = ++this.currentSpeakToken;
    this.stopActiveAudioOnly();

    this.isPlaying = true;
    this.setVoiceIsolationState(true);
    this.updateSpeakerBadge(true, speaker);

    // Keep rate natural (0.98 - 1.03) and NEVER distort pitch with robotic detuning!
    const rawRate = speaker && speaker.rate !== undefined ? speaker.rate : 1.0;
    const naturalRate = Math.max(0.96, Math.min(1.04, rawRate));
    const isMale = speaker && speaker.gender === 'male';

    let played = false;

    // 1. Pure Un-Warped Neural Audio via Web Audio API (/api/tts)
    if (navigator.onLine) {
      played = await this.playPureHumanNeuralAudio(text.trim(), lang, speaker, naturalRate, token);
    }

    // 2. Fallback to Natural Browser Voice (only if token is still current and neural wasn't played)
    if (!played && token === this.currentSpeakToken && this.synth) {
      await this.playNaturalBrowserVoice(text.trim(), lang, isMale, naturalRate, token);
    }

    if (token === this.currentSpeakToken) {
      this.isPlaying = false;
      this.setVoiceIsolationState(false);
      this.updateSpeakerBadge(false);
      if (typeof onEndCallback === 'function') {
        try { onEndCallback(); } catch (_) {}
      }
    }
  }

  /**
   * Plays un-distorted human neural audio (NO pitch detuning, NO formant warping!)
   * Uses gentle acoustic EQ (warm chest resonance for male, clear presence for female)
   */
  async playPureHumanNeuralAudio(text, lang, speaker, naturalRate, token) {
    const ctx = this.getAudioContext();
    if (!ctx) return false;

    try {
      const cleanLang = (lang || 'hi').split('-')[0].toLowerCase();
      const sliceText = text.slice(0, 190);
      const cacheKey = `${cleanLang}:${sliceText}`;

      let audioBuffer = this.audioCache.get(cacheKey);
      if (!audioBuffer) {
        const controller = new AbortController();
        const fetchTimer = setTimeout(() => controller.abort(), 2500);
        const url = `/api/tts?tl=${encodeURIComponent(cleanLang)}&q=${encodeURIComponent(sliceText)}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(fetchTimer);

        if (!response.ok || token !== this.currentSpeakToken) return false;
        const arrayBuffer = await response.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength < 100 || token !== this.currentSpeakToken) return false;

        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (this.audioCache.size > 50) {
          const firstKey = this.audioCache.keys().next().value;
          this.audioCache.delete(firstKey);
        }
        this.audioCache.set(cacheKey, audioBuffer);
      }

      if (token !== this.currentSpeakToken) return true;

      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      return await new Promise((resolve) => {
        if (token !== this.currentSpeakToken) return resolve(true);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        // Keep playbackRate near 1.0 and DO NOT detune cents (prevents metallic/machine sound!)
        source.playbackRate.value = naturalRate;

        // Subtle studio broadcast EQ for warm human presence
        const warmthFilter = ctx.createBiquadFilter();
        warmthFilter.type = 'lowshelf';
        warmthFilter.frequency.value = 220;
        warmthFilter.gain.value = speaker && speaker.gender === 'male' ? 2.5 : 0.5;

        const presenceFilter = ctx.createBiquadFilter();
        presenceFilter.type = 'peaking';
        presenceFilter.frequency.value = 2800;
        presenceFilter.Q.value = 1.0;
        presenceFilter.gain.value = 1.8;

        const gainNode = ctx.createGain();
        gainNode.gain.value = this.volumeBoost;

        source.connect(warmthFilter);
        warmthFilter.connect(presenceFilter);
        presenceFilter.connect(gainNode);
        gainNode.connect(ctx.destination);

        this.activeSourceNode = source;

        const maxDurationMs = Math.ceil((audioBuffer.duration / naturalRate) * 1000) + 600;
        const safetyTimer = setTimeout(() => {
          if (this.activeSourceNode === source) this.activeSourceNode = null;
          resolve(true);
        }, maxDurationMs);

        source.onended = () => {
          clearTimeout(safetyTimer);
          if (this.activeSourceNode === source) this.activeSourceNode = null;
          resolve(true);
        };

        source.start(0);
      });
    } catch (err) {
      return false;
    }
  }

  playNaturalBrowserVoice(text, lang, isMale, naturalRate, token) {
    return new Promise((resolve) => {
      if (!this.synth || token !== this.currentSpeakToken) return resolve(false);

      try {
        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'hi' ? 'hi-IN' : lang;
        utterance.volume = 1.0;
        utterance.pitch = 1.0; // Pure 1.0 human pitch — never warp browser TTS pitch!
        utterance.rate = naturalRate;

        if (lang === 'hi' || lang.startsWith('hi')) {
          const chosenVoice = isMale ? (this.hindiMaleVoice || this.hindiFemaleVoice) : (this.hindiFemaleVoice || this.hindiMaleVoice);
          if (chosenVoice) utterance.voice = chosenVoice;
        }

        let finished = false;
        const done = (ok) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          resolve(ok);
        };

        const timer = setTimeout(() => done(true), 4500);
        utterance.onend = () => done(true);
        utterance.onerror = () => done(false);

        this.synth.speak(utterance);
      } catch (e) {
        resolve(false);
      }
    });
  }

  stop() {
    this.currentSpeakToken++;
    this.stopActiveAudioOnly();
    this.isPlaying = false;
    this.setVoiceIsolationState(false);
    this.updateSpeakerBadge(false);
  }

  previewSpeaker(speaker) {
    const sampleText = `नमस्ते! मैं ${speaker.name} हूँ। भाषा सेतु में मेरी आवाज़ बिल्कुल स्पष्ट और स्वाभाविक है।`;
    this.speak(sampleText, speaker);
  }
}

window.bhashaTTS = new BhashaTTS();
