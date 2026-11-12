/**
 * BhashaSetu - Main Application Controller
 * Coordinates UI, Speech, Translation, Audio Clarity, Diarization, Sync & Storage
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
  const clearChatBtn = document.getElementById('clear-chat-btn');
  const exportChatBtn = document.getElementById('export-chat-btn');

  // Text Tab Elements
  const quickTextInput = document.getElementById('quick-text-input');
  const quickTranslateBtn = document.getElementById('quick-translate-btn');
  const quickTranslateOutput = document.getElementById('quick-translate-output');
  const quickSpeakBtn = document.getElementById('quick-speak-btn');
  const quickCopyBtn = document.getElementById('quick-copy-btn');

  // Sync Elements
  const roomIdInput = document.getElementById('room-id-input');
  const roomKeyInput = document.getElementById('room-key-input');
  const joinRoomBtn = document.getElementById('join-room-btn');
  const roomFingerprint = document.getElementById('room-fingerprint');
  const peerCountBadge = document.getElementById('peer-count-badge');
  const shareRoomBtn = document.getElementById('share-room-btn');

  // Speakers Tab Elements
  const speakerProfilesList = document.getElementById('speaker-profiles-list');
  const addSpeakerBtn = document.getElementById('add-speaker-btn');

  // Custom Dict Elements
  const customWordInput = document.getElementById('custom-word-input');
  const customMeaningInput = document.getElementById('custom-meaning-input');
  const addWordBtn = document.getElementById('add-word-btn');
  const customWordsList = document.getElementById('custom-words-list');

  // 1. Initialize PWA Service Worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
      console.log('[App] Service Worker registered');
    } catch (e) {
      console.warn('[App] Service worker registration failed:', e);
    }
  }

  // 2. Initialize Subsystems
  await window.bhashaStorage.init();
  await window.bhashaTranslator.init();
  
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
    await window.bhashaCrypto.deriveKey(window.bhashaSync.roomKey);
  }

  if (roomFingerprint) {
    roomFingerprint.textContent = window.bhashaCrypto.fingerprint;
  }

  // 3. Network Online / Offline Detection
  function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    window.bhashaTranslator.isOnline = isOnline;
    if (networkBadge) {
      if (isOnline) {
        networkBadge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> <span>ऑनलाइन</span>`;
        networkBadge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 border border-emerald-500/30 text-emerald-300';
      } else {
        networkBadge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> <span>ऑफ़लाइन मोड</span>`;
        networkBadge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/70 border border-amber-500/30 text-amber-300';
      }
    }
  }
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // 4. Tab Navigation
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active-tab', 'text-amber-400', 'border-amber-400', 'bg-slate-800/80');
        t.classList.add('text-slate-400', 'border-transparent');
      });
      tab.classList.add('active-tab', 'text-amber-400', 'border-amber-400', 'bg-slate-800/80');
      tab.classList.remove('text-slate-400', 'border-transparent');

      const target = tab.dataset.tab;
      tabContents.forEach(content => {
        if (content.id === `tab-${target}`) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      });
    });
  });

  // 5. Render Speaker Selector Pills
  function renderSpeakerPills() {
    if (!speakerPillsContainer) return;
    speakerPillsContainer.innerHTML = '';
    const current = window.bhashaAudio.getCurrentSpeaker();

    window.bhashaAudio.speakers.forEach((speaker, index) => {
      const btn = document.createElement('button');
      const isActive = speaker.id === current.id;
      btn.className = `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        isActive 
          ? 'ring-2 ring-white shadow-lg text-white font-bold' 
          : 'opacity-70 hover:opacity-100 text-slate-300 bg-slate-800/60'
      }`;
      btn.style.backgroundColor = isActive ? speaker.color : '';
      btn.style.borderColor = speaker.color;
      btn.innerHTML = `
        <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${speaker.color}"></span>
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
        <div id="empty-state" class="text-center py-12 text-slate-400">
          <div class="text-4xl mb-3">🎙️</div>
          <p class="font-medium text-slate-300">वार्तालाप शुरू करने के लिए नीचे माइक बटन दबाएं</p>
          <p class="text-xs text-slate-500 mt-1">आप किसी भी भाषा में बोलेंगे, यहाँ तुरंत हिन्दी अनुवाद सुनाई देगा</p>
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
    const isOfflineBadge = msg.isOffline 
      ? '<span class="text-[10px] bg-slate-700/60 text-slate-400 px-2 py-0.5 rounded-full">ऑफ़लाइन</span>' 
      : '<span class="text-[10px] bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded-full">ऑनलाइन</span>';

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full shadow" style="background-color: ${msg.speakerColor}"></span>
          <span class="text-xs font-bold text-slate-200">${msg.speakerName}</span>
          ${isOfflineBadge}
        </div>
        <span class="text-[11px] text-slate-400">${timeStr}</span>
      </div>

      <!-- Original Input Text -->
      <div class="text-sm text-slate-300/80 mb-2 font-mono bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
        <span class="text-[11px] text-slate-500 block mb-0.5 font-sans font-medium">मूल आवाज़ / वाक्य:</span>
        "${msg.originalText}"
      </div>

      <!-- Hindi Translated Text -->
      <div class="text-base font-semibold text-amber-200 bg-amber-950/20 p-3 rounded-xl border border-amber-500/20 flex items-start justify-between gap-3">
        <div class="leading-relaxed">
          <span class="text-[11px] text-amber-400/80 block font-normal">हिन्दी अनुवाद:</span>
          ${msg.hindiText}
        </div>
        <div class="flex items-center gap-1.5 shrink-0 pt-1">
          <button class="speak-btn p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors title="हिन्दी में सुनें"">
            🔊
          </button>
          <button class="copy-btn p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors" title="कॉपी करें">
            📋
          </button>
        </div>
      </div>
    `;

    // Audio Playback with Speaker's Custom Pitch
    const speakBtn = card.querySelector('.speak-btn');
    speakBtn.addEventListener('click', () => {
      const spkObj = window.bhashaAudio.speakers.find(s => s.id === msg.speakerId) || {
        pitch: msg.pitch || 1.0,
        rate: 1.0,
        name: msg.speakerName
      };
      window.bhashaTTS.speak(msg.hindiText, spkObj);
    });

    // Copy to clipboard
    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(msg.hindiText);
      copyBtn.textContent = '✅';
      setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
    });

    conversationList.appendChild(card);
    scrollChatToBottom();
  }

  // 9. Speech-to-Text Callbacks
  window.bhashaSTT.onInterimResult = (interim) => {
    if (interimBox) {
      interimBox.classList.remove('hidden');
      interimBox.innerHTML = `
        <span class="text-amber-400 font-bold">${window.bhashaAudio.getCurrentSpeaker().name}:</span> 
        <span class="italic text-slate-300">${interim}</span>
      `;
    }
  };

  window.bhashaSTT.onFinalResult = async (finalText) => {
    if (interimBox) interimBox.classList.add('hidden');
    if (!finalText || !finalText.trim()) return;

    const currentSpeaker = window.bhashaAudio.getCurrentSpeaker();
    const sourceLang = langSelect ? langSelect.value : 'auto';

    // 1. Translate to Hindi (Offline / Online hybrid)
    const isOffline = !window.bhashaTranslator.isOnline || window.bhashaTranslator.forceOffline;
    const hindiTranslation = await window.bhashaTranslator.translateToHindi(finalText, sourceLang);

    // 2. Prepare Record
    const record = {
      speakerId: currentSpeaker.id,
      speakerName: currentSpeaker.name,
      speakerColor: currentSpeaker.color,
      originalText: finalText,
      sourceLang: sourceLang,
      hindiText: hindiTranslation,
      timestamp: Date.now(),
      pitch: currentSpeaker.pitch,
      isOffline: isOffline
    };

    // 3. Save to IndexedDB
    record.id = await window.bhashaStorage.addMessage(record);

    // 4. Update UI
    appendMessageUI(record, true);

    // 5. Automatically Speak in distinct speaker pitch
    window.bhashaTTS.speak(hindiTranslation, currentSpeaker);

    // 6. Broadcast encrypted to connected devices
    await window.bhashaSync.broadcastMessage(record);
  };

  window.bhashaSTT.onStateChange = (isRecording) => {
    if (isRecording) {
      micBtn.classList.remove('bg-amber-500', 'hover:bg-amber-600');
      micBtn.classList.add('bg-rose-600', 'hover:bg-rose-700', 'animate-pulse');
      micBtnText.textContent = 'रोकें (Stop)';
      if (micStatusIndicator) {
        micStatusIndicator.classList.remove('hidden');
        micStatusIndicator.textContent = `🎙️ सुन रहा है... (${window.bhashaAudio.getCurrentSpeaker().name})`;
      }
      // Start Visualizer
      window.bhashaAudio.startVisualizer(visualizerCanvas, pitchDisplay);
    } else {
      micBtn.classList.add('bg-amber-500', 'hover:bg-amber-600');
      micBtn.classList.remove('bg-rose-600', 'hover:bg-rose-700', 'animate-pulse');
      micBtnText.textContent = 'बोलना शुरू करें';
      if (micStatusIndicator) micStatusIndicator.classList.add('hidden');
      if (interimBox) interimBox.classList.add('hidden');
      window.bhashaAudio.stopVisualizer();
    }
  };

  window.bhashaSTT.onError = (err) => {
    alert(`माइक्रोफ़ोन त्रुटि: ${err}`);
  };

  // Mic Button Click
  micBtn.addEventListener('click', async () => {
    if (window.bhashaSTT.isRecording) {
      window.bhashaSTT.stop();
    } else {
      try {
        await window.bhashaSTT.start();
      } catch (err) {
        alert(`माइक्रोफ़ोन शुरू नहीं हो सका: ${err.message}`);
      }
    }
  });

  // Language Select change
  if (langSelect) {
    langSelect.addEventListener('change', () => {
      window.bhashaSTT.setLanguage(langSelect.value);
    });
  }

  // Audio Clarity EQ Toggle
  if (clarityToggle) {
    clarityToggle.addEventListener('change', () => {
      const enabled = window.bhashaAudio.toggleClarityFilter(clarityToggle.checked);
      clarityToggle.checked = enabled;
    });
  }

  // Force Offline Toggle
  if (offlineToggle) {
    offlineToggle.addEventListener('change', () => {
      window.bhashaTranslator.forceOffline = offlineToggle.checked;
      updateNetworkStatus();
    });
  }

  // Clear Chat History
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', async () => {
      if (confirm('क्या आप पूरे वार्तालाप इतिहास को हटाना चाहते हैं?')) {
        await window.bhashaStorage.clearAllMessages();
        await loadHistory();
      }
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
    });
  }

  // 10. Quick Text Translate
  if (quickTranslateBtn) {
    quickTranslateBtn.addEventListener('click', async () => {
      const text = quickTextInput.value;
      if (!text.trim()) return;

      quickTranslateOutput.textContent = 'अनुवाद हो रहा है...';
      const hindi = await window.bhashaTranslator.translateToHindi(text, 'auto');
      quickTranslateOutput.textContent = hindi;
    });
  }

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

  // 11. Sync & E2EE Handling
  if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', async () => {
      const roomId = roomIdInput.value.trim();
      const roomKey = roomKeyInput.value.trim();
      if (!roomId) return alert('कृपया एक वैध रूम कोड दर्ज करें');

      const info = await window.bhashaSync.joinRoom(roomId, roomKey);
      if (roomFingerprint) roomFingerprint.textContent = info.fingerprint;
      alert(`रूम ${info.roomId} में सफलतापूर्वक जुड़े! (E2EE सक्रिय)`);
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
        alert('पेयरिंग लिंक क्लिपबोर्ड में कॉपी हो गया है! इसे अन्य डिवाइस पर खोलें।');
      }
    });
  }

  window.bhashaSync.onMessageReceived = (incomingRecord) => {
    appendMessageUI(incomingRecord, true);
    // Automatically play incoming translated message in distinct speaker voice
    const spk = window.bhashaAudio.speakers.find(s => s.id === incomingRecord.speakerId) || {
      pitch: incomingRecord.pitch || 1.0,
      rate: 1.0,
      name: incomingRecord.speakerName
    };
    window.bhashaTTS.speak(incomingRecord.hindiText, spk);
  };

  window.bhashaSync.onPeerCountChanged = (count) => {
    if (peerCountBadge) {
      peerCountBadge.textContent = `${count} जुड़े हुए डिवाइस`;
    }
  };

  // 12. Speakers Tab: Render & Manage Speakers
  function renderSpeakerProfiles() {
    if (!speakerProfilesList) return;
    speakerProfilesList.innerHTML = '';

    window.bhashaAudio.speakers.forEach((spk, idx) => {
      const row = document.createElement('div');
      row.className = 'p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4';
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow" style="background-color: ${spk.color}">
            ${idx + 1}
          </span>
          <div>
            <h4 class="font-bold text-slate-200 text-sm">${spk.name}</h4>
            <p class="text-xs text-slate-400">${spk.desc} (पिच: ${spk.pitch}x, गति: ${spk.rate}x)</p>
          </div>
        </div>

        <div class="flex items-center gap-3 w-full md:w-auto justify-end">
          <button class="preview-voice-btn px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors">
            🔊 आवाज़ परीक्षण (Test)
          </button>
          <button class="select-speaker-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            spk.id === window.bhashaAudio.getCurrentSpeaker().id
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
          }">
            ${spk.id === window.bhashaAudio.getCurrentSpeaker().id ? 'सक्रिय वक्ता ✓' : 'चुनें'}
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
      const name = prompt('नए वक्ता का नाम दर्ज करें (उदा. वक्ता 5 या व्यक्ति का नाम):');
      if (name && name.trim()) {
        window.bhashaAudio.addSpeaker(name.trim());
        renderSpeakerPills();
        renderSpeakerProfiles();
      }
    });
  }

  // 13. Custom Vocabulary Additions
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
      tag.className = 'flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-xs';
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
      if (!src || !hnd) return alert('कृपया शब्द और उसका हिन्दी अर्थ दोनों भरें');

      await window.bhashaTranslator.addCustomWord(src, hnd);
      customWordInput.value = '';
      customMeaningInput.value = '';
      await renderCustomWords();
      alert(`शब्द "${src}" का हिन्दी अर्थ "${hnd}" ऑफ़लाइन डिक्शनरी में सहेज लिया गया है!`);
    });
  }
});
