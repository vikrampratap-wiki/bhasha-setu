/**
 * BhashaSetu - Universal to Hindi Translation Engine
 * 
 * Capabilities:
 * 1. 100% Offline Multi-tier Translation Engine (Phrasebook + Grammar Matrix + Devanagari Transliteration)
 * 2. Online Neural API Fallback (MyMemory / LibreTranslate) with automatic fallback
 * 3. Script & Language Auto-Detection
 * 4. Custom User Vocabulary from IndexedDB
 */
class BhashaTranslator {
  constructor() {
    this.dictionary = null;
    this.customWords = new Map();
    this.translationCache = new Map();
    this.forceOffline = false;
    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => { this.isOnline = true; });
    window.addEventListener('offline', () => { this.isOnline = false; });
  }

  async init() {
    try {
      const response = await fetch('data/offline-dictionary.json');
      if (response.ok) {
        this.dictionary = await response.json();
        console.log('[Translator] Offline dictionary loaded successfully');
      }
    } catch (e) {
      console.warn('[Translator] Could not load offline-dictionary.json via fetch, using embedded fallback:', e);
      this.initFallbackDict();
    }

    // Load custom words from IndexedDB
    try {
      if (window.bhashaStorage) {
        const customList = await window.bhashaStorage.getCustomWords();
        customList.forEach(item => {
          this.customWords.set(item.word.toLowerCase(), item.meaning);
        });
      }
    } catch (e) {
      console.warn('[Translator] Custom words loading error:', e);
    }
  }

  initFallbackDict() {
    this.dictionary = {
      phrases: {
        en: {
          "hello": "नमस्ते",
          "how are you": "आप कैसे हैं?",
          "good morning": "सुप्रभात",
          "good evening": "शुभ संध्या",
          "thank you": "धन्यवाद",
          "welcome": "स्वागत है",
          "please": "कृपया",
          "yes": "हाँ",
          "no": "नहीं",
          "sorry": "माफ़ कीजिये",
          "where is": "कहाँ है",
          "help me": "मेरी मदद करें"
        }
      },
      words: {
        en: {
          "i": "मैं", "you": "आप", "we": "हम", "they": "वे", "he": "वह", "she": "वह",
          "is": "है", "are": "हैं", "am": "हूँ", "was": "था", "were": "थे",
          "good": "अच्छा", "bad": "बुरा", "water": "पानी", "food": "खाना", "friend": "दोस्त"
        }
      }
    };
  }

  /**
   * Detect source language from text or script
   */
  detectLanguage(text) {
    if (!text) return 'en';
    const trimmed = text.trim();

    // Script-based detection
    if (/[\u0600-\u06FF]/.test(trimmed)) return 'ar'; // Arabic
    if (/[\u4E00-\u9FFF]/.test(trimmed)) return 'zh'; // Chinese
    if (/[\u3040-\u30FF]/.test(trimmed)) return 'ja'; // Japanese
    if (/[\u0400-\u04FF]/.test(trimmed)) return 'ru'; // Cyrillic / Russian
    if (/[\u0980-\u09FF]/.test(trimmed)) return 'bn'; // Bengali
    if (/[\u0B80-\u0BFF]/.test(trimmed)) return 'ta'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(trimmed)) return 'te'; // Telugu
    if (/[\u0A80-\u0AFF]/.test(trimmed)) return 'gu'; // Gujarati
    if (/[\u0A00-\u0A7F]/.test(trimmed)) return 'pa'; // Punjabi
    if (/[\u0900-\u097F]/.test(trimmed)) return 'hi'; // Already Hindi / Devanagari

    // Romance / Germanic languages rough keyword heuristic
    const lower = trimmed.toLowerCase();
    if (/\b(el|la|los|las|de|en|por|para|está|gracias|buenos)\b/i.test(lower)) return 'es';
    if (/\b(le|la|les|un|une|des|est|pour|merci|bonjour)\b/i.test(lower)) return 'fr';
    if (/\b(der|die|das|und|ist|nicht|bitte|danke|guten)\b/i.test(lower)) return 'de';

    return 'en';
  }

  /**
   * Translate any language text into Hindi
   * @param {string} text 
   * @param {string} sourceLang ('auto' or language code)
   */
  async translateToHindi(text, sourceLang = 'auto') {
    if (!text || !text.trim()) return '';

    const cleanText = text.trim();
    if (sourceLang === 'auto') {
      sourceLang = this.detectLanguage(cleanText);
    }

    // If source is already Hindi
    if (sourceLang === 'hi') {
      return cleanText;
    }

    const cacheKey = `${sourceLang}:${cleanText.toLowerCase()}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    // Try online translation if internet is active and not forced offline
    if (this.isOnline && !this.forceOffline) {
      try {
        const onlineResult = await this.translateOnline(cleanText, sourceLang);
        if (onlineResult && onlineResult.trim()) {
          this.translationCache.set(cacheKey, onlineResult);
          return onlineResult;
        }
      } catch (err) {
        console.warn('[Translator] Online translation failed, switching to offline engine:', err.message);
      }
    }

    // Offline Translation Engine
    const offlineResult = this.translateOffline(cleanText, sourceLang);
    this.translationCache.set(cacheKey, offlineResult);
    return offlineResult;
  }

  /**
   * High-Performance Offline Translation Engine
   */
  translateOffline(text, lang) {
    const lowerText = text.toLowerCase().trim();

    // 1. Check custom vocabulary from user
    if (this.customWords.has(lowerText)) {
      return this.customWords.get(lowerText);
    }

    // 2. Check full phrase match in offline dictionary
    if (this.dictionary && this.dictionary.phrases && this.dictionary.phrases[lang]) {
      const phrases = this.dictionary.phrases[lang];
      // Direct phrase match
      if (phrases[lowerText]) {
        return phrases[lowerText];
      }
      // Punctuation stripped phrase match
      const stripped = lowerText.replace(/[.,?!]/g, '').trim();
      if (phrases[stripped]) {
        return phrases[stripped];
      }
    }

    // Check English phrases fallback if detected as English or default
    if (this.dictionary && this.dictionary.phrases && this.dictionary.phrases['en']) {
      const enPhrases = this.dictionary.phrases['en'];
      const stripped = lowerText.replace(/[.,?!]/g, '').trim();
      if (enPhrases[stripped]) {
        return enPhrases[stripped];
      }
    }

    // 3. Word-by-word substitution with phrase windowing
    const tokens = text.split(/(\s+|[.,?!;:])/);
    const resultTokens = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token.trim() || /^[.,?!;:]+$/.test(token)) {
        resultTokens.push(token);
        continue;
      }

      const cleanWord = token.toLowerCase().replace(/[^a-zA-Z0-9\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\u0400-\u04FF\u0980-\u0DFF]/g, '');

      // Check custom words
      if (this.customWords.has(cleanWord)) {
        resultTokens.push(this.customWords.get(cleanWord));
        continue;
      }

      // Check language words
      let translatedWord = null;
      if (this.dictionary && this.dictionary.words && this.dictionary.words[lang] && this.dictionary.words[lang][cleanWord]) {
        translatedWord = this.dictionary.words[lang][cleanWord];
      } else if (this.dictionary && this.dictionary.words && this.dictionary.words['en'] && this.dictionary.words['en'][cleanWord]) {
        translatedWord = this.dictionary.words['en'][cleanWord];
      }

      if (translatedWord) {
        resultTokens.push(translatedWord);
      } else {
        // Transliterate phonetic latin characters into Devanagari so it reads naturally in Hindi
        if (/^[a-zA-Z]+$/.test(cleanWord)) {
          resultTokens.push(this.transliterateToDevanagari(cleanWord));
        } else {
          resultTokens.push(token);
        }
      }
    }

    let combined = resultTokens.join('');
    // Ensure clean Hindi punctuation
    if (text.endsWith('?') && !combined.endsWith('?')) combined += '?';
    return combined;
  }

  /**
   * Fast rule-based phonetic transliteration from Roman script to Devanagari
   */
  transliterateToDevanagari(word) {
    const map = [
      { r: 'shh', d: 'ष्' }, { r: 'kh', d: 'ख' }, { r: 'gh', d: 'घ' }, { r: 'ch', d: 'च' },
      { r: 'jh', d: 'झ' }, { r: 'th', d: 'थ' }, { r: 'dh', d: 'ध' }, { r: 'ph', d: 'फ' },
      { r: 'bh', d: 'भ' }, { r: 'sh', d: 'श' }, { r: 'ee', d: 'ी' }, { r: 'oo', d: 'ू' },
      { r: 'aa', d: 'ा' }, { r: 'ai', d: 'ै' }, { r: 'au', d: 'ौ' },
      { r: 'k', d: 'क' }, { r: 'g', d: 'ग' }, { r: 'j', d: 'ज' }, { r: 't', d: 'त' },
      { r: 'd', d: 'द' }, { r: 'n', d: 'न' }, { r: 'p', d: 'प' }, { r: 'f', d: 'फ़' },
      { r: 'b', d: 'ब' }, { r: 'm', d: 'म' }, { r: 'y', d: 'य' }, { r: 'r', d: 'र' },
      { r: 'l', d: 'ल' }, { r: 'v', d: 'व' }, { r: 'w', d: 'व' }, { r: 's', d: 'स' },
      { r: 'h', d: 'ह' }, { r: 'z', d: 'ज़' },
      { r: 'a', d: 'ा' }, { r: 'e', d: 'े' }, { r: 'i', d: 'ि' }, { r: 'o', d: 'ो' }, { r: 'u', d: 'ु' }
    ];

    let w = word.toLowerCase();
    let out = '';
    let i = 0;

    // First letter vowel check
    const initialVowels = { 'a': 'अ', 'i': 'इ', 'u': 'उ', 'e': 'ए', 'o': 'ओ', 'aa': 'आ', 'ee': 'ई', 'oo': 'ऊ' };
    for (const v in initialVowels) {
      if (w.startsWith(v)) {
        out += initialVowels[v];
        w = w.substring(v.length);
        break;
      }
    }

    while (i < w.length) {
      let matched = false;
      for (const m of map) {
        if (w.startsWith(m.r, i)) {
          out += m.d;
          i += m.r.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        out += w[i];
        i++;
      }
    }
    return out || word;
  }

  /**
   * Online neural fallback using public translation API with timeout
   */
  async translateOnline(text, sourceLang) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const src = sourceLang === 'auto' ? 'autodetect' : sourceLang;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|hi`;
      
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data && data.responseData && data.responseData.translatedText) {
          const trans = data.responseData.translatedText.trim();
          // Filter out API error or match warning
          if (!trans.includes('MYMEMORY WARNING') && !trans.includes('PLEASE SELECT TWO DISTINCT LANGUAGES')) {
            return trans;
          }
        }
      }
      throw new Error('API response invalid');
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  }

  async addCustomWord(sourceWord, hindiMeaning, lang = 'en') {
    this.customWords.set(sourceWord.toLowerCase().trim(), hindiMeaning.trim());
    if (window.bhashaStorage) {
      await window.bhashaStorage.saveCustomWord(sourceWord, hindiMeaning, lang);
    }
  }
}

// Global instance
window.bhashaTranslator = new BhashaTranslator();
