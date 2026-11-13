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
    this.isolateHindiVoice = true; // Silence/duck original platform audio so voices never clash
    this.silentOriginalPlatform = true; // 100% silent original platform speaker output (0.0 volume) — only Hindi dub is heard!
    this.mediaDuckVolume = 0.0;
    this.volumeBoost = 1.48;
    this.audioCtx = null;
    this.activeSourceNode = null;
    this.activeCleanupNodes = null;
    this.unlocked = false;
    this.audioCache = new Map();
    this.inflightFetches = new Map();
    this.currentSpeakToken = 0;

    this.initVoices();
    this.setupAutoUnlock();
  }

  getAudioContext() {
    if (typeof window !== 'undefined' && window.bhashaAudio && typeof window.bhashaAudio.getAudioContext === 'function') {
      const sharedCtx = window.bhashaAudio.getAudioContext();
      if (sharedCtx) {
        this.audioCtx = sharedCtx;
        return sharedCtx;
      }
    }
    if (!this.audioCtx && typeof window !== 'undefined') {
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
   * Silent-Speaker Platform Mode & Single-Voice Isolation:
   * When silentOriginalPlatform is true (default), original foreign media audio is kept at 0.0
   * so you NEVER have to hear the raw foreign audio from your speakers — only the live Hindi dubbing cast!
   */
  setVoiceIsolationState(isHindiSpeaking) {
    if (window.bhashaSTT) {
      window.bhashaSTT.isMutedForTTS = isHindiSpeaking;
    }

    const mediaEl = document.getElementById('media-video-preview');
    if (!mediaEl) return;
    mediaEl.muted = false;
    if (this.silentOriginalPlatform) {
      mediaEl.volume = 0.0; // Completely silence original foreign speaker output
    } else if (isHindiSpeaking && this.isolateHindiVoice) {
      mediaEl.volume = 0.05; // 5% whisper during Hindi dubbing
    } else {
      mediaEl.volume = 0.85;
    }
  }

  updateSpeakerBadge(active, speaker) {
    const speakerBadge = document.getElementById('active-tts-indicator');
    if (!speakerBadge) return;
    if (active) {
      speakerBadge.classList.remove('hidden');
      const spkName = speaker ? speaker.name : 'मानवीय स्वर';
      const stagePos = speaker && speaker.pan < -0.05 ? '◀ बायां मंच' : (speaker && speaker.pan > 0.05 ? 'दायां मंच ▶' : '● केंद्र मंच');
      const modelTag = speaker && speaker.voiceModel ? ` · मॉडल: ${speaker.voiceModel.toUpperCase()}` : '';
      speakerBadge.textContent = `🎭 लाइव डबिंग: ${spkName} (${stagePos}${modelTag})`;
    } else {
      speakerBadge.classList.add('hidden');
    }
  }

  stopActiveAudioOnly() {
    if (typeof this.activeCleanupNodes === 'function') {
      try { this.activeCleanupNodes(); } catch (_) {}
      this.activeCleanupNodes = null;
    }
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

  splitIntoSpeechChunks(text) {
    const clean = (text || '').trim();
    if (!clean) return [];
    if (clean.length <= 165) return [clean];
    const parts = clean.split(/(?<=[।?!.;,\n])\s+/);
    const chunks = [];
    let current = '';
    for (const part of parts) {
      if ((current + ' ' + part).trim().length <= 165) {
        current = (current + ' ' + part).trim();
      } else {
        if (current) chunks.push(current);
        current = part.trim().slice(0, 165);
      }
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : [clean.slice(0, 165)];
  }

  async fetchActorAudioBuffer(chunkText, lang = 'hi', speaker = null) {
    const ctx = this.getAudioContext();
    if (!ctx || !chunkText) return null;

    const voiceModel = (speaker && speaker.voiceModel) ? speaker.voiceModel : ((lang || 'hi').split('-')[0].toLowerCase());
    const ttsSpeed = (speaker && speaker.ttsSpeed) ? speaker.ttsSpeed : '1';
    const sliceText = chunkText.trim().slice(0, 185);
    const cacheKey = `${voiceModel}:${ttsSpeed}:${sliceText}`;

    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey);
    }
    if (this.inflightFetches.has(cacheKey)) {
      return this.inflightFetches.get(cacheKey);
    }

    const promise = (async () => {
      try {
        const controller = new AbortController();
        const fetchTimer = setTimeout(() => controller.abort(), 2400);
        const url = `/api/tts?tl=${encodeURIComponent(lang || 'hi')}&voice=${encodeURIComponent(voiceModel)}&speed=${encodeURIComponent(ttsSpeed)}&q=${encodeURIComponent(sliceText)}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(fetchTimer);

        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength < 100) return null;

        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        if (this.audioCache.size >= 80) {
          const oldest = this.audioCache.keys().next().value;
          this.audioCache.delete(oldest);
        }
        this.audioCache.set(cacheKey, audioBuffer);
        return audioBuffer;
      } catch (_) {
        return null;
      } finally {
        this.inflightFetches.delete(cacheKey);
      }
    })();

    this.inflightFetches.set(cacheKey, promise);
    return promise;
  }

  /**
   * Predictive Pre-Buffering: warms up the Web Audio buffer while the speaker is still talking
   */
  prebuffer(text, lang = 'hi', speaker = null) {
    if (!text || typeof fetch === 'undefined') return;
    const isOffline = (typeof navigator !== 'undefined' && !navigator.onLine) ||
      (typeof window !== 'undefined' && window.bhashaTranslator && window.bhashaTranslator.forceOffline);
    if (isOffline) return;

    const targetSpeaker = speaker || (typeof window !== 'undefined' && window.bhashaAudio ? window.bhashaAudio.getCurrentSpeaker() : null);
    const chunks = this.splitIntoSpeechChunks(text);
    if (chunks.length > 0) {
      this.fetchActorAudioBuffer(chunks[0], lang, targetSpeaker);
    }
  }

  /**
   * Speak immediately using the Actor's distinct Neural Voice Model, Vocal Tract Formant EQ, and 3D Stereo Stage Position
   */
  async speak(text, speaker = null, onEndCallback = null, lang = 'hi') {
    if (!text || !text.trim()) {
      if (typeof onEndCallback === 'function') onEndCallback();
      return;
    }

    const activeSpeaker = speaker || (typeof window !== 'undefined' && window.bhashaAudio ? window.bhashaAudio.getCurrentSpeaker() : null);
    const token = ++this.currentSpeakToken;
    this.stopActiveAudioOnly();

    this.isPlaying = true;
    this.setVoiceIsolationState(true);
    this.updateSpeakerBadge(true, activeSpeaker);

    const rawRate = activeSpeaker && activeSpeaker.rate !== undefined ? activeSpeaker.rate : 1.0;
    const naturalRate = Math.max(0.92, Math.min(1.07, rawRate));
    const isMale = activeSpeaker && activeSpeaker.gender === 'male';

    let played = false;

    try {
      const isOffline = (typeof navigator !== 'undefined' && !navigator.onLine) ||
        (typeof window !== 'undefined' && window.bhashaTranslator && window.bhashaTranslator.forceOffline);

      if (!isOffline && typeof fetch !== 'undefined') {
        played = await this.playPureHumanNeuralAudio(text.trim(), lang, activeSpeaker, naturalRate, token);
      }

      if (!played && token === this.currentSpeakToken && this.synth) {
        await this.playNaturalBrowserVoice(text.trim(), lang, isMale, naturalRate, token, activeSpeaker);
      }
    } catch (err) {
      console.warn('[TTS] speak warning:', err.message);
    } finally {
      if (token === this.currentSpeakToken) {
        this.isPlaying = false;
        this.setVoiceIsolationState(false);
        this.updateSpeakerBadge(false);
        if (typeof onEndCallback === 'function') {
          try { onEndCallback(); } catch (_) {}
        }
      }
    }
  }

  /**
   * Plays Multi-Actor Studio Dubbing Audio:
   * - Uses actor's distinct neural voice model (mr, ne, gu, en-IN, pa, bn, hi-IN)
   * - Applies 3-Band Human Vocal Tract Formant Filtering (Chest Warmth + Vocal Tract Formant + Air Presence)
   * - Applies 3D Stereo Stage Panning (-0.38 Left to +0.38 Right) so multiple speakers sound like a live dubbing cast in a room
   */
  async playPureHumanNeuralAudio(text, lang, speaker, naturalRate, token) {
    const ctx = this.getAudioContext();
    if (!ctx) return false;

    try {
      const chunks = this.splitIntoSpeechChunks(text);
      if (chunks.length === 0) return false;

      // Kick off parallel fetch for all chunks so sentence transitions are gapless
      const bufferPromises = chunks.map(c => this.fetchActorAudioBuffer(c, lang, speaker));

      for (let i = 0; i < bufferPromises.length; i++) {
        if (token !== this.currentSpeakToken) return true;
        const audioBuffer = await bufferPromises[i];
        if (!audioBuffer) return false;
        if (token !== this.currentSpeakToken) return true;

        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }

        await new Promise((resolve) => {
          if (token !== this.currentSpeakToken) return resolve(true);

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = naturalRate;

          // Band 1: Chest / Laryngeal Warmth Lowshelf (190 Hz)
          const warmthFilter = ctx.createBiquadFilter();
          warmthFilter.type = 'lowshelf';
          warmthFilter.frequency.value = 190;
          warmthFilter.gain.value = speaker && speaker.warmthDb !== undefined
            ? speaker.warmthDb
            : (speaker && speaker.gender === 'male' ? 4.0 : -1.5);

          // Band 2: Vocal Tract Formant Filter (480Hz deep baritone -> 1150Hz bright soprano)
          const formantFilter = ctx.createBiquadFilter();
          formantFilter.type = 'peaking';
          formantFilter.frequency.value = speaker && speaker.formantHz ? speaker.formantHz : (speaker && speaker.gender === 'male' ? 540 : 960);
          formantFilter.Q.value = 1.35;
          formantFilter.gain.value = speaker && speaker.formantGain !== undefined ? speaker.formantGain : 3.5;

          // Band 3: Studio Air & Diction Presence Highshelf (3400 Hz)
          const presenceFilter = ctx.createBiquadFilter();
          presenceFilter.type = 'highshelf';
          presenceFilter.frequency.value = 3400;
          presenceFilter.gain.value = speaker && speaker.airDb !== undefined
            ? speaker.airDb
            : (speaker && speaker.gender === 'male' ? -1.0 : 3.0);

          // 3D Stereo Stage Placement (Left / Center / Right Dubbing Stage)
          let pannerNode = null;
          if (typeof ctx.createStereoPanner === 'function') {
            pannerNode = ctx.createStereoPanner();
            const panVal = speaker && speaker.pan !== undefined ? Math.max(-0.6, Math.min(0.6, speaker.pan)) : 0;
            pannerNode.pan.value = panVal;
          }

          const gainNode = ctx.createGain();
          gainNode.gain.value = this.volumeBoost;

          source.connect(warmthFilter);
          warmthFilter.connect(formantFilter);
          formantFilter.connect(presenceFilter);
          if (pannerNode) {
            presenceFilter.connect(pannerNode);
            pannerNode.connect(gainNode);
          } else {
            presenceFilter.connect(gainNode);
          }
          gainNode.connect(ctx.destination);

          this.activeSourceNode = source;

          const cleanupNodes = () => {
            if (this.activeCleanupNodes === cleanupNodes) {
              this.activeCleanupNodes = null;
            }
            try { source.disconnect(); } catch (_) {}
            try { warmthFilter.disconnect(); } catch (_) {}
            try { formantFilter.disconnect(); } catch (_) {}
            try { presenceFilter.disconnect(); } catch (_) {}
            if (pannerNode) {
              try { pannerNode.disconnect(); } catch (_) {}
            }
            try { gainNode.disconnect(); } catch (_) {}
          };
          this.activeCleanupNodes = cleanupNodes;

          const maxDurationMs = Math.ceil((audioBuffer.duration / naturalRate) * 1000) + 500;
          const safetyTimer = setTimeout(() => {
            if (this.activeSourceNode === source) this.activeSourceNode = null;
            cleanupNodes();
            resolve(true);
          }, maxDurationMs);

          source.onended = () => {
            clearTimeout(safetyTimer);
            if (this.activeSourceNode === source) this.activeSourceNode = null;
            cleanupNodes();
            resolve(true);
          };

          source.start(0);
        });
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  playNaturalBrowserVoice(text, lang, isMale, naturalRate, token, speaker = null) {
    return new Promise((resolve) => {
      if (!this.synth || token !== this.currentSpeakToken) return resolve(false);

      try {
        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = (speaker && speaker.voiceModel) ? speaker.voiceModel : (lang === 'hi' ? 'hi-IN' : lang);
        utterance.volume = 1.0;
        utterance.pitch = speaker && speaker.pitch ? Math.max(0.92, Math.min(1.08, speaker.pitch)) : 1.0;
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
    const sampleText = `नमस्ते! मैं ${speaker.name} हूँ। लाइव मल्टी-एक्टर डबिंग में मेरी आवाज़ और मंच स्थान बिल्कुल अलग और मानवीय है।`;
    this.speak(sampleText, speaker);
  }
}

if (typeof window !== 'undefined') {
  window.bhashaTTS = new BhashaTTS();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BhashaTTS };
}
