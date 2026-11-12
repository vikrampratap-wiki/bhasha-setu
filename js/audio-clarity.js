/**
 * BhashaSetu - Audio Clarity, Noise Filtering & Multi-Speaker Diarization
 * 
 * Provides:
 * 1. Web Audio Clarity Equalizer (Bandpass & Formant Peaking Filter) for crystal-clear voices
 * 2. Real-time Pitch Detection (Autocorrelation F0) for speaker separation
 * 3. Audio Visualizer (Waveform & Spectrum)
 * 4. Speaker Profile Management
 */
class BhashaAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.highpassFilter = null;
    this.clarityFilter = null;
    this.lowpassFilter = null;
    this.analyser = null;
    this.isClarityEnabled = true;
    this.isListening = false;
    this.animationFrameId = null;

    // Pitch detection buffers
    this.bufferSize = 2048;
    this.audioBuffer = new Float32Array(this.bufferSize);

    // Speaker management
    this.speakers = [
      { id: 'speaker-1', name: 'वक्ता 1', color: '#10b981', pitch: 0.82, rate: 0.95, f0Min: 80, f0Max: 155, desc: 'गंभीर / गहरी आवाज़' },
      { id: 'speaker-2', name: 'वक्ता 2', color: '#3b82f6', pitch: 1.05, rate: 1.00, f0Min: 155, f0Max: 215, desc: 'मध्यम / स्पष्ट आवाज़' },
      { id: 'speaker-3', name: 'वक्ता 3', color: '#8b5cf6', pitch: 1.25, rate: 1.05, f0Min: 215, f0Max: 320, desc: 'ऊंची / तीखी आवाज़' },
      { id: 'speaker-4', name: 'वक्ता 4', color: '#f59e0b', pitch: 0.70, rate: 1.10, f0Min: 65, f0Max: 120, desc: 'रेज़ोनेंट / मुखर आवाज़' }
    ];
    this.currentSpeakerIndex = 0;
    this.autoDiarization = true;
    this.lastDetectedPitch = 0;
    this.onSpeakerDetected = null;
  }

  async initAudio(stream) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.mediaStream = stream;
      this.sourceNode = this.audioCtx.createMediaStreamSource(stream);

      // 1. Highpass filter to eliminate sub-bass rumble (< 130 Hz)
      this.highpassFilter = this.audioCtx.createBiquadFilter();
      this.highpassFilter.type = 'highpass';
      this.highpassFilter.frequency.setValueAtTime(130, this.audioCtx.currentTime);
      this.highpassFilter.Q.setValueAtTime(0.7, this.audioCtx.currentTime);

      // 2. Clarity Peaking Equalizer to boost speech intelligibility (around 2400 Hz)
      this.clarityFilter = this.audioCtx.createBiquadFilter();
      this.clarityFilter.type = 'peaking';
      this.clarityFilter.frequency.setValueAtTime(2400, this.audioCtx.currentTime);
      this.clarityFilter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);
      this.clarityFilter.gain.setValueAtTime(5.0, this.audioCtx.currentTime); // +5dB clarity boost

      // 3. Lowpass filter to cut high-frequency background hiss (> 7200 Hz)
      this.lowpassFilter = this.audioCtx.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.setValueAtTime(7200, this.audioCtx.currentTime);
      this.lowpassFilter.Q.setValueAtTime(0.7, this.audioCtx.currentTime);

      // 4. Analyser for waveform, spectrum, and pitch autocorrelation
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect pipeline
      if (this.isClarityEnabled) {
        this.sourceNode.connect(this.highpassFilter);
        this.highpassFilter.connect(this.clarityFilter);
        this.clarityFilter.connect(this.lowpassFilter);
        this.lowpassFilter.connect(this.analyser);
      } else {
        this.sourceNode.connect(this.analyser);
      }

      this.isListening = true;
      console.log('[AudioEngine] Web Audio clarity pipeline initialized');
      return true;
    } catch (err) {
      console.error('[AudioEngine] Error initializing audio:', err);
      return false;
    }
  }

  toggleClarityFilter(enable) {
    this.isClarityEnabled = enable !== undefined ? enable : !this.isClarityEnabled;
    if (!this.sourceNode || !this.analyser) return this.isClarityEnabled;

    try {
      this.sourceNode.disconnect();
      if (this.highpassFilter) this.highpassFilter.disconnect();
      if (this.clarityFilter) this.clarityFilter.disconnect();
      if (this.lowpassFilter) this.lowpassFilter.disconnect();

      if (this.isClarityEnabled) {
        this.sourceNode.connect(this.highpassFilter);
        this.highpassFilter.connect(this.clarityFilter);
        this.clarityFilter.connect(this.lowpassFilter);
        this.lowpassFilter.connect(this.analyser);
      } else {
        this.sourceNode.connect(this.analyser);
      }
    } catch (e) {
      console.warn('[AudioEngine] Reconnect filter warning:', e);
    }
    return this.isClarityEnabled;
  }

  /**
   * Time-domain autocorrelation algorithm to detect fundamental frequency (F0)
   */
  detectPitch() {
    if (!this.analyser || !this.isListening) return 0;

    this.analyser.getFloatTimeDomainData(this.audioBuffer);

    // Compute Root-Mean-Square (RMS) to check if someone is speaking
    let rms = 0;
    for (let i = 0; i < this.audioBuffer.length; i++) {
      rms += this.audioBuffer[i] * this.audioBuffer[i];
    }
    rms = Math.sqrt(rms / this.audioBuffer.length);

    // If signal is too quiet (noise floor), don't detect pitch
    if (rms < 0.02) {
      return 0;
    }

    // Autocorrelation
    const sampleRate = this.audioCtx.sampleRate;
    const minPeriod = Math.floor(sampleRate / 450); // ~450 Hz max human pitch
    const maxPeriod = Math.floor(sampleRate / 65);  // ~65 Hz min human pitch

    let bestR = 0;
    let bestOffset = -1;

    for (let offset = minPeriod; offset <= maxPeriod; offset++) {
      let r = 0;
      for (let i = 0; i < this.bufferSize - offset; i++) {
        r += this.audioBuffer[i] * this.audioBuffer[i + offset];
      }
      if (r > bestR) {
        bestR = r;
        bestOffset = offset;
      }
    }

    if (bestOffset > 0 && bestR > 0.08) {
      const freq = Math.round(sampleRate / bestOffset);
      if (freq >= 65 && freq <= 450) {
        this.lastDetectedPitch = freq;
        this.evaluateSpeakerFromPitch(freq);
        return freq;
      }
    }

    return 0;
  }

  /**
   * Speaker Diarization: map detected pitch to speaker profile
   */
  evaluateSpeakerFromPitch(freq) {
    if (!this.autoDiarization || freq <= 0) return;

    let matchedSpeakerIndex = -1;
    for (let i = 0; i < this.speakers.length; i++) {
      const spk = this.speakers[i];
      if (freq >= spk.f0Min && freq <= spk.f0Max) {
        matchedSpeakerIndex = i;
        break;
      }
    }

    if (matchedSpeakerIndex !== -1 && matchedSpeakerIndex !== this.currentSpeakerIndex) {
      // Switch active speaker automatically if confident
      this.currentSpeakerIndex = matchedSpeakerIndex;
      if (typeof this.onSpeakerDetected === 'function') {
        this.onSpeakerDetected(this.getCurrentSpeaker(), freq);
      }
    }
  }

  getCurrentSpeaker() {
    return this.speakers[this.currentSpeakerIndex] || this.speakers[0];
  }

  setSpeakerByIndex(index) {
    if (index >= 0 && index < this.speakers.length) {
      this.currentSpeakerIndex = index;
      return this.speakers[index];
    }
    return this.getCurrentSpeaker();
  }

  addSpeaker(name, color = null) {
    const id = `speaker-${this.speakers.length + 1}`;
    const defaultColors = ['#ec4899', '#06b6d4', '#84cc16', '#eab308'];
    const chosenColor = color || defaultColors[(this.speakers.length) % defaultColors.length];
    
    // Calculate mathematically distinct pitch and speed for each new speaker
    const pitch = parseFloat((0.75 + ((this.speakers.length * 0.18) % 0.65)).toFixed(2));
    const rate = parseFloat((0.95 + ((this.speakers.length * 0.05) % 0.20)).toFixed(2));

    const newSpk = {
      id,
      name: name || `वक्ता ${this.speakers.length + 1}`,
      color: chosenColor,
      pitch,
      rate,
      f0Min: 90 + (this.speakers.length * 25),
      f0Max: 160 + (this.speakers.length * 30),
      desc: `कस्टम वक्ता प्रोफाइल ${this.speakers.length + 1}`
    };

    this.speakers.push(newSpk);
    return newSpk;
  }

  startVisualizer(canvas, pitchElement) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const freqData = new Uint8Array(this.analyser ? this.analyser.frequencyBinCount : 256);
    const timeData = new Uint8Array(this.analyser ? this.analyser.fftSize : 512);

    const render = () => {
      this.animationFrameId = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (!this.isListening || !this.analyser) {
        // Draw flat line when idle
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      // 1. Draw Frequency spectrum background bars
      this.analyser.getByteFrequencyData(freqData);
      const barWidth = (width / 40);
      let x = 0;
      for (let i = 0; i < 40; i++) {
        const val = freqData[i * 2] || 0;
        const barHeight = (val / 255) * (height * 0.7);
        const curSpk = this.getCurrentSpeaker();

        ctx.fillStyle = this.hexToRgba(curSpk.color, 0.25);
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }

      // 2. Draw Waveform line
      this.analyser.getByteTimeDomainData(timeData);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = this.getCurrentSpeaker().color;
      ctx.beginPath();

      const sliceWidth = width * 1.0 / timeData.length;
      let posX = 0;

      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i] / 128.0;
        const posY = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(posX, posY);
        } else {
          ctx.lineTo(posX, posY);
        }
        posX += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // 3. Update Pitch Indicator
      const pitch = this.detectPitch();
      if (pitchElement) {
        if (pitch > 0) {
          pitchElement.textContent = `${pitch} Hz (${this.getCurrentSpeaker().name})`;
          pitchElement.style.color = this.getCurrentSpeaker().color;
        } else {
          pitchElement.textContent = `शांत (तैयार)`;
          pitchElement.style.color = '#94a3b8';
        }
      }
    };

    render();
  }

  stopVisualizer() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  hexToRgba(hex, alpha) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
    }
    return `rgba(59, 130, 246, ${alpha})`;
  }
}

// Global instance
window.bhashaAudio = new BhashaAudioEngine();
