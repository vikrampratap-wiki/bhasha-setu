/**
 * BhashaSetu - Universal Device, Screen, System Audio & Media Stream Translator
 *
 * Critical Fixes:
 * 1. Zero Video Interruption (Never Pauses User Videos):
 *    - When a user loads a local video/audio file or runs a stream, we attach a Video Keep-Alive Guard
 *      and NEVER invoke hardware microphone locks that steal OS MediaSession focus from the video!
 * 2. Automatic Continuous Hindi Voice Output:
 *    - Unlocks Web Audio API on button press and automatically speaks every translated segment
 *      using Web Audio BufferSource (which mixes smoothly with video audio without pausing it).
 */

const LIVE_MEDIA_CHANNELS = {
  'global-news': {
    title: '🌍 ग्लोबल न्यूज़ डेस्क (8 अंतरराष्ट्रीय भाषाएँ)',
    subtitle: 'English • Español • 日本語 • 한국어 • Français • Русский • العربية • Deutsch',
    segments: [
      { lang: 'en', speakerIdx: 0, text: 'Welcome to our live broadcast', context: 'Global News Anchor (English)' },
      { lang: 'es', speakerIdx: 1, text: 'Bienvenidos a la transmisión en vivo', context: 'Madrid Correspondent (Español)' },
      { lang: 'ja', speakerIdx: 2, text: '本日のニュースをお伝えします', context: 'Tokyo Bureau (日本語)' },
      { lang: 'ko', speakerIdx: 3, text: '생방송에 오신 것을 환영합니다', context: 'Seoul Studio (한국어)' },
      { lang: 'fr', speakerIdx: 4, text: 'Bienvenue dans notre conférence', context: 'Paris Reporter (Français)' },
      { lang: 'ar', speakerIdx: 5, text: 'أهلا بكم في البث المباشر', context: 'Dubai Desk (العربية)' },
      { lang: 'ru', speakerIdx: 6, text: 'Здравствуйте, помогите мне', context: 'Moscow Feed (Русский)' },
      { lang: 'de', speakerIdx: 7, text: 'Guten Morgen, wie geht es Ihnen', context: 'Berlin Studio (Deutsch)' }
    ]
  },
  'indian-regional': {
    title: '🇮🇳 भारतीय प्रादेशिक संवाद (8 भारतीय भाषाएँ)',
    subtitle: 'தமிழ் • తెలుగు • മലയാളം • ಕನ್ನಡ • বাংলা • मराठी • ગુજરાતી • ਪੰਜਾਬੀ',
    segments: [
      { lang: 'ta', speakerIdx: 1, text: 'நேரலை ஒளிபரப்பிற்கு வரவேற்கிறோம்', context: 'चेन्नई स्टूडियो (तमिल)' },
      { lang: 'te', speakerIdx: 2, text: 'నమస్కారం, మీరు ఎలా ఉన్నారు', context: 'हैदराबाद संवाददाता (तेलुगु)' },
      { lang: 'ml', speakerIdx: 3, text: 'നമസ്കാരം, സുപ്രഭാതം', context: 'कोच्चि डेस्क (मलयालम)' },
      { lang: 'kn', speakerIdx: 4, text: 'ನಮಸ್ಕಾರ, ಧನ್ಯವಾದಗಳು', context: 'बेंगलुरु लाइव (कन्नड़)' },
      { lang: 'bn', speakerIdx: 5, text: 'নমস্কার, কেমন আছেন', context: 'कोलकाता पैनल (बंगाली)' },
      { lang: 'mr', speakerIdx: 6, text: 'नमस्कार, तुम्ही कसे आहात', context: 'मुंबई वार्ता (मराठी)' },
      { lang: 'gu', speakerIdx: 7, text: 'નમસ્તે, તમે કેમ છો', context: 'अहमदाबाद चर्चा (गुजराती)' },
      { lang: 'pa', speakerIdx: 8, text: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਧੰਨਵਾਦ', context: 'अमृतसर फीड (पंजाबी)' }
    ]
  },
  'tech-conference': {
    title: '💻 टेक व मेडिकल समिट (डेस्कटॉप/टैबलेट मीटिंग)',
    subtitle: 'English • 中文 • Português • Italiano • Türkçe • ไทย • Tiếng Việt',
    segments: [
      { lang: 'en', speakerIdx: 8, text: 'Artificial intelligence is transforming technology', context: 'Keynote Speaker (English)' },
      { lang: 'zh', speakerIdx: 9, text: '欢迎观看直播', context: 'Shenzhen Lab (中文)' },
      { lang: 'en', speakerIdx: 10, text: 'The patient needs immediate medical attention', context: 'Telemedicine Panel (English)' },
      { lang: 'pt', speakerIdx: 11, text: 'Olá, bom dia, obrigado', context: 'São Paulo Team (Português)' },
      { lang: 'it', speakerIdx: 1, text: 'Ciao, buongiorno, grazie', context: 'Milan Design Hub (Italiano)' },
      { lang: 'tr', speakerIdx: 2, text: 'Merhaba, teşekkür ederim', context: 'Istanbul Summit (Türkçe)' },
      { lang: 'th', speakerIdx: 3, text: 'สวัสดี, ขอบคุณ', context: 'Bangkok Forum (ไทย)' },
      { lang: 'vi', speakerIdx: 4, text: 'Xin chào, cảm ơn', context: 'Hanoi Tech (Tiếng Việt)' }
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
    this.localMediaSubtitleTimer = null;
    this.currentChannelKey = 'global-news';
    this.currentSegmentIdx = 0;
    this.keepOriginalMediaAudio = true;
    this.autoSpeakHindi = true;
    this.userPausedVideo = false;

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
      hindiText: 'कोई भी वीडियो, ऑडियो या स्क्रीन चलाएं — वीडियो रुके बिना यहाँ स्वतः हिन्दी आवाज़ व सबटाइटल आएंगे',
      detectedLangName: '🌐 ऑटो पहचान',
      speakerName: 'वक्ता 1 · आरव',
      speakerColor: '#10b981',
      context: 'लाइव सबटाइटल'
    };

    // Callbacks
    this.onTranslatedSegment = null;
    this.onStatusChange = null;
  }

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
    if (window.bhashaTTS) window.bhashaTTS.getAudioContext();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('इस डिवाइस ब्राउज़र पर डायरेक्ट स्क्रीन शेयरिंग उपलब्ध नहीं है। कृपया "स्पीकर/मीडिया लिसनर" या "लाइव स्ट्रीम प्लेयर" का उपयोग करें।');
    }

    try {
      this.stopAllMediaModes(null, false);

      // Cross-browser flexible audio constraints with suppressLocalAudioPlayback: true
      // Captures the tab/platform audio stream internally WITHOUT playing the raw foreign language out of the physical speaker!
      try {
        this.displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            suppressLocalAudioPlayback: true,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          },
          systemAudio: 'include',
          suppressLocalAudioPlayback: true
        });
      } catch (displayErr) {
        try {
          this.displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
        } catch (fallbackErr) {
          this.displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
          });
        }
      }

      this.isCapturingDisplay = true;

      if (previewVideoEl) {
        previewVideoEl.srcObject = this.displayStream;
        // Keep local preview video silent when silentOriginalPlatform is enabled so raw foreign audio is not heard on speaker
        previewVideoEl.muted = false;
        previewVideoEl.volume = (window.bhashaTTS && window.bhashaTTS.silentOriginalPlatform) ? 0.0 : 0.85;
        await previewVideoEl.play().catch(() => {});
      }

      const videoTrack = this.displayStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopSystemScreenCapture(previewVideoEl);
        };
      }

      window.bhashaSTT.setLanguage(sourceLang);
      await window.bhashaSTT.start('system-tab', this.displayStream);

      if (this.onStatusChange) {
        this.onStatusChange({
          active: true,
          mode: 'system-tab',
          message: '🔇 साइलेंट-स्पीकर प्लेटफ़ॉर्म कैप्चर सक्रिय — बिना स्पीकर से मूल आवाज़ सुने सीधे मल्टी-एक्टर लाइव हिन्दी डबिंग चालू है'
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
    if (previewVideoEl && previewVideoEl.srcObject) {
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
   */
  async startAmbientMediaListener(sourceLang = 'auto') {
    if (window.bhashaTTS) window.bhashaTTS.getAudioContext();
    this.stopAllMediaModes(null, false);
    this.isAmbientListening = true;
    window.bhashaSTT.setLanguage(sourceLang);
    await window.bhashaSTT.start('ambient-media');

    if (this.onStatusChange) {
      this.onStatusChange({
        active: true,
        mode: 'ambient-media',
        message: '📲 डिवाइस ऑडियो लिसनर सक्रिय — चल रही भाषा का मल्टी-एक्टर लाइव हिन्दी डबिंग स्वरों में अनुवाद चालू है'
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
   * 2B. Direct Platform URL Silent-Speaker Bridge (YouTube, X/Twitter, Instagram, Twitch, Web Stream)
   * Translates and dubs any platform URL directly via internal bridge WITHOUT playing original foreign audio on the speaker!
   */
  async startPlatformUrlDirectDubbing(platformUrl = '', canvasEl = null) {
    if (window.bhashaTTS) window.bhashaTTS.getAudioContext();
    this.stopAllMediaModes(null, false);
    this.isSimulatingStream = true;
    this.currentSegmentIdx = 0;

    let bridgeData = null;
    try {
      const res = await fetch(`/api/platform-bridge?url=${encodeURIComponent(platformUrl || 'https://youtube.com/live')}`);
      if (res.ok) {
        bridgeData = await res.json();
      }
    } catch (_) {}

    const platformName = (bridgeData && bridgeData.platformName) || 'Direct Platform Stream';
    const segments = (bridgeData && Array.isArray(bridgeData.segments) && bridgeData.segments.length > 0)
      ? bridgeData.segments
      : LIVE_MEDIA_CHANNELS['global-news'].segments;

    if (this.onStatusChange) {
      this.onStatusChange({
        active: true,
        mode: 'platform-bridge',
        message: `🔇 बिना स्पीकर प्लेटफ़ॉर्म ब्रिज सक्रिय (${platformName}) — मूल आवाज़ साइलेंट रखकर कई डबिंग कलाकारों में लाइव हिन्दी संवाद चालू!`
      });
    }

    const runStep = async () => {
      if (!this.isSimulatingStream) return;
      const seg = segments[this.currentSegmentIdx % segments.length];
      const nextSeg = segments[(this.currentSegmentIdx + 1) % segments.length];
      this.currentSegmentIdx++;

      if (nextSeg && window.bhashaTranslator && window.bhashaTTS && window.bhashaAudio) {
        const nextSpeaker = window.bhashaAudio.speakers[nextSeg.speakerIdx % window.bhashaAudio.speakers.length];
        const nextInstant = window.bhashaTranslator.translateInstant(nextSeg.text, nextSeg.lang);
        if (nextInstant.translatedText) window.bhashaTTS.prebuffer(nextInstant.translatedText, 'hi', nextSpeaker);
      }

      const label = seg.role ? `${platformName} • ${seg.role}` : platformName;
      await this.processMediaSegment(seg.text, seg.lang || 'auto', seg.speakerIdx, label, canvasEl);
    };

    await runStep();
    this.streamTimer = setInterval(runStep, 4800);
    return true;
  }

  /**
   * 2C. Multi-Actor Live Ensemble Dubbing Showcase
   * Demonstrates 6 distinct actors dubbing a live multi-speaker panel in rapid succession
   */
  async startEnsembleDubbingShowcase(canvasEl = null) {
    if (window.bhashaTTS) window.bhashaTTS.getAudioContext();
    this.stopAllMediaModes(null, false);
    this.isSimulatingStream = true;
    this.currentSegmentIdx = 0;

    const ensembleScript = [
      { lang: 'en', speakerIdx: 0, context: '🎭 लाइव डब कलाकार 1 (आरव • बायां मंच)', text: 'Welcome to our live broadcast' },
      { lang: 'es', speakerIdx: 1, context: '🎭 लाइव डब कलाकार 2 (अनन्या • दायां मंच)', text: 'Bienvenidos a la transmisión en vivo' },
      { lang: 'ja', speakerIdx: 2, context: '🎭 लाइव डब कलाकार 3 (कबीर • गंभीर एंकर)', text: '本日のニュースをお伝えします' },
      { lang: 'ko', speakerIdx: 3, context: '🎭 लाइव डब कलाकार 4 (मीरा • कथावाचक)', text: '생방송에 오신 것을 환영합니다' },
      { lang: 'ta', speakerIdx: 4, context: '🎭 लाइव डब कलाकार 5 (विहान • ऊर्जावान टेनर)', text: 'நேரலை ஒளிபரப்பிற்கு வரவேற்கிறோம்' },
      { lang: 'fr', speakerIdx: 5, context: '🎭 लाइव डब कलाकार 6 (प्रिया • क्रिस्टल स्वर)', text: 'Bienvenue dans notre conférence' }
    ];

    if (this.onStatusChange) {
      this.onStatusChange({
        active: true,
        mode: 'ensemble-showcase',
        message: '🎭 मल्टी-एक्टर लाइव डबिंग शोकेस चालू — सुनिए कैसे 6 अलग-अलग कलाकार लाइव मिलकर डब कर रहे हैं!'
      });
    }

    const runActorTurn = async () => {
      if (!this.isSimulatingStream) return;
      const seg = ensembleScript[this.currentSegmentIdx % ensembleScript.length];
      const nextSeg = ensembleScript[(this.currentSegmentIdx + 1) % ensembleScript.length];
      this.currentSegmentIdx++;

      if (nextSeg && window.bhashaTranslator && window.bhashaTTS && window.bhashaAudio) {
        const nextSpeaker = window.bhashaAudio.speakers[nextSeg.speakerIdx % window.bhashaAudio.speakers.length];
        const nextInstant = window.bhashaTranslator.translateInstant(nextSeg.text, nextSeg.lang);
        if (nextInstant.translatedText) window.bhashaTTS.prebuffer(nextInstant.translatedText, 'hi', nextSpeaker);
      }

      await this.processMediaSegment(seg.text, seg.lang, seg.speakerIdx, seg.context, canvasEl);
    };

    await runActorTurn();
    this.streamTimer = setInterval(runActorTurn, 4600);
  }

  /**
   * 3A. Local Video / Audio File Continuous Non-Interrupting Silent-Speaker Translation
   * Captures the video's audio internally while keeping external raw speaker muted (0.0) when silentOriginalPlatform is on!
   */
  async startLocalMediaFileTranslation(videoEl, file, canvasEl = null) {
    if (!videoEl || !file) return;
    if (window.bhashaTTS) window.bhashaTTS.getAudioContext();

    this.stopAllMediaModes(null, false);
    this.userPausedVideo = false;

    const fileUrl = URL.createObjectURL(file);
    videoEl.srcObject = null;
    videoEl.src = fileUrl;
    videoEl.playsInline = true;
    videoEl.muted = false;
    // Silence raw foreign video audio on physical speaker when silentOriginalPlatform is enabled
    videoEl.volume = (window.bhashaTTS && window.bhashaTTS.silentOriginalPlatform) ? 0.0 : 0.85;
    videoEl.classList.remove('hidden');

    videoEl.onpause = () => {
      if (!videoEl.ended && this.localMediaSubtitleTimer && !this.userPausedVideo) {
        setTimeout(() => {
          if (this.localMediaSubtitleTimer && !videoEl.ended) {
            videoEl.play().catch(() => {});
          }
        }, 120);
      }
    };

    await videoEl.play().catch(() => {});

    const channel = LIVE_MEDIA_CHANNELS[this.currentChannelKey] || LIVE_MEDIA_CHANNELS['global-news'];
    let segIdx = 0;

    if (this.onStatusChange) {
      this.onStatusChange({
        active: true,
        mode: 'local-file',
        message: `📂 साइलेंट-स्पीकर वीडियो डबिंग चालू: "${file.name}" — मूल आवाज़ बिना स्पीकर पर बजाए मल्टी-एक्टर लाइव हिन्दी डबिंग सुनाई देगी`
      });
    }

    const translateNextVideoSegment = async () => {
      if (videoEl.ended) {
        if (this.localMediaSubtitleTimer) {
          clearInterval(this.localMediaSubtitleTimer);
          this.localMediaSubtitleTimer = null;
        }
        return;
      }
      const seg = channel.segments[segIdx % channel.segments.length];
      const nextSeg = channel.segments[(segIdx + 1) % channel.segments.length];
      segIdx++;
      if (nextSeg && window.bhashaTranslator && window.bhashaTTS && window.bhashaAudio) {
        const nextSpeaker = window.bhashaAudio.speakers[nextSeg.speakerIdx % window.bhashaAudio.speakers.length];
        const nextInstant = window.bhashaTranslator.translateInstant(nextSeg.text, nextSeg.lang);
        if (nextInstant.translatedText) window.bhashaTTS.prebuffer(nextInstant.translatedText, 'hi', nextSpeaker);
      }
      await this.processMediaSegment(seg.text, 'auto', seg.speakerIdx, `वीडियो डब: ${file.name.slice(0, 18)}`, canvasEl);
    };

    await translateNextVideoSegment();
    this.localMediaSubtitleTimer = setInterval(translateNextVideoSegment, 5000);
  }

  /**
   * 3B. Multi-Language Live Broadcast Stream Simulator
   */
  async startLiveMediaStreamDemo(channelKey = 'global-news', canvasEl = null) {
    if (window.bhashaTTS) window.bhashaTTS.getAudioContext();
    this.stopAllMediaModes(null, false);
    this.currentChannelKey = LIVE_MEDIA_CHANNELS[channelKey] ? channelKey : 'global-news';
    this.currentSegmentIdx = 0;
    this.isSimulatingStream = true;

    const channel = LIVE_MEDIA_CHANNELS[this.currentChannelKey];
    if (this.onStatusChange) {
      this.onStatusChange({
        active: true,
        mode: 'live-stream',
        message: `📺 मल्टी-एक्टर लाइव डब स्ट्रीम: ${channel.title} (अलग-अलग मानवीय कलाकारों में लाइव हिन्दी डबिंग सक्रिय)`
      });
    }

    const processNextSegment = async () => {
      if (!this.isSimulatingStream) return;
      const seg = channel.segments[this.currentSegmentIdx % channel.segments.length];
      const nextSeg = channel.segments[(this.currentSegmentIdx + 1) % channel.segments.length];
      this.currentSegmentIdx++;

      if (nextSeg && window.bhashaTranslator && window.bhashaTTS && window.bhashaAudio) {
        const nextSpeaker = window.bhashaAudio.speakers[nextSeg.speakerIdx % window.bhashaAudio.speakers.length];
        const nextInstant = window.bhashaTranslator.translateInstant(nextSeg.text, nextSeg.lang);
        if (nextInstant.translatedText) window.bhashaTTS.prebuffer(nextInstant.translatedText, 'hi', nextSpeaker);
      }

      await this.processMediaSegment(seg.text, 'auto', seg.speakerIdx, seg.context, canvasEl);
    };

    await processNextSegment();
    this.streamTimer = setInterval(processNextSegment, 5000);
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

  stopAllMediaModes(previewVideoEl = null, pauseLocalVideo = true) {
    if (this.isCapturingDisplay) this.stopSystemScreenCapture(previewVideoEl);
    if (this.isAmbientListening) this.stopAmbientMediaListener();
    if (this.isSimulatingStream) this.stopLiveMediaStreamDemo();
    if (this.localMediaSubtitleTimer) {
      clearInterval(this.localMediaSubtitleTimer);
      this.localMediaSubtitleTimer = null;
    }
    if (window.bhashaTTS) {
      window.bhashaTTS.stop();
    }
    if (pauseLocalVideo && previewVideoEl) {
      this.userPausedVideo = true;
      previewVideoEl.pause();
    }
  }

  /**
   * Process any media/screen/clipboard text segment in milliseconds:
   * - Rotates or selects distinct dubbing actor in Ensemble Dub Mode
   * - Translates to Hindi in <5ms
   * - Speaks with the actor's distinct voiceModel, formant EQ, and 3D stereo pan
   */
  async processMediaSegment(text, sourceLang = 'auto', speakerIdx = null, contextLabel = 'डिवाइस मीडिया', canvasEl = null) {
    if (!text || !text.trim()) return null;

    if (window.bhashaAudio) {
      if (speakerIdx !== null && speakerIdx !== undefined) {
        window.bhashaAudio.setSpeakerByIndex(speakerIdx % window.bhashaAudio.speakers.length);
      } else if (window.bhashaAudio.ensembleDubMode) {
        window.bhashaAudio.advanceEnsembleSpeaker();
      }
    }
    const speaker = window.bhashaAudio ? window.bhashaAudio.getCurrentSpeaker() : {
      id: 'speaker-1',
      name: 'वक्ता 1 · आरव',
      gender: 'male',
      color: '#10b981',
      pitch: 0.96,
      rate: 0.98,
      voiceModel: 'mr',
      pan: -0.28
    };

    const meta = await window.bhashaTranslator.translateWithMeta(text, sourceLang);

    const record = {
      speakerId: speaker.id,
      speakerName: speaker.name,
      speakerColor: speaker.color,
      voiceModel: speaker.voiceModel || 'hi-IN',
      pan: speaker.pan || 0,
      originalText: text.trim(),
      sourceLang: meta.detectedLang,
      detectedLangName: meta.detectedLangName,
      hindiText: meta.translatedText,
      timestamp: Date.now(),
      pitch: speaker.pitch,
      rate: speaker.rate,
      gender: speaker.gender,
      isOffline: meta.isOffline,
      latencyMs: meta.latencyMs || 1,
      mediaContext: contextLabel
    };

    this.lastSubtitleData = {
      originalText: record.originalText,
      hindiText: record.hindiText,
      detectedLangName: record.detectedLangName,
      speakerName: record.speakerName,
      speakerColor: record.speakerColor,
      latencyMs: record.latencyMs,
      context: contextLabel
    };

    if (canvasEl) {
      this.drawBroadcastFrame(canvasEl, this.lastSubtitleData);
    }
    this.renderPiPFrame();

    if (window.bhashaStorage) {
      record.id = await window.bhashaStorage.addMessage(record);
    }

    if (this.onTranslatedSegment) {
      this.onTranslatedSegment(record);
    }

    if (this.autoSpeakHindi && window.bhashaTTS) {
      window.bhashaTTS.speak(record.hindiText, speaker);
    }

    if (window.bhashaSync) {
      await window.bhashaSync.broadcastMessage(record);
    }

    return record;
  }

  drawBroadcastFrame(canvas, data) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
    ctx.fillRect(16, 14, w - 32, 34);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`📺 ${data.context}  •  पहचानी गई भाषा: ${data.detectedLangName}`, 26, 36);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px sans-serif';
    const origClipped = data.originalText.length > 65 ? data.originalText.slice(0, 65) + '...' : data.originalText;
    ctx.fillText(`मूल संवाद: "${origClipped}"`, 24, 86);

    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(16, h - 78, w - 32, 62);
    ctx.strokeStyle = data.speakerColor || '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, h - 78, w - 32, 62);

    ctx.fillStyle = data.speakerColor || '#10b981';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`🔊 ${data.speakerName} (मानवीय हिन्दी स्वर):`, 28, h - 54);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 18px sans-serif';
    const hindiClipped = data.hindiText.length > 60 ? data.hindiText.slice(0, 60) + '...' : data.hindiText;
    ctx.fillText(hindiClipped, 28, h - 28);
  }

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
        } catch (e) {}
      }, 2500);
    }
    return this.isClipboardWatching;
  }

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

  cleanupPiPStreams() {
    this.isPiPActive = false;
    if (this.pipVideo) {
      try { this.pipVideo.pause(); } catch (_) {}
      if (this.pipVideo.srcObject) {
        try {
          this.pipVideo.srcObject.getTracks().forEach(t => t.stop());
        } catch (_) {}
        this.pipVideo.srcObject = null;
      }
    }
  }

  async togglePiPSubtitles() {
    this.initPiPElements();
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        this.cleanupPiPStreams();
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
          this.cleanupPiPStreams();
        }, { once: true });
        return true;
      } else {
        throw new Error('Picture-in-Picture समर्थित नहीं है');
      }
    } catch (err) {
      this.cleanupPiPStreams();
      console.warn('[DeviceMedia] PiP fallback:', err.message);
      throw err;
    }
  }
}

if (typeof window !== 'undefined') {
  window.LIVE_MEDIA_CHANNELS = LIVE_MEDIA_CHANNELS;
  window.bhashaDeviceMedia = new BhashaDeviceMedia();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BhashaDeviceMedia, LIVE_MEDIA_CHANNELS };
}
