/**
 * BhashaSetu - Main Application Controller
 * Coordinates UI, Reliable Speech Listening, Non-Muting Media Translation,
 * 12 Human Speaker Voices, Cross-Device E2EE Sync & Offline Storage
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const micBtn = document.getElementById('mic-btn');
  const micBtnText = document.getElementById('mic-btn-text');
  const micStatusIndicator = document.getElementById('mic-status-indicator');
  const interimBox = document.getElementById('interim-box');
  const conversationList = document.getElementById('conversation-list');
  const langSelect = document.getElementById('source-lang-select');
  const speakerPillsContainer = document.getElementById('speaker-pills');
  const visualizerCanvas = document.getElementById('visualizer-canvas');
  const pitchDisplay = document.getElementById('pitch-display');
  const clarityToggle = document.getElementById('clarity-toggle');
  const offlineToggle = document.getElementById('offline-toggle');
  const networkBadge = document.getElementById('network-badge');
  const deviceTypeBadge = document.getElementById('device-type-badge');
  const clearChatBtn = document.getElementById('clear-chat-btn');
  const exportChatBtn = document.getElementById('export-chat-btn');
  const openMediaTabBtn = document.getElementById('open-media-tab-btn');
  const toastContainer = document.getElementById('toast-container');

  // Direct Live Conversation Input & Phrase Chips (Tab 1)
  const liveChatInput = document.getElementById('live-chat-input');
  const liveChatSendBtn = document.getElementById('live-chat-send-btn');
  const livePhraseChips = document.querySelectorAll('.live-phrase-chip');

  // Device & Media Tab Elements
  const keepMediaAudioToggle = document.getElementById('keep-media-audio-toggle');
  const startScreenCaptureBtn = document.getElementById('start-screen-capture-btn');
  const startAmbientMediaBtn = document.getElementById('start-ambient-media-btn');
  const mediaChannelSelect = document.getElementById('media-channel-select');
  const startStreamDemoBtn = document.getElementById('start-stream-demo-btn');
  const localMediaFileInput = document.getElementById('local-media-file-input');
  const stopAllMediaBtn = document.getElementById('stop-all-media-btn');
  const togglePipBtn = document.getElementById('toggle-pip-btn');
  const mediaStatusText = document.getElementById('media-status-text');
  const mediaDetectedLangPill = document.getElementById('media-detected-lang-pill');
  const mediaBroadcastCanvas = document.getElementById('media-broadcast-canvas');
  const mediaVideoPreview = document.getElementById('media-video-preview');
  const liveSubtitleContext = document.getElementById('live-subtitle-context');
  const mediaLiveOriginal = document.getElementById('media-live-original');
  const mediaLiveSpeaker = document.getElementById('media-live-speaker');
  const mediaLiveHindi = document.getElementById('media-live-hindi');
  const screenTextInput = document.getElementById('screen-text-input');
  const screenTextTranslateBtn = document.getElementById('screen-text-translate-btn');
  const clipboardTranslateBtn = document.getElementById('clipboard-translate-btn');
  const clipboardWatchToggle = document.getElementById('clipboard-watch-toggle');

  // Text Tab Elements
  const quickTextInput = document.getElementById('quick-text-input');
  const quickTranslateBtn = document.getElementById('quick-translate-btn');
  const quickTranslateOutput = document.getElementById('quick-translate-output');
  const quickDetectedLangBadge = document.getElementById('quick-detected-lang-badge');
  const quickSpeakBtn = document.getElementById('quick-speak-btn');
  const quickCopyBtn = document.getElementById('quick-copy-btn');
  const sampleLangBtns = document.querySelectorAll('.sample-lang-btn');

  // Sync Elements
  const roomIdInput = document.getElementById('room-id-input');
  const roomKeyInput = document.getElementById('room-key-input');
  const joinRoomBtn = document.getElementById('join-room-btn');
  const roomFingerprint = document.getElementById('room-fingerprint');
  const peerCountBadge = document.getElementById('peer-count-badge');
  const shareRoomBtn = document.getElementById('share-room-btn');
  const testSyncPingBtn = document.getElementById('test-sync-ping-btn');
  const syncActivityLog = document.getElementById('sync-activity-log');

  // Speakers Tab Elements
  const speakerProfilesList = document.getElementById('speaker-profiles-list');
  const newSpeakerNameInput = document.getElementById('new-speaker-name-input');
  const newSpeakerStyleSelect = document.getElementById('new-speaker-style-select');
  const addSpeakerBtn = document.getElementById('add-speaker-btn');

  // Custom Dict Elements
  const customWordInput = document.getElementById('custom-word-input');
  const customMeaningInput = document.getElementById('custom-meaning-input');
  const addWordBtn = document.getElementById('add-word-btn');
  const customWordsList = document.getElementById('custom-words-list');

  // Non-blocking Toast Helper
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    const colorClasses = type === 'error'
      ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
      : 'bg-slate-900/95 border-amber-500/50 text-amber-200';
    toast.className = `px-4 py-2.5 rounded-xl border shadow-xl text-xs font-medium transition-all animate-fade-in pointer-events-auto ${colorClasses}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // 1. Initialize PWA Service Worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
    } catch (e) {
      console.warn('[App] Service worker registration failed:', e);
    }
  }

  // 2. Initialize Subsystems
  await window.bhashaStorage.init();
  await window.bhashaTranslator.init();

  // Wire E2EE Sync Activity Log before joining room
  if (window.bhashaSync && syncActivityLog) {
    window.bhashaSync.onSyncLog = (entry) => {
      const item = document.createElement('div');
      item.className = 'p-2 rounded bg-slate-900/90 border border-slate-800/80 text-[11px] leading-relaxed';
      item.innerHTML = `
        <div class="flex items-center justify-between text-amber-400 font-semibold">
          <span>${entry.stepTitle}</span>
          <span class="text-slate-500 tabular-nums">${entry.time}</span>
        </div>
        <div class="text-slate-300 mt-0.5">${entry.detail}</div>
        ${entry.cipherPreview ? `<div class="text-[10px] text-emerald-400/90 mt-0.5 break-all">${entry.cipherPreview}</div>` : ''}
      `;
      syncActivityLog.prepend(item);
    };
  }

  // Update Device Profile Badge
  if (window.bhashaDeviceMedia && deviceTypeBadge) {
    const profile = window.bhashaDeviceMedia.getDeviceProfile();
    deviceTypeBadge.innerHTML = `<span>${profile.icon} ${profile.type} • ${window.bhashaAudio.speakers.length} मानवीय स्वर</span>`;
    if (mediaBroadcastCanvas) {
      window.bhashaDeviceMedia.drawBroadcastFrame(mediaBroadcastCanvas, window.bhashaDeviceMedia.lastSubtitleData);
    }
  }

  // URL Params for Room & Key auto-join
  const urlParams = new URLSearchParams(window.location.search);
  const paramRoom = urlParams.get('room');
  const paramKey = urlParams.get('key');
  if (paramRoom) {
    roomIdInput.value = paramRoom;
    if (paramKey) roomKeyInput.value = paramKey;
    await window.bhashaSync.joinRoom(paramRoom, paramKey || '');
  } else {
    roomIdInput.value = window.bhashaSync.roomId;
    roomKeyInput.value = window.bhashaSync.roomKey;
    await window.bhashaSync.joinRoom(window.bhashaSync.roomId, window.bhashaSync.roomKey);
  }

  if (roomFingerprint) {
    roomFingerprint.textContent = window.bhashaCrypto.fingerprint;
  }

  // 3. Network Online / Offline Detection
  function updateNetworkStatus() {
    const isOnline = navigator.onLine && !window.bhashaTranslator.forceOffline;
    window.bhashaTranslator.isOnline = navigator.onLine;
    if (networkBadge) {
      if (isOnline) {
        networkBadge.innerHTML = `<span>● ऑनलाइन (40+ भाषाएँ)</span>`;
        networkBadge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-950/70 border border-emerald-500/30 text-emerald-300';
      } else {
        networkBadge.innerHTML = `<span>● ऑफ़लाइन मोड</span>`;
        networkBadge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-950/70 border border-amber-500/30 text-amber-300';
      }
    }
  }
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // 4. Tab Navigation Helper
  function switchTab(targetTabName) {
    tabs.forEach(t => {
      const isTarget = t.dataset.tab === targetTabName;
      t.classList.toggle('active-tab', isTarget);
      t.classList.toggle('text-amber-400', isTarget);
      t.classList.toggle('border-amber-400', isTarget);
      t.classList.toggle('bg-slate-800/80', isTarget);
      t.classList.toggle('text-slate-400', !isTarget);
      t.classList.toggle('border-transparent', !isTarget);
    });
    tabContents.forEach(content => {
      if (content.id === `tab-${targetTabName}`) {
        content.classList.remove('hidden');
      } else {
        content.classList.add('hidden');
      }
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  if (openMediaTabBtn) {
    openMediaTabBtn.addEventListener('click', () => switchTab('media'));
  }

  // 5. Render 12 Human Speaker Selector Buttons
  function renderSpeakerPills() {
    if (!speakerPillsContainer) return;
    speakerPillsContainer.innerHTML = '';
    const current = window.bhashaAudio.getCurrentSpeaker();

    window.bhashaAudio.speakers.forEach((speaker, index) => {
      const btn = document.createElement('button');
      const isActive = speaker.id === current.id;
      btn.className = `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
        isActive
          ? 'ring-2 ring-white shadow-lg text-white font-bold'
          : 'opacity-75 hover:opacity-100 text-slate-300 bg-slate-800/60'
      }`;
      btn.style.backgroundColor = isActive ? speaker.color : '';
      btn.innerHTML = `
        <span class="w-2 h-2 rounded-full" style="background-color: ${speaker.color}"></span>
        <span>${speaker.name}</span>
      `;
      btn.addEventListener('click', () => {
        window.bhashaAudio.setSpeakerByIndex(index);
        renderSpeakerPills();
        renderSpeakerProfiles();
      });
      speakerPillsContainer.appendChild(btn);
    });
  }
  renderSpeakerPills();

  // 6. Multi-speaker Pitch detection callback
  window.bhashaAudio.onSpeakerDetected = (speaker, freq) => {
    renderSpeakerPills();
    if (pitchDisplay) {
      pitchDisplay.textContent = `${freq} Hz (${speaker.name})`;
      pitchDisplay.style.color = speaker.color;
    }
  };

  // 7. Load & Render Stored Conversation
  async function loadHistory() {
    const messages = await window.bhashaStorage.getAllMessages();
    conversationList.innerHTML = '';
    if (messages.length === 0) {
      conversationList.innerHTML = `
        <div id="empty-state" class="text-center py-10 text-slate-400">
          <div class="text-4xl mb-3">🎙️</div>
          <p class="font-medium text-slate-300">वार्तालाप शुरू करने के लिए नीचे "बोलना शुरू करें" दबाएं या त्वरित वॉयस बार का उपयोग करें</p>
          <p class="text-xs text-slate-500 mt-1">12 मानवीय वक्ता स्वर • 40+ भाषाओं की ऑटो-पहचान • नॉन-म्यूटिंग मीडिया अनुवाद</p>
        </div>
      `;
      return;
    }
    messages.forEach(msg => appendMessageUI(msg, false));
    scrollChatToBottom();
  }
  await loadHistory();

  function scrollChatToBottom() {
    const scrollContainer = conversationList.parentElement;
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }

  // 8. Append Message to UI
  function appendMessageUI(msg, animate = true) {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.remove();

    const card = document.createElement('div');
    card.className = `p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-md transition-all ${animate ? 'animate-fade-in' : ''}`;
    card.dataset.id = msg.id || '';

    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const modeText = msg.isOffline ? 'इंस्टेंट ऑफ़लाइन इंजन' : 'न्यूरल इंजन';
    const langLabel = msg.detectedLangName || window.bhashaTranslator.getLanguageName(msg.sourceLang || 'auto');
    const contextText = msg.mediaContext ? ` · ${msg.mediaContext}` : '';
    const latencyBadge = `⚡ ${msg.latencyMs !== undefined ? msg.latencyMs : 1} ms`;

    card.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-2 mb-2 text-xs text-slate-400">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="w-3 h-3 rounded-full shadow shrink-0" style="background-color: ${msg.speakerColor}"></span>
          <span class="font-bold text-slate-200">${msg.speakerName}</span>
          <span aria-hidden="true">·</span>
          <span class="text-amber-300 font-medium">🌐 ${langLabel}</span>
          <span aria-hidden="true">·</span>
          <span class="text-emerald-400 font-mono font-semibold">${latencyBadge}</span>
          <span aria-hidden="true">·</span>
          <span>${modeText}${contextText}</span>
        </div>
        <span class="text-[11px] text-slate-400 tabular-nums">${timeStr}</span>
      </div>

      <!-- Original Input Text -->
      <div class="text-sm text-slate-300/90 mb-2 font-mono bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
        <span class="text-[11px] text-slate-400 block mb-0.5 font-sans font-medium">मूल आवाज़ / वाक्य (${langLabel}):</span>
        "${msg.originalText}"
      </div>

      <!-- Hindi Translated Text -->
      <div class="text-base font-semibold text-amber-200 bg-amber-950/20 p-3 rounded-xl border border-amber-500/20 flex items-start justify-between gap-3">
        <div class="leading-relaxed">
          <span class="text-[11px] text-amber-400/80 block font-normal">🇮🇳 शुद्ध मानवीय हिन्दी अनुवाद (${latencyBadge}):</span>
          ${msg.hindiText}
        </div>
        <div class="flex items-center gap-1.5 shrink-0 pt-1">
          <button class="speak-btn p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors" aria-label="हिन्दी में सुनें" title="हिन्दी में सुनें">
            🔊
          </button>
          <button class="copy-btn p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors" aria-label="अनुवाद कॉपी करें" title="कॉपी करें">
            📋
          </button>
        </div>
      </div>
    `;

    const speakBtn = card.querySelector('.speak-btn');
    speakBtn.addEventListener('click', () => {
      const spkObj = window.bhashaAudio.speakers.find(s => s.id === msg.speakerId) || {
        pitch: 1.0,
        rate: msg.rate || 1.0,
        gender: msg.gender || 'male',
        name: msg.speakerName
      };
      window.bhashaTTS.speak(msg.hindiText, spkObj);
    });

    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(msg.hindiText);
      copyBtn.textContent = '✅';
      setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
    });

    conversationList.appendChild(card);
    scrollChatToBottom();
  }

  function updateLiveSubtitleBox(record) {
    if (!record) return;
    if (mediaDetectedLangPill) {
      mediaDetectedLangPill.textContent = `🌐 ${record.detectedLangName} • ⚡ ${record.latencyMs || 1} ms`;
    }
    if (liveSubtitleContext) {
      liveSubtitleContext.textContent = record.mediaContext || 'लाइव मीडिया';
    }
    if (mediaLiveOriginal) {
      mediaLiveOriginal.textContent = `मूल (${record.detectedLangName}): "${record.originalText}"`;
    }
    if (mediaLiveSpeaker) {
      mediaLiveSpeaker.textContent = `🔊 ${record.speakerName} (सिंगल-वॉयस मानवीय स्वर)`;
      mediaLiveSpeaker.style.color = record.speakerColor || '#f59e0b';
    }
    if (mediaLiveHindi) {
      mediaLiveHindi.textContent = record.hindiText;
    }
  }

  // 9. Speech-to-Text Callbacks & Real-Time Millisecond Live Translation Preview
  window.bhashaSTT.onInterimResult = (interim) => {
    const selectedLang = langSelect ? langSelect.value : 'auto';
    const instantMeta = window.bhashaTranslator.translateInstant(interim, selectedLang);

    if (interimBox) {
      interimBox.classList.remove('hidden');
      interimBox.innerHTML = `
        <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span class="text-amber-400 font-bold">🎙️ ${window.bhashaAudio.getCurrentSpeaker().name} बोल रहे हैं (${instantMeta.detectedLangName}):</span>
          <span class="text-emerald-400 font-mono">⚡ ${instantMeta.latencyMs} ms लाइव अनुवाद</span>
        </div>
        <div class="italic text-slate-300 text-xs mb-1">"${interim}"</div>
        <div class="text-amber-200 font-semibold text-sm">🇮🇳 ${instantMeta.translatedText}</div>
      `;
    }
    if (liveChatInput && document.activeElement !== liveChatInput) {
      liveChatInput.value = interim;
    }
    if (mediaLiveOriginal && window.bhashaSTT.captureMode !== 'mic') {
      mediaLiveOriginal.textContent = `सुन रहा है (${instantMeta.detectedLangName}): "${interim}..."`;
    }
    if (mediaLiveHindi && instantMeta.translatedText) {
      mediaLiveHindi.textContent = `⚡ ${instantMeta.translatedText}`;
    }
  };

  window.bhashaSTT.onFinalResult = async (finalText) => {
    if (interimBox) interimBox.classList.add('hidden');
    if (liveChatInput && document.activeElement !== liveChatInput) {
      liveChatInput.value = '';
    }
    if (!finalText || !finalText.trim()) return;

    const selectedLang = langSelect ? langSelect.value : 'auto';
    const modeLabel = window.bhashaSTT.captureMode === 'system-tab'
      ? 'स्क्रीन/टैब ऑडियो'
      : window.bhashaSTT.captureMode === 'ambient-media'
        ? 'डिवाइस स्पीकर लिसनर'
        : 'लाइव माइक वार्तालाप';

    const record = await window.bhashaDeviceMedia.processMediaSegment(
      finalText,
      selectedLang,
      null,
      modeLabel,
      mediaBroadcastCanvas
    );

    if (record) {
      updateLiveSubtitleBox(record);
    }
  };

  window.bhashaSTT.onStateChange = (isRecording, mode) => {
    if (isRecording) {
      micBtn.classList.remove('bg-amber-500', 'hover:bg-amber-600');
      micBtn.classList.add('bg-rose-600', 'hover:bg-rose-700', 'animate-pulse');
      micBtnText.textContent = 'सुन रहा है... (रोकें)';
      if (micStatusIndicator) {
        micStatusIndicator.classList.remove('hidden');
        const modeTag = mode === 'ambient-media' ? 'स्पीकर लिसनर' : mode === 'system-tab' ? 'स्क्रीन ऑडियो' : window.bhashaAudio.getCurrentSpeaker().name;
        micStatusIndicator.textContent = `🎙️ लाइव सुन रहा है... (${modeTag})`;
      }
      window.bhashaAudio.startVisualizer(visualizerCanvas, pitchDisplay);
    } else {
      micBtn.classList.add('bg-amber-500', 'hover:bg-amber-600');
      micBtn.classList.remove('bg-rose-600', 'hover:bg-rose-700', 'animate-pulse');
      micBtnText.textContent = 'बोलना शुरू करें (Mic)';
      if (micStatusIndicator) micStatusIndicator.classList.add('hidden');
      if (interimBox) interimBox.classList.add('hidden');
      window.bhashaAudio.stopVisualizer();
    }
  };

  window.bhashaSTT.onError = (err) => {
    showToast(err, 'error');
  };

  // Direct Live Utterance Submission in Tab 1
  async function submitDirectLiveUtterance(textOverride = null) {
    const raw = textOverride !== null ? textOverride : (liveChatInput ? liveChatInput.value : '');
    if (!raw || !raw.trim()) {
      showToast('कृपया कोई वाक्य लिखें या त्वरित वॉयस बटन चुनें', 'error');
      return;
    }
    if (liveChatInput && textOverride === null) {
      liveChatInput.value = '';
    }
    const selectedLang = langSelect ? langSelect.value : 'auto';
    await window.bhashaDeviceMedia.processMediaSegment(
      raw.trim(),
      selectedLang,
      null,
      'प्रत्यक्ष संवाद',
      mediaBroadcastCanvas
    );
  }

  if (liveChatSendBtn) {
    liveChatSendBtn.addEventListener('click', () => submitDirectLiveUtterance());
  }

  if (liveChatInput) {
    liveChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitDirectLiveUtterance();
      }
    });
  }

  livePhraseChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const phrase = chip.dataset.voicePhrase;
      if (phrase) submitDirectLiveUtterance(phrase);
    });
  });

  // Connect DeviceMedia segment callback to Conversation Timeline & Subtitle Box
  if (window.bhashaDeviceMedia) {
    window.bhashaDeviceMedia.onTranslatedSegment = (record) => {
      appendMessageUI(record, true);
      updateLiveSubtitleBox(record);
    };

    window.bhashaDeviceMedia.onStatusChange = (status) => {
      if (mediaStatusText) {
        mediaStatusText.textContent = status.message;
      }
    };
  }

  // Mic Button Click
  micBtn.addEventListener('click', async () => {
    if (window.bhashaSTT.isRecording) {
      window.bhashaSTT.stop();
      showToast('माइक सुनना रोका गया');
    } else {
      if (!window.bhashaSTT.isSupported()) {
        showToast('⚠️ आपके ब्राउज़र (जैसे Firefox) में स्पीच रिकग्निशन उपलब्ध नहीं है। कृपया त्वरित टेक्स्ट बॉक्स या Chrome/Edge/Safari का उपयोग करें।', 'error');
        const textTabBtn = document.querySelector('[data-tab="text"]');
        if (textTabBtn) textTabBtn.click();
        return;
      }
      try {
        const ok = await window.bhashaSTT.start('mic');
        if (ok) {
          showToast(`🎙️ ${window.bhashaAudio.getCurrentSpeaker().name} के लिए माइक चालू — अब बोलें`);
        }
      } catch (err) {
        showToast(`माइक्रोफ़ोन सूचना: ${err.message}`, 'error');
      }
    }
  });

  // Language Select change
  if (langSelect) {
    langSelect.addEventListener('change', () => {
      window.bhashaSTT.setLanguage(langSelect.value);
      showToast(`स्रोत भाषा बदली गई: ${window.bhashaTranslator.getLanguageName(langSelect.value)}`);
    });
  }

  // Audio Clarity EQ Toggle
  if (clarityToggle) {
    clarityToggle.addEventListener('change', () => {
      const enabled = window.bhashaAudio.toggleClarityFilter(clarityToggle.checked);
      clarityToggle.checked = enabled;
      showToast(enabled ? 'वोकल स्पष्टता EQ चालू किया गया' : 'वोकल स्पष्टता EQ बंद किया गया');
    });
  }

  // Single-Voice Isolation Toggle (prevents original media speaker and Hindi speaker from talking simultaneously)
  if (keepMediaAudioToggle) {
    keepMediaAudioToggle.addEventListener('change', () => {
      window.bhashaTTS.isolateHindiVoice = keepMediaAudioToggle.checked;
      showToast(
        keepMediaAudioToggle.checked
          ? '🔇 वॉयस आइसोलेशन सक्रिय: जब हिन्दी वक्ता बोलेगा तो मुख्य वक्ता की आवाज़ स्वतः धीमी (6%) हो जाएगी'
          : '🔊 मूल मीडिया आवाज़ और हिन्दी आवाज़ दोनों एक साथ चलेंगी'
      );
    });
  }

  // Force Offline Toggle
  if (offlineToggle) {
    offlineToggle.addEventListener('change', () => {
      window.bhashaTranslator.forceOffline = offlineToggle.checked;
      updateNetworkStatus();
      showToast(offlineToggle.checked ? 'बिना इंटरनेट (100% ऑफ़लाइन) मोड सक्रिय' : 'ऑनलाइन + ऑफ़लाइन हाइब्रिड मोड सक्रिय');
    });
  }

  // Clear Chat History
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', async () => {
      await window.bhashaStorage.clearAllMessages();
      await loadHistory();
      showToast('वार्तालाप इतिहास साफ़ कर दिया गया है');
    });
  }

  // Export Chat
  if (exportChatBtn) {
    exportChatBtn.addEventListener('click', async () => {
      const messages = await window.bhashaStorage.getAllMessages();
      const exportData = {
        app: 'BhashaSetu',
        exportedAt: new Date().toISOString(),
        totalMessages: messages.length,
        messages: messages
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bhasha-setu-chat-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('वार्तालाप सत्र JSON फ़ाइल के रूप में एक्सपोर्ट किया गया');
    });
  }

  // =========================================================================
  // 10. Device & Media Tab Controls (Non-Muting Media Translation)
  // =========================================================================
  if (startScreenCaptureBtn) {
    startScreenCaptureBtn.addEventListener('click', async () => {
      try {
        if (mediaVideoPreview) mediaVideoPreview.classList.remove('hidden');
        await window.bhashaDeviceMedia.startSystemScreenCapture(
          mediaVideoPreview,
          langSelect ? langSelect.value : 'auto'
        );
        showToast('🖥️ स्क्रीन/टैब ऑडियो कैप्चर चालू — मूल मीडिया आवाज़ भी चालू है');
      } catch (err) {
        if (mediaVideoPreview) mediaVideoPreview.classList.add('hidden');
        showToast(err.message, 'error');
      }
    });
  }

  if (startAmbientMediaBtn) {
    startAmbientMediaBtn.addEventListener('click', async () => {
      try {
        await window.bhashaDeviceMedia.startAmbientMediaListener(langSelect ? langSelect.value : 'auto');
        showToast('📲 स्पीकर व मीडिया लिसनर सक्रिय — मीडिया की आवाज़ बंद किए बिना अनुवाद चालू');
      } catch (err) {
        showToast(`स्पीकर लिसनर शुरू नहीं हो सका: ${err.message}`, 'error');
      }
    });
  }

  if (startStreamDemoBtn) {
    startStreamDemoBtn.addEventListener('click', async () => {
      const channelKey = mediaChannelSelect ? mediaChannelSelect.value : 'global-news';
      await window.bhashaDeviceMedia.startLiveMediaStreamDemo(channelKey, mediaBroadcastCanvas);
      showToast('📺 लाइव बहु-भाषी मीडिया स्ट्रीम और मानवीय हिन्दी स्वर अनुवाद शुरू!');
    });
  }

  if (localMediaFileInput) {
    localMediaFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      await window.bhashaDeviceMedia.startLocalMediaFileTranslation(
        mediaVideoPreview,
        file,
        mediaBroadcastCanvas
      );
      showToast(`🎬 वीडियो चालू: ${file.name} (बिना रुके चलेगा + स्वतः मानवीय हिन्दी आवाज़)`);
    });
  }

  if (stopAllMediaBtn) {
    stopAllMediaBtn.addEventListener('click', () => {
      window.bhashaDeviceMedia.stopAllMediaModes(mediaVideoPreview, true);
      window.bhashaTTS.stop();
      if (mediaVideoPreview) {
        mediaVideoPreview.classList.add('hidden');
      }
      showToast('सभी मीडिया कैप्चर व स्ट्रीम रोक दिए गए हैं');
    });
  }

  if (togglePipBtn) {
    togglePipBtn.addEventListener('click', async () => {
      try {
        const active = await window.bhashaDeviceMedia.togglePiPSubtitles();
        showToast(active ? '🪟 फ्लोटिंग लाइव हिन्दी सबटाइटल विंडो (PiP) चालू' : 'फ्लोटिंग सबटाइटल विंडो बंद');
      } catch (err) {
        showToast(`PiP सूचना: ${err.message}`, 'error');
      }
    });
  }

  if (screenTextTranslateBtn) {
    screenTextTranslateBtn.addEventListener('click', async () => {
      const text = screenTextInput ? screenTextInput.value.trim() : '';
      if (!text) {
        showToast('कृपया अनुवाद के लिए किसी भी भाषा का टेक्स्ट लिखें या पेस्ट करें', 'error');
        return;
      }
      await window.bhashaDeviceMedia.processMediaSegment(text, 'auto', null, 'स्क्रीन/ऐप टेक्स्ट', mediaBroadcastCanvas);
      showToast('🌐 भाषा पहचानकर मानवीय हिन्दी स्वर में अनुवादित किया गया!');
    });
  }

  if (clipboardTranslateBtn) {
    clipboardTranslateBtn.addEventListener('click', async () => {
      try {
        const rec = await window.bhashaDeviceMedia.translateFromClipboard(mediaBroadcastCanvas);
        if (rec && screenTextInput) {
          screenTextInput.value = rec.originalText;
        }
        showToast('📋 क्लिपबोर्ड टेक्स्ट का हिन्दी अनुवाद पूरा हुआ!');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  if (clipboardWatchToggle) {
    clipboardWatchToggle.addEventListener('change', () => {
      const active = window.bhashaDeviceMedia.toggleClipboardWatch(clipboardWatchToggle.checked, mediaBroadcastCanvas);
      showToast(active ? '📋 ऑटो-क्लिपबोर्ड अनुवाद मॉनिटर चालू' : 'ऑटो-क्लिपबोर्ड मॉनिटर बंद');
    });
  }

  // =========================================================================
  // 11. Quick Text Translate (40+ Languages & Sample Triggers)
  // =========================================================================
  async function runQuickTextTranslation() {
    const text = quickTextInput.value;
    if (!text.trim()) return;

    quickTranslateOutput.textContent = 'अनुवाद हो रहा है...';
    const meta = await window.bhashaTranslator.translateWithMeta(text, 'auto');
    quickTranslateOutput.textContent = meta.translatedText;
    if (quickDetectedLangBadge) {
      quickDetectedLangBadge.textContent = `🌐 पहचानी गई भाषा: ${meta.detectedLangName}`;
    }
  }

  if (quickTranslateBtn) {
    quickTranslateBtn.addEventListener('click', runQuickTextTranslation);
  }

  sampleLangBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (quickTextInput) {
        quickTextInput.value = btn.dataset.sample || '';
        await runQuickTextTranslation();
      }
    });
  });

  if (quickSpeakBtn) {
    quickSpeakBtn.addEventListener('click', () => {
      const text = quickTranslateOutput.textContent;
      if (text && text !== 'यहाँ हिन्दी अनुवाद दिखेगा...') {
        window.bhashaTTS.speak(text, window.bhashaAudio.getCurrentSpeaker());
      }
    });
  }

  if (quickCopyBtn) {
    quickCopyBtn.addEventListener('click', async () => {
      const text = quickTranslateOutput.textContent;
      if (text && text !== 'यहाँ हिन्दी अनुवाद दिखेगा...') {
        await navigator.clipboard.writeText(text);
        quickCopyBtn.textContent = '✅ कॉपी किया गया';
        setTimeout(() => { quickCopyBtn.textContent = '📋 कॉपी करें'; }, 1500);
      }
    });
  }

  // =========================================================================
  // 12. Real-Time E2EE Sync Handling & Live Test Ping
  // =========================================================================
  if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', async () => {
      const roomId = roomIdInput.value.trim();
      const roomKey = roomKeyInput.value.trim();
      if (!roomId) {
        showToast('कृपया एक वैध रूम कोड दर्ज करें', 'error');
        return;
      }

      const info = await window.bhashaSync.joinRoom(roomId, roomKey);
      if (roomFingerprint) roomFingerprint.textContent = info.fingerprint;
      showToast(`रूम ${info.roomId} में सफलतापूर्वक जुड़े! (AES-256-GCM सक्रिय)`);
    });
  }

  if (testSyncPingBtn) {
    testSyncPingBtn.addEventListener('click', async () => {
      const spk = window.bhashaAudio.getCurrentSpeaker();
      const sampleRecord = {
        speakerId: spk.id,
        speakerName: spk.name,
        speakerColor: spk.color,
        originalText: 'Welcome to our live broadcast',
        sourceLang: 'en',
        detectedLangName: 'English (अंग्रेजी)',
        hindiText: 'हमारे लाइव प्रसारण में आपका स्वागत है',
        timestamp: Date.now(),
        pitch: spk.pitch,
        rate: spk.rate,
        gender: spk.gender,
        isOffline: false,
        mediaContext: `E2EE सिंक (${window.bhashaSync.roomId})`
      };
      sampleRecord.id = await window.bhashaStorage.addMessage(sampleRecord);
      appendMessageUI(sampleRecord, true);
      await window.bhashaSync.broadcastMessage(sampleRecord);
      window.bhashaTTS.speak(sampleRecord.hindiText, spk);
      showToast(`🔒 रूम ${window.bhashaSync.roomId} में AES-256-GCM एन्क्रिप्टेड संदेश भेजा गया!`);
    });
  }

  if (shareRoomBtn) {
    shareRoomBtn.addEventListener('click', async () => {
      const url = window.bhashaSync.getPairingUrl();
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'भाषा सेतु सुरक्षित सत्र',
            text: `भाषा सेतु पर मेरे साथ सुरक्षित हिन्दी अनुवाद सत्र में शामिल हों! रूम: ${window.bhashaSync.roomId}`,
            url: url
          });
        } catch (e) {}
      } else {
        await navigator.clipboard.writeText(url);
        showToast('पेयरिंग लिंक क्लिपबोर्ड में कॉपी हो गया है! इसे अन्य मोबाइल/टैबलेट/डेस्कटॉप पर खोलें।');
      }
    });
  }

  window.bhashaSync.onMessageReceived = (incomingRecord) => {
    appendMessageUI(incomingRecord, true);
    updateLiveSubtitleBox(incomingRecord);
    const spk = window.bhashaAudio.speakers.find(s => s.id === incomingRecord.speakerId) || {
      pitch: incomingRecord.pitch || 0.98,
      rate: incomingRecord.rate || 1.0,
      gender: incomingRecord.gender || 'male',
      name: incomingRecord.speakerName
    };
    window.bhashaTTS.speak(incomingRecord.hindiText, spk);
    showToast(`🔓 अन्य डिवाइस से सुरक्षित अनुवाद प्राप्त हुआ (${incomingRecord.speakerName})`);
  };

  window.bhashaSync.onPeerCountChanged = (count) => {
    if (peerCountBadge) {
      peerCountBadge.textContent = `${count} जुड़े हुए डिवाइस`;
    }
  };

  // =========================================================================
  // 13. Speakers Tab: Render & Manage 12+ Human Speakers
  // =========================================================================
  function renderSpeakerProfiles() {
    if (!speakerProfilesList) return;
    speakerProfilesList.innerHTML = '';

    window.bhashaAudio.speakers.forEach((spk, idx) => {
      const row = document.createElement('div');
      row.className = 'p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-3';
      row.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow shrink-0 tabular-nums" style="background-color: ${spk.color}">
            ${idx + 1}
          </span>
          <div class="min-w-0">
            <h4 class="font-bold text-slate-200 text-sm truncate">${spk.name}</h4>
            <p class="text-xs text-slate-400 truncate">${spk.desc} • पिच: ${spk.pitch}x • गति: ${spk.rate}x</p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button class="preview-voice-btn px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors">
            🔊 सुनें
          </button>
          <button class="select-speaker-btn px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            spk.id === window.bhashaAudio.getCurrentSpeaker().id
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
          }">
            ${spk.id === window.bhashaAudio.getCurrentSpeaker().id ? 'सक्रिय ✓' : 'चुनें'}
          </button>
        </div>
      `;

      row.querySelector('.preview-voice-btn').addEventListener('click', () => {
        window.bhashaTTS.previewSpeaker(spk);
      });

      row.querySelector('.select-speaker-btn').addEventListener('click', () => {
        window.bhashaAudio.setSpeakerByIndex(idx);
        renderSpeakerPills();
        renderSpeakerProfiles();
      });

      speakerProfilesList.appendChild(row);
    });
  }
  renderSpeakerProfiles();

  if (addSpeakerBtn) {
    addSpeakerBtn.addEventListener('click', () => {
      const customName = newSpeakerNameInput && newSpeakerNameInput.value.trim()
        ? newSpeakerNameInput.value.trim()
        : `मानवीय स्वर ${window.bhashaAudio.speakers.length + 1}`;
      const stylePreset = newSpeakerStyleSelect ? newSpeakerStyleSelect.value : 'male-natural';
      const created = window.bhashaAudio.addSpeaker(customName, stylePreset);
      if (newSpeakerNameInput) newSpeakerNameInput.value = '';
      renderSpeakerPills();
      renderSpeakerProfiles();
      showToast(`नया मानवीय वक्ता "${created.name}" जोड़ा गया`);
    });
  }

  // =========================================================================
  // 14. Custom Vocabulary Additions
  // =========================================================================
  async function renderCustomWords() {
    if (!customWordsList) return;
    const words = await window.bhashaStorage.getCustomWords();
    customWordsList.innerHTML = '';
    if (words.length === 0) {
      customWordsList.innerHTML = '<p class="text-xs text-slate-500 italic py-2">कोई कस्टम शब्द नहीं जोड़ा गया है।</p>';
      return;
    }
    words.forEach(item => {
      const tag = document.createElement('div');
      tag.className = 'flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-xs';
      tag.innerHTML = `
        <span class="font-medium text-slate-300">${item.word}</span>
        <span class="text-amber-400 font-semibold">➔ ${item.meaning}</span>
      `;
      customWordsList.appendChild(tag);
    });
  }
  await renderCustomWords();

  if (addWordBtn) {
    addWordBtn.addEventListener('click', async () => {
      const src = customWordInput.value.trim();
      const hnd = customMeaningInput.value.trim();
      if (!src || !hnd) {
        showToast('कृपया शब्द और उसका हिन्दी अर्थ दोनों भरें', 'error');
        return;
      }

      await window.bhashaTranslator.addCustomWord(src, hnd);
      customWordInput.value = '';
      customMeaningInput.value = '';
      await renderCustomWords();
      showToast(`शब्द "${src}" का हिन्दी अर्थ "${hnd}" ऑफ़लाइन डिक्शनरी में सहेज लिया गया है!`);
    });
  }

  // =========================================================================
  // Mobile / Tablet & Browser Lifecycle Listeners (Visibility, Pagehide, Devices)
  // =========================================================================
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (window.bhashaAudio) window.bhashaAudio.stopVisualizer();
    } else if (document.visibilityState === 'visible') {
      if (window.bhashaSTT && window.bhashaSTT.isRecording) {
        if (window.bhashaAudio) window.bhashaAudio.startVisualizer(visualizerCanvas, pitchDisplay);
      }
    }
  });

  window.addEventListener('pagehide', () => {
    if (window.bhashaSTT) window.bhashaSTT.stop();
    if (window.bhashaDeviceMedia) window.bhashaDeviceMedia.stopAllMediaModes(null, false);
    if (window.bhashaAudio) window.bhashaAudio.stopAudio();
    if (window.bhashaTTS) window.bhashaTTS.stop();
  });

  if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', () => {
      console.log('[App] Audio device change detected');
      showToast('ऑडियो उपकरण परिवर्तन संज्ञान में लिया गया', 'info');
    });
  }
});
