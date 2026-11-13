/**
 * BhashaSetu - Universal Device, Screen, System Audio & Media Stream Translator
 * Works across Tablet, Mobile, and Desktop to translate ANY language playing or displayed on the device.
 *
 * Capabilities:
 * 1. System / Browser Tab / Screen Audio & Video Capture (getDisplayMedia)
 * 2. Mobile / Tablet / Desktop Ambient Media Speaker Listener
 * 3. Multi-Language Live Broadcast Stream Simulator & Local Video/Audio File Player with Live Hindi Subtitles
 * 4. Clipboard & Cross-App Live Text Watcher
 * 5. Picture-in-Picture (PiP) Floating Live Hindi Subtitle Window
 */

const LIVE_MEDIA_CHANNELS = {
  'global-news': {
    title: '🌍 ग्लोबल न्यूज़ डेस्क (8 अंतरराष्ट्रीय भाषाएँ)',
    subtitle: 'English • Español • 日本語 • 한국어 • Français • Русский • العربية • Deutsch',
    segments: [
      { lang: 'en', speakerIdx: 0, text: 'Welcome to our live broadcast', context: 'Global News Anchor (English)' },
      { lang: 'es', speakerIdx: 1, text: 'Bienvenidos a la transmisión en vivo', context: 'Madrid Correspondent (Español)' },
      { lang: 'ja', speakerIdx: 2, text: '本日のニュースをお伝えします', context: 'Tokyo Bureau (日本語)' },
      { lang: 'ko', speakerIdx: 1, text: '생방송에 오신 것을 환영합니다', context: 'Seoul Studio (한국어)' },
      { lang: 'fr', speakerIdx: 3, text: 'Bienvenue dans notre conférence', context: 'Paris Reporter (Français)' },
      { lang: 'ar', speakerIdx: 0, text: 'أهلا بكم في البث المباشر', context: 'Dubai Desk (العربية)' },
      { lang: 'ru', speakerIdx: 3, text: 'Здравствуйте, помогите мне', context: 'Moscow Feed (Русский)' },
      { lang: 'de', speakerIdx: 2, text: 'Guten Morgen, wie geht es Ihnen', context: 'Berlin Studio (Deutsch)' }
    ]
  },
  'indian-regional': {
    title: '🇮🇳 भारतीय प्रादेशिक संवाद (8 भारतीय भाषाएँ)',
    subtitle: 'தமிழ் • తెలుగు • മലയാളം • ಕನ್ನಡ • বাংলা • मराठी • ગુજરાતી • ਪੰਜਾਬੀ',
    segments: [
      { lang: 'ta', speakerIdx: 1, text: 'நேரலை ஒளிபரப்பிற்கு வரவேற்கிறோம்', context: 'चेन्नई स्टूडियो (तमिल)' },
      { lang: 'te', speakerIdx: 0, text: 'నమస్కారం, మీరు ఎలా ఉన్నారు', context: 'हैदराबाद संवाददाता (तेलुगु)' },
      { lang: 'ml', speakerIdx: 2, text: 'നമസ്കാരം, സുപ്രഭാതം', context: 'कोच्चि डेस्क (मलयालम)' },
      { lang: 'kn', speakerIdx: 3, text: 'ನಮಸ್ಕಾರ, ಧನ್ಯವಾದಗಳು', context: 'बेंगलुरु लाइव (कन्नड़)' },
      { lang: 'bn', speakerIdx: 1, text: 'নমস্কার, কেমন আছেন', context: 'कोलकाता पैनल (बंगाली)' },
      { lang: 'mr', speakerIdx: 0, text: 'नमस्कार, तुम्ही कसे आहात', context: 'मुंबई वार्ता (मराठी)' },
      { lang: 'gu', speakerIdx: 2, text: 'નમસ્તે, તમે કેમ છો', context: 'अहमदाबाद चर्चा (गुजराती)' },
      { lang: 'pa', speakerIdx: 3, text: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਧੰਨਵਾਦ', context: 'अमृतसर फीड (पंजाबी)' }
    ]
  },
  'tech-conference': {
    title: '💻 टेक व मेडिकल समिट (डेस्कटॉप/टैबलेट मीटिंग)',
    subtitle: 'English • 中文 • Português • Italiano • Türkçe • ไทย • Tiếng Việt',
    segments: [
      { lang: 'en', speakerIdx: 0, text: 'Artificial intelligence is transforming technology', context: 'Keynote Speaker (English)' },
      { lang: 'zh', speakerIdx: 2, text: '欢迎观看直播', context: 'Shenzhen Lab (中文)' },
      { lang: 'en', speakerIdx: 1, text: 'The patient needs immediate medical attention', context: 'Telemedicine Panel (English)' },
      { lang: 'pt', speakerIdx: 3, text: 'Olá, bom dia, obrigado', context: 'São Paulo Team (Português)' },
      { lang: 'it', speakerIdx: 2, text: 'Ciao, buongiorno, grazie', context: 'Milan Design Hub (Italiano)' },
      { lang: 'tr', speakerIdx: 0, text: 'Merhaba, teşekkür ederim', context: 'Istanbul Summit (Türkçe)' },
      { lang: 'th', speakerIdx: 1, text: 'สวัสดี, ขอบคุณ', context: 'Bangkok Forum (ไทย)' },
      { lang: 'vi', speakerIdx: 2, text: 'Xin chào, cảm ơn', context: 'Hanoi Tech (Tiếng Việt)' }
    ]
  }
};

class BhashaDeviceMedia {
  constructor() {
    this.displayStream = null;
    this.isCapturingDisplay = false;
    this.isAmbientListening = false;
    this.isSimulatingStream = false;
    this.streamTimer = null;
    this.currentChannelKey = 'global-news';
    this.currentSegmentIdx = 0;

    // Clipboard watcher
    this.isClipboardWatching = false;
    this.lastClipboardText = '';
    this.clipboardTimer = null;

    // Floating Picture-in-Picture (PiP) Subtitle state
    this.pipCanvas = null;
    this.pipCtx = null;
    this.pipVideo = null;
    this.isPiPActive = false;
    this.lastSubtitleData = {
      originalText: 'टैबलेट, मोबाइल व डेस्कटॉप मीडिया अनुवादक तैयार है...',
      hindiText: 'कोई भी वीडियो, ऑडियो या स्क्रीन चलाएं — यहाँ तुरंत हिन्दी अनुवाद दिखेगा',
      detectedLangName: '🌐 ऑटो पहचान',
      speakerName: 'भाषा सेतु',
      speakerColor: '#f59e0b',
      context: 'लाइव सबटाइटल'
    };

    // Callbacks
    this.onTranslatedSegment = null;
    this.onStatusChange = null;
  }

  /**
   * Detect current device form factor (Mobile, Tablet, Desktop)
   */
  getDeviceProfile() {
    const ua = navigator.userAgent || '';
    const width = window.innerWidth || 1024;
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const hasDisplayMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

    let type = 'डेस्कटॉप (Desktop)';
    let icon = '🖥️';
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (isTouch && width >= 600 && width <= 1180)) {
      type = 'टैबलेट (Tablet)';
      icon = '📱';
    } else if (/Mobile|Android|iPhone|iPod/i.test(ua) || width < 600) {
      type = 'मोबाइल (Mobile)';
      icon = '📲';
    }

    return {
      type,
      icon,
      hasDisplayMedia,
      isTouch,
      width
    };
  }

  /**
   * 1. Capture System / Browser Tab / Screen Audio & Video (Desktop & Supported Tablets)
   */
  async startSystemScreenCapture(previewVideoEl, sourceLang = 'auto') {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('इस डिवाइस ब्राउज़र पर डायरेक्ट स्क्रीन शेयरिंग उपलब्ध नहीं है। कृपया "स्पीकर/मीडिया लिसनर" या "लाइव स्ट्रीम प्लेयर" का उपयोग करें।');
    }

    try {
      this.stopAllMediaModes();

      this.displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true
        }
      });

      this.isCapturingDisplay = true;

      if (previewVideoEl) {
        previewVideoEl.srcObject = this.displayStream;
        previewVideoEl.muted = true; // Avoid feedback loop
        await previewVideoEl.play().catch(() => {});
      }

      // Listen for user stopping screen share from browser bar
      const videoTrack = this.displayStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopSystemScreenCapture(previewVideoEl);
        };
      }

      // Connect audio & start STT
      window.bhashaSTT.setLanguage(sourceLang);
      await window.bhashaSTT.start('system-tab', this.displayStream);

      if (this.onStatusChange) {
        this.onStatusChange({
          active: true,
          mode: 'system-tab',
          message: '🖥️ स्क्रीन/टैब ऑडियो व वीडियो कैप्चर सक्रिय है — चल रही भाषा का लाइव हिन्दी अनुवाद हो रहा है'
        });
      }
      return true;
    } catch (err) {
      this.isCapturingDisplay = false;
      throw err;
    }
  }

  stopSystemScreenCapture(previewVideoEl) {
    if (this.displayStream) {
      this.displayStream.getTracks().forEach(t => t.stop());
      this.displayStream = null;
    }
    if (previewVideoEl) {
      previewVideoEl.srcObject = null;
    }
    this.isCapturingDisplay = false;
    if (window.bhashaSTT && window.bhashaSTT.isRecording) {
      window.bhashaSTT.stop();
    }
    if (this.onStatusChange) {
      this.onStatusChange({
        active: false,
        mode: 'idle',
        message: 'स्क्रीन/टैब कैप्चर बंद किया गया'
      });
    }
  }

  /**
   * 2. Mobile / Tablet / Desktop Ambient Speaker Listener Mode
   * Listens to audio playing on the device speaker or nearby media in any language
   */
  async startAmbientMediaListener(sourceLang = 'auto') {
    this.stopAllMediaModes();
    this.isAmbientListening = true;
    window.bhashaSTT.setLanguage(sourceLang);
    await window.bhashaSTT.start('ambient-media');

    if (this.onStatusChange) {
      this.onStatusChange({
        active: true,
        mode: 'ambient-media',
        message: '📲 डिवाइस स्पीकर/मीडिया लिसनर सक्रिय — टैबलेट, मोबाइल या डेस्कटॉप पर बज रही किसी भी भाषा को सुनकर अनुवाद कर रहा है'
      });
    }
  }

  stopAmbientMediaListener() {
    this.isAmbientListening = false;
    if (window.bhashaSTT && window.bhashaSTT.isRecording) {
      window.bhashaSTT.stop();
    }
    if (this.onStatusChange) {
      this.onStatusChange({
        active: false,
        mode: 'idle',
        message: 'डिवाइस स्पीकर लिसनर बंद किया गया'
      });
    }
  }

  /**
   * 3. Multi-Language Live Broadcast Stream Simulator (Works 100% offline/online on Mobile, Tablet & Desktop)
   * Simulates or plays multi-language media running on the device and translates each segment live.
   */
  async startLiveMediaStreamDemo(channelKey = 'global-news', canvasEl = null) {
    this.stopAllMediaModes();
    this.currentChannelKey = LIVE_MEDIA_CHANNELS[channelKey] ? channelKey : 'global-news';
    this.currentSegmentIdx = 0;
    this.isSimulatingStream = true;

    const channel = LIVE_MEDIA_CHANNELS[this.currentChannelKey];
    if (this.onStatusChange) {
      this.onStatusChange({
        active: true,
        mode: 'live-stream',
        message: `📺 लाइव स्ट्रीम चल रही है: ${channel.title}`
      });
    }

    const processNextSegment = async () => {
      if (!this.isSimulatingStream) return;
      const seg = channel.segments[this.currentSegmentIdx % channel.segments.length];
      this.currentSegmentIdx++;

      await this.processMediaSegment(seg.text, 'auto', seg.speakerIdx, seg.context, canvasEl);
    };

    // Process first segment immediately, then every 4.5 seconds
    await processNextSegment();
    this.streamTimer = setInterval(processNextSegment, 4500);
  }

  stopLiveMediaStreamDemo() {
    this.isSimulatingStream = false;
    if (this.streamTimer) {
      clearInterval(this.streamTimer);
      this.streamTimer = null;
    }
    if (this.onStatusChange) {
      this.onStatusChange({
        active: false,
        mode: 'idle',
        message: 'लाइव मीडिया स्ट्रीम रोकी गई'
      });
    }
  }

  stopAllMediaModes(previewVideoEl = null) {
    if (this.isCapturingDisplay) this.stopSystemScreenCapture(previewVideoEl);
    if (this.isAmbientListening) this.stopAmbientMediaListener();
    if (this.isSimulatingStream) this.stopLiveMediaStreamDemo();
  }

  /**
   * Process any media/screen/clipboard text segment: detect language, translate to Hindi, update PiP & UI
   */
  async processMediaSegment(text, sourceLang = 'auto', speakerIdx = null, contextLabel = 'डिवाइस मीडिया', canvasEl = null) {
    if (!text || !text.trim()) return null;

    // Select speaker profile
    if (speakerIdx !== null && window.bhashaAudio) {
      window.bhashaAudio.setSpeakerByIndex(speakerIdx % window.bhashaAudio.speakers.length);
    }
    const speaker = window.bhashaAudio ? window.bhashaAudio.getCurrentSpeaker() : {
      id: 'speaker-1',
      name: 'वक्ता 1',
      color: '#10b981',
      pitch: 1.0,
      rate: 1.0
    };

    // Auto-detect language & translate to Hindi
    const meta = await window.bhashaTranslator.translateWithMeta(text, sourceLang);

    const record = {
      speakerId: speaker.id,
      speakerName: speaker.name,
      speakerColor: speaker.color,
      originalText: text.trim(),
      sourceLang: meta.detectedLang,
      detectedLangName: meta.detectedLangName,
      hindiText: meta.translatedText,
      timestamp: Date.now(),
      pitch: speaker.pitch,
      isOffline: meta.isOffline,
      mediaContext: contextLabel
    };

    this.lastSubtitleData = {
      originalText: record.originalText,
      hindiText: record.hindiText,
      detectedLangName: record.detectedLangName,
      speakerName: record.speakerName,
      speakerColor: record.speakerColor,
      context: contextLabel
    };

    // Render visual frame on media canvas and PiP canvas
    if (canvasEl) {
      this.drawBroadcastFrame(canvasEl, this.lastSubtitleData);
    }
    this.renderPiPFrame();

    // Save to storage
    if (window.bhashaStorage) {
      record.id = await window.bhashaStorage.addMessage(record);
    }

    // Notify UI & speak in Hindi
    if (this.onTranslatedSegment) {
      this.onTranslatedSegment(record);
    }

    if (window.bhashaTTS) {
      window.bhashaTTS.speak(record.hindiText, speaker);
    }

    if (window.bhashaSync) {
      await window.bhashaSync.broadcastMessage(record);
    }

    return record;
  }

  /**
   * Draw Live Broadcast & Subtitle Frame onto Media Preview Canvas
   */
  drawBroadcastFrame(canvas, data) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle broadcast grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Top bar badge: Context & Detected Language
    ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
    ctx.fillRect(16, 14, w - 32, 34);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`📺 ${data.context}  •  पहचानी गई भाषा: ${data.detectedLangName}`, 26, 36);

    // Original text middle display
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px sans-serif';
    const origClipped = data.originalText.length > 65 ? data.originalText.slice(0, 65) + '...' : data.originalText;
    ctx.fillText(`मूल संवाद: "${origClipped}"`, 24, 86);

    // Bottom Hindi Subtitle Box
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(16, h - 78, w - 32, 62);
    ctx.strokeStyle = data.speakerColor || '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, h - 78, w - 32, 62);

    ctx.fillStyle = data.speakerColor || '#10b981';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`🔊 ${data.speakerName} (हिन्दी अनुवाद):`, 28, h - 54);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 18px sans-serif';
    const hindiClipped = data.hindiText.length > 60 ? data.hindiText.slice(0, 60) + '...' : data.hindiText;
    ctx.fillText(hindiClipped, 28, h - 28);
  }

  /**
   * 4. Clipboard Live Monitor & Instant Paste Translation
   */
  async translateFromClipboard(canvasEl = null) {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      throw new Error('क्लिपबोर्ड एक्सेस समर्थित नहीं है। कृपया नीचे टेक्स्ट बॉक्स में पेस्ट करें।');
    }
    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) {
      throw new Error('क्लिपबोर्ड खाली है। किसी भी ऐप या वेबसाइट से कोई भी भाषा का टेक्स्ट कॉपी करें।');
    }
    this.lastClipboardText = text.trim();
    return await this.processMediaSegment(this.lastClipboardText, 'auto', null, 'क्लिपबोर्ड अनुवाद', canvasEl);
  }

  toggleClipboardWatch(enable, canvasEl = null) {
    this.isClipboardWatching = enable !== undefined ? enable : !this.isClipboardWatching;
    if (this.clipboardTimer) {
      clearInterval(this.clipboardTimer);
      this.clipboardTimer = null;
    }

    if (this.isClipboardWatching) {
      this.clipboardTimer = setInterval(async () => {
        if (!document.hasFocus()) return;
        try {
          const text = await navigator.clipboard.readText();
          if (text && text.trim() && text.trim() !== this.lastClipboardText) {
            this.lastClipboardText = text.trim();
            await this.processMediaSegment(this.lastClipboardText, 'auto', null, 'ऑटो-क्लिपबोर्ड', canvasEl);
          }
        } catch (e) {
          // Ignore permission prompts when polling
        }
      }, 2500);
    }
    return this.isClipboardWatching;
  }

  /**
   * 5. Floating Picture-in-Picture (PiP) Subtitle Window for Desktop, Tablet & Mobile
   */
  initPiPElements() {
    if (this.pipCanvas) return;
    this.pipCanvas = document.createElement('canvas');
    this.pipCanvas.width = 640;
    this.pipCanvas.height = 220;
    this.pipCtx = this.pipCanvas.getContext('2d');

    this.pipVideo = document.createElement('video');
    this.pipVideo.muted = true;
    this.pipVideo.playsInline = true;
    this.pipVideo.style.position = 'fixed';
    this.pipVideo.style.bottom = '0';
    this.pipVideo.style.right = '0';
    this.pipVideo.style.width = '1px';
    this.pipVideo.style.height = '1px';
    this.pipVideo.style.opacity = '0.01';
    this.pipVideo.style.pointerEvents = 'none';
    document.body.appendChild(this.pipVideo);

    this.renderPiPFrame();
  }

  renderPiPFrame() {
    if (!this.pipCtx || !this.pipCanvas) return;
    this.drawBroadcastFrame(this.pipCanvas, this.lastSubtitleData);
  }

  async togglePiPSubtitles() {
    this.initPiPElements();
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        this.isPiPActive = false;
        return false;
      }

      this.renderPiPFrame();
      if (!this.pipVideo.srcObject && this.pipCanvas.captureStream) {
        this.pipVideo.srcObject = this.pipCanvas.captureStream(15);
      }
      await this.pipVideo.play();
      if (this.pipVideo.requestPictureInPicture) {
        await this.pipVideo.requestPictureInPicture();
        this.isPiPActive = true;
        this.pipVideo.addEventListener('leavepictureinpicture', () => {
          this.isPiPActive = false;
        }, { once: true });
        return true;
      } else {
        throw new Error('Picture-in-Picture समर्थित नहीं है');
      }
    } catch (err) {
      console.warn('[DeviceMedia] PiP fallback:', err.message);
      throw err;
    }
  }
}

window.LIVE_MEDIA_CHANNELS = LIVE_MEDIA_CHANNELS;
window.bhashaDeviceMedia = new BhashaDeviceMedia();
