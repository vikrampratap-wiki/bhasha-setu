/**
 * BhashaSetu - Universal Any-Language to Hindi Translation Engine
 *
 * Capabilities:
 * 1. Universal Script & Language Auto-Detection across 40+ languages & 25+ scripts
 *    (Indian & International languages running on Mobile, Tablet, or Desktop)
 * 2. 100% Offline Multi-tier Translation Engine (Phrasebook + Word Matrix + Multi-script Phonetic Transliteration)
 * 3. Multi-Endpoint Online Neural Fallback (Google Translate GTX + MyMemory API)
 * 4. Custom User Vocabulary from IndexedDB
 */

const LANGUAGE_CATALOG = {
  auto: { name: 'ऑटो पहचान (Auto Detect)', native: 'Auto Detect', bcp47: 'en-US' },
  hi: { name: 'हिन्दी', native: 'हिन्दी (Hindi)', bcp47: 'hi-IN' },
  en: { name: 'अंग्रेजी', native: 'English', bcp47: 'en-US' },
  bn: { name: 'बंगाली', native: 'বাংলা', bcp47: 'bn-IN' },
  ta: { name: 'तमिल', native: 'தமிழ்', bcp47: 'ta-IN' },
  te: { name: 'तेलुगु', native: 'తెలుగు', bcp47: 'te-IN' },
  mr: { name: 'मराठी', native: 'मराठी', bcp47: 'mr-IN' },
  gu: { name: 'गुजराती', native: 'ગુજરાતી', bcp47: 'gu-IN' },
  pa: { name: 'पंजाबी', native: 'ਪੰਜਾਬੀ', bcp47: 'pa-IN' },
  kn: { name: 'कन्नड़', native: 'ಕನ್ನಡ', bcp47: 'kn-IN' },
  ml: { name: 'मलयालम', native: 'മലയാളം', bcp47: 'ml-IN' },
  or: { name: 'ओड़िया', native: 'ଓଡ଼ିଆ', bcp47: 'or-IN' },
  as: { name: 'असमिया', native: 'অসমীয়া', bcp47: 'as-IN' },
  ur: { name: 'उर्दू', native: 'اردو', bcp47: 'ur-PK' },
  sa: { name: 'संस्कृत', native: 'संस्कृतम्', bcp47: 'sa-IN' },
  ne: { name: 'नेपाली', native: 'नेपाली', bcp47: 'ne-NP' },
  es: { name: 'स्पैनिश', native: 'Español', bcp47: 'es-ES' },
  fr: { name: 'फ्रेंच', native: 'Français', bcp47: 'fr-FR' },
  de: { name: 'जर्मन', native: 'Deutsch', bcp47: 'de-DE' },
  ru: { name: 'रूसी', native: 'Русский', bcp47: 'ru-RU' },
  zh: { name: 'चीनी', native: '中文', bcp47: 'zh-CN' },
  ja: { name: 'जापानी', native: '日本語', bcp47: 'ja-JP' },
  ko: { name: 'कोरियाई', native: '한국어', bcp47: 'ko-KR' },
  ar: { name: 'अरबी', native: 'العربية', bcp47: 'ar-SA' },
  pt: { name: 'पुर्तगाली', native: 'Português', bcp47: 'pt-BR' },
  it: { name: 'इतालवी', native: 'Italiano', bcp47: 'it-IT' },
  nl: { name: 'डच', native: 'Nederlands', bcp47: 'nl-NL' },
  tr: { name: 'तुर्की', native: 'Türkçe', bcp47: 'tr-TR' },
  fa: { name: 'फ़ारसी', native: 'فارسی', bcp47: 'fa-IR' },
  vi: { name: 'वियतनामी', native: 'Tiếng Việt', bcp47: 'vi-VN' },
  th: { name: 'थाई', native: 'ไทย', bcp47: 'th-TH' },
  id: { name: 'इंडोनेशियाई', native: 'Bahasa Indonesia', bcp47: 'id-ID' },
  ms: { name: 'मलय', native: 'Bahasa Melayu', bcp47: 'ms-MY' },
  sw: { name: 'स्वाहिली', native: 'Kiswahili', bcp47: 'sw-KE' },
  pl: { name: 'पोलिश', native: 'Polski', bcp47: 'pl-PL' },
  uk: { name: 'यूक्रेनी', native: 'Українська', bcp47: 'uk-UA' },
  el: { name: 'ग्रीक', native: 'Ελληνικά', bcp47: 'el-GR' },
  he: { name: 'हिब्रू', native: 'עברית', bcp47: 'he-IL' },
  si: { name: 'सिंहली', native: 'සිංහල', bcp47: 'si-LK' },
  my: { name: 'बर्मी', native: 'မြန်မာ', bcp47: 'my-MM' },
  km: { name: 'ख्मेर', native: 'ខ្មែរ', bcp47: 'km-KH' }
};

class BhashaTranslator {
  constructor() {
    this.dictionary = null;
    this.customWords = new Map();
    this.translationCache = new Map();
    this.forceOffline = false;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
    this.lastDetectedLang = 'en';

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('online', () => { this.isOnline = true; });
      window.addEventListener('offline', () => { this.isOnline = false; });
    }
    this.initFallbackDict();
  }

  async init() {
    if (typeof fetch !== 'undefined') {
      try {
        const response = await fetch('data/offline-dictionary.json');
        if (response && response.ok) {
          this.dictionary = await response.json();
          console.log('[Translator] Offline dictionary loaded successfully');
        }
      } catch (e) {
        console.warn('[Translator] Using embedded offline dictionary fallback');
      }
    }

    // Load custom words from IndexedDB if in browser
    try {
      if (typeof window !== 'undefined' && window.bhashaStorage) {
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
          "hello how are you": "नमस्ते, आप कैसे हैं?",
          "how are you": "आप कैसे हैं?",
          "good morning": "सुप्रभात",
          "good afternoon": "नमस्कार / शुभ दोपहर",
          "good evening": "शुभ संध्या",
          "good night": "शुभ रात्रि",
          "thank you": "धन्यवाद",
          "thank you very much": "आपका बहुत-बहुत धन्यवाद",
          "welcome": "स्वागत है",
          "please": "कृपया",
          "yes": "हाँ",
          "no": "नहीं",
          "sorry": "माफ़ कीजिये",
          "where is": "कहाँ है",
          "help me": "मेरी मदद करें",
          "i need help": "मुझे मदद चाहिए",
          "welcome to our live broadcast": "हमारे लाइव प्रसारण में आपका स्वागत है",
          "breaking news from around the world": "दुनिया भर से मुख्य समाचार",
          "artificial intelligence is transforming technology": "कृत्रिम बुद्धिमत्ता तकनीक को बदल रही है",
          "the patient needs immediate medical attention": "मरीज़ को तुरंत चिकित्सा सहायता की आवश्यकता है"
        },
        es: {
          "hola": "नमस्ते",
          "hola amigo": "नमस्ते दोस्त",
          "cómo estás": "आप कैसे हैं?",
          "como estas": "आप कैसे हैं?",
          "buenos días": "सुप्रभात",
          "gracias": "धन्यवाद",
          "muchas gracias": "बहुत-बहुत धन्यवाद",
          "por favor": "कृपया",
          "bienvenidos a la transmisión en vivo": "लाइव प्रसारण में आपका स्वागत है"
        },
        fr: {
          "bonjour": "नमस्ते / सुप्रभात",
          "comment allez-vous": "आप कैसे हैं?",
          "merci": "धन्यवाद",
          "merci beaucoup": "बहुत-बहुत धन्यवाद",
          "s'il vous plaît": "कृपया",
          "au revoir": "अलविदा",
          "bienvenue dans notre conférence": "हमारे सम्मेलन में आपका स्वागत है"
        },
        de: {
          "hallo": "नमस्ते",
          "guten morgen": "सुप्रभात",
          "danke": "धन्यवाद",
          "bitte": "कृपया / स्वागत है",
          "wie geht es ihnen": "आप कैसे हैं?"
        },
        ru: {
          "здравствуйте": "नमस्ते",
          "привет": "नमस्ते",
          "спасибо": "धन्यवाद",
          "помогите мне": "मेरी मदद करें"
        },
        zh: {
          "你好": "नमस्ते",
          "谢谢": "धन्यवाद",
          "早上好": "सुप्रभात",
          "欢迎观看直播": "लाइव प्रसारण देखने के लिए आपका स्वागत है"
        },
        ja: {
          "こんにちは": "नमस्ते",
          "ありがとう": "धन्यवाद",
          "おはようございます": "सुप्रभात",
          "本日のニュースをお伝えします": "हम आज के समाचार प्रस्तुत कर रहे हैं"
        },
        ko: {
          "안녕하세요": "नमस्ते",
          "감사합니다": "धन्यवाद",
          "도와주세요": "मेरी मदद करें",
          "생방송에 오신 것을 환영합니다": "लाइव प्रसारण में आपका स्वागत है"
        },
        ar: {
          "مرحبا": "नमस्ते",
          "السلام عليكم": "नमस्ते / शांति आप पर हो",
          "شكرا": "धन्यवाद",
          "أهلا بكم في البث المباشر": "लाइव प्रसारण में आपका स्वागत है"
        },
        ta: {
          "வணக்கம்": "नमस्ते",
          "நன்றி": "धन्यवाद",
          "எப்படி இருக்கிறீர்கள்": "आप कैसे हैं?",
          "நேரலை ஒளிபரப்பிற்கு வரவேற்கிறோம்": "लाइव प्रसारण में आपका स्वागत है"
        },
        te: {
          "నమస్కారం": "नमस्ते",
          "ధన్యవాదాలు": "धन्यवाद",
          "మీరు ఎలా ఉన్నారు": "आप कैसे हैं?"
        },
        bn: {
          "নমস্কার": "नमस्ते",
          "ধন্যবাদ": "धन्यवाद",
          "কেমন আছেন": "आप कैसे हैं?"
        },
        mr: {
          "नमस्कार": "नमस्ते",
          "तुम्ही कसे आहात": "आप कैसे हैं?",
          "धन्यवाद": "धन्यवाद"
        },
        gu: {
          "નમસ્તે": "नमस्ते",
          "તમે કેમ છો": "आप कैसे हैं?",
          "આભાર": "धन्यवाद"
        },
        pa: {
          "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ": "नमस्ते / सत श्री अकाल",
          "ਧੰਨਵਾਦ": "धन्यवाद"
        },
        kn: {
          "ನಮಸ್ಕಾರ": "नमस्ते",
          "ಧನ್ಯವಾದಗಳು": "धन्यवाद"
        },
        ml: {
          "നമസ്കാരം": "नमस्ते",
          "നന്ദി": "धन्यवाद"
        },
        or: {
          "ନମସ୍କାର": "नमस्ते",
          "ଧନ୍ୟବାଦ": "धन्यवाद"
        },
        th: {
          "สวัสดี": "नमस्ते",
          "ขอบคุณ": "धन्यवाद"
        },
        vi: {
          "xin chào": "नमस्ते",
          "cảm ơn": "धन्यवाद"
        },
        pt: {
          "olá": "नमस्ते",
          "obrigado": "धन्यवाद",
          "bom dia": "सुप्रभात"
        },
        it: {
          "ciao": "नमस्ते",
          "grazie": "धन्यवाद",
          "buongiorno": "सुप्रभात"
        },
        tr: {
          "merhaba": "नमस्ते",
          "teşekkür ederim": "धन्यवाद"
        },
        id: {
          "halo": "नमस्ते",
          "terima kasih": "धन्यवाद",
          "selamat pagi": "सुप्रभात"
        }
      },
      words: {
        en: {
          "i": "मैं", "you": "आप", "we": "हम", "they": "वे", "he": "वह", "she": "वह",
          "is": "है", "are": "हैं", "am": "हूँ", "was": "था", "were": "थे",
          "good": "अच्छा", "bad": "बुरा", "water": "पानी", "food": "खाना", "friend": "दोस्त",
          "tablet": "टैबलेट", "mobile": "मोबाइल", "desktop": "डेस्कटॉप", "screen": "स्क्रीन",
          "language": "भाषा", "translate": "अनुवाद", "live": "लाइव", "video": "वीडियो", "audio": "ऑडियो"
        }
      }
    };
  }

  getLanguageInfo(langCode) {
    const code = (langCode || 'en').split('-')[0].toLowerCase();
    return LANGUAGE_CATALOG[code] || {
      name: code.toUpperCase(),
      native: code.toUpperCase(),
      bcp47: 'en-US'
    };
  }

  getLanguageName(langCode) {
    const info = this.getLanguageInfo(langCode);
    if (langCode === 'auto') return info.name;
    return `${info.native} (${info.name})`;
  }

  /**
   * Detect source language from any script or vocabulary across 40+ world languages
   */
  detectLanguage(text) {
    if (!text || !text.trim()) return 'en';
    const trimmed = text.trim();

    // 1. Unicode Script-based Exact Detection
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(trimmed)) return 'ko'; // Hangul (Korean)
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(trimmed)) return 'ja'; // Hiragana / Katakana (Japanese)
    if (/[\u4E00-\u9FFF]/.test(trimmed)) return 'zh'; // CJK Unified Ideographs (Chinese)
    if (/[\u0E00-\u0E7F]/.test(trimmed)) return 'th'; // Thai
    if (/[\u0D00-\u0D7F]/.test(trimmed)) return 'ml'; // Malayalam
    if (/[\u0C80-\u0CFF]/.test(trimmed)) return 'kn'; // Kannada
    if (/[\u0C00-\u0C7F]/.test(trimmed)) return 'te'; // Telugu
    if (/[\u0B80-\u0BFF]/.test(trimmed)) return 'ta'; // Tamil
    if (/[\u0B00-\u0B7F]/.test(trimmed)) return 'or'; // Odia
    if (/[\u0A80-\u0AFF]/.test(trimmed)) return 'gu'; // Gujarati
    if (/[\u0A00-\u0A7F]/.test(trimmed)) return 'pa'; // Gurmukhi (Punjabi)
    if (/[\u0980-\u09FF]/.test(trimmed)) {
      if (/[ৰৱ]/.test(trimmed)) return 'as'; // Assamese specific chars
      return 'bn'; // Bengali
    }
    if (/[\u0D80-\u0DFF]/.test(trimmed)) return 'si'; // Sinhala
    if (/[\u1000-\u109F]/.test(trimmed)) return 'my'; // Myanmar / Burmese
    if (/[\u1780-\u17FF]/.test(trimmed)) return 'km'; // Khmer
    if (/[\u0370-\u03FF]/.test(trimmed)) return 'el'; // Greek
    if (/[\u0590-\u05FF]/.test(trimmed)) return 'he'; // Hebrew
    if (/[\u0600-\u06FF]/.test(trimmed)) {
      if (/[ٹڈڑںےۓ]/.test(trimmed)) return 'ur'; // Urdu specific letters
      if (/[پچژگ]/.test(trimmed)) return 'fa'; // Persian specific letters
      return 'ar'; // Arabic
    }
    if (/[\u0400-\u04FF]/.test(trimmed)) {
      if (/[іїєґ]/i.test(trimmed)) return 'uk'; // Ukrainian
      return 'ru'; // Russian / Cyrillic
    }
    if (/[\u0900-\u097F]/.test(trimmed)) {
      // Distinguish Marathi / Nepali / Sanskrit from Hindi when possible
      if (/\b(आहे|तुम्ही|कसे|नाही|माझे|आपले)\b/.test(trimmed)) return 'mr';
      if (/\b(छ|तपाईं|कस्तो|धन्यवाद|हुनुहुन्छ)\b/.test(trimmed)) return 'ne';
      return 'hi';
    }

    // 2. Latin-script Multi-Language Heuristics
    const lower = trimmed.toLowerCase();
    if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(lower) || /\b(xin chào|cảm ơn|tạm biệt)\b/i.test(lower)) return 'vi';
    if (/[ğışçöü]/i.test(lower) && /\b(merhaba|teşekkür|nasılsınız|günaydın|lütfen|evet|hayır)\b/i.test(lower)) return 'tr';
    if (/\b(hola|cómo|estás|buenos|días|gracias|por favor|bienvenidos|transmisión|necesito|ayuda)\b/i.test(lower)) return 'es';
    if (/\b(bonjour|comment|allez-vous|merci|beaucoup|s'il|plaît|au revoir|bienvenue|notre)\b/i.test(lower)) return 'fr';
    if (/\b(hallo|guten|morgen|danke|schön|bitte|tschüss|hilfe|wie geht|ihnen)\b/i.test(lower)) return 'de';
    if (/\b(olá|obrigado|obrigada|bom dia|como está|você|não)\b/i.test(lower)) return 'pt';
    if (/\b(ciao|buongiorno|grazie|per favore|come stai|arrivederci)\b/i.test(lower)) return 'it';
    if (/\b(selamat pagi|terima kasih|apa kabar|tolong)\b/i.test(lower)) return 'id';
    if (/\b(habari|asante|karibu|kwaheri)\b/i.test(lower)) return 'sw';
    if (/\b(goedemorgen|dank u|alstublieft|hoe gaat het)\b/i.test(lower)) return 'nl';
    if (/\b(dzień dobry|dziękuję|proszę|cześć)\b/i.test(lower)) return 'pl';

    return 'en';
  }

  /**
   * Translate any language text into Hindi and return metadata
   */
  async translateWithMeta(text, sourceLang = 'auto') {
    if (!text || !text.trim()) {
      return { translatedText: '', detectedLang: 'en', detectedLangName: this.getLanguageName('en'), isOffline: true };
    }
    const cleanText = text.trim();
    const resolvedLang = (!sourceLang || sourceLang === 'auto') ? this.detectLanguage(cleanText) : sourceLang.split('-')[0].toLowerCase();
    this.lastDetectedLang = resolvedLang;

    const isOffline = !this.isOnline || this.forceOffline;
    const translatedText = await this.translateToHindi(cleanText, resolvedLang);

    return {
      translatedText,
      detectedLang: resolvedLang,
      detectedLangName: this.getLanguageName(resolvedLang),
      isOffline
    };
  }

  /**
   * Translate any language text into Hindi
   * @param {string} text
   * @param {string} sourceLang ('auto' or language code)
   */
  async translateToHindi(text, sourceLang = 'auto') {
    if (!text || !text.trim()) return '';

    const cleanText = text.trim();
    if (!sourceLang || sourceLang === 'auto') {
      sourceLang = this.detectLanguage(cleanText);
    } else {
      sourceLang = sourceLang.split('-')[0].toLowerCase();
    }
    this.lastDetectedLang = sourceLang;

    // If source is already Hindi
    if (sourceLang === 'hi') {
      return cleanText;
    }

    const cacheKey = `${sourceLang}:${cleanText.toLowerCase()}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    // 1. Check exact custom vocabulary or exact offline phrase match first for instant zero-latency accuracy
    const exactOffline = this.lookupExactPhrase(cleanText, sourceLang);
    if (exactOffline && (this.forceOffline || !this.isOnline)) {
      this.translationCache.set(cacheKey, exactOffline);
      return exactOffline;
    }

    // 2. Try online neural translation if internet is active and not forced offline
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

    // 3. Offline Translation Engine
    const offlineResult = this.translateOffline(cleanText, sourceLang);
    this.translationCache.set(cacheKey, offlineResult);
    return offlineResult;
  }

  lookupExactPhrase(text, lang) {
    const lowerText = text.toLowerCase().trim();
    if (this.customWords.has(lowerText)) {
      return this.customWords.get(lowerText);
    }
    const stripped = lowerText.replace(/[.,?!।؟]/g, '').trim();

    if (this.dictionary && this.dictionary.phrases) {
      if (this.dictionary.phrases[lang]) {
        if (this.dictionary.phrases[lang][lowerText]) return this.dictionary.phrases[lang][lowerText];
        if (this.dictionary.phrases[lang][stripped]) return this.dictionary.phrases[lang][stripped];
      }
      // Search across all language phrasebooks if auto/fallback
      for (const l of Object.keys(this.dictionary.phrases)) {
        const map = this.dictionary.phrases[l];
        if (map[lowerText]) return map[lowerText];
        if (map[stripped]) return map[stripped];
      }
    }
    return null;
  }

  /**
   * High-Performance Offline Translation Engine
   */
  translateOffline(text, lang) {
    const exact = this.lookupExactPhrase(text, lang);
    if (exact) return exact;

    // Word-by-word substitution with phrase windowing
    const tokens = text.split(/(\s+|[.,?!;:।])/);
    const resultTokens = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token.trim() || /^[.,?!;:।]+$/.test(token)) {
        resultTokens.push(token);
        continue;
      }

      const cleanWord = token.toLowerCase().replace(/[.,?!;:()"']/g, '');

      // Check custom words
      if (this.customWords.has(cleanWord)) {
        resultTokens.push(this.customWords.get(cleanWord));
        continue;
      }

      // Check language words or phrases for single word
      let translatedWord = null;
      if (this.dictionary) {
        if (this.dictionary.words && this.dictionary.words[lang] && this.dictionary.words[lang][cleanWord]) {
          translatedWord = this.dictionary.words[lang][cleanWord];
        } else if (this.dictionary.words && this.dictionary.words['en'] && this.dictionary.words['en'][cleanWord]) {
          translatedWord = this.dictionary.words['en'][cleanWord];
        } else if (this.dictionary.phrases && this.dictionary.phrases[lang] && this.dictionary.phrases[lang][cleanWord]) {
          translatedWord = this.dictionary.phrases[lang][cleanWord];
        } else if (this.dictionary.phrases) {
          for (const l of Object.keys(this.dictionary.phrases)) {
            if (this.dictionary.phrases[l][cleanWord]) {
              translatedWord = this.dictionary.phrases[l][cleanWord];
              break;
            }
          }
        }
      }

      if (translatedWord) {
        resultTokens.push(translatedWord);
      } else if (/^[a-zA-Z\u00C0-\u017F]+$/.test(cleanWord)) {
        resultTokens.push(this.transliterateToDevanagari(cleanWord));
      } else if (/[\u0980-\u0DFF]/.test(cleanWord)) {
        // Indic script cross-transliteration (Bengali, Gujarati, Gurmukhi, Tamil, Telugu, Kannada, Malayalam, Odia -> Devanagari)
        resultTokens.push(this.transliterateIndicToDevanagari(cleanWord));
      } else {
        resultTokens.push(token);
      }
    }

    let combined = resultTokens.join('');
    if (text.endsWith('?') && !combined.endsWith('?')) combined += '?';
    return combined;
  }

  /**
   * Indic Unicode Block offset transliteration into Devanagari (0x0900-0x097F)
   * Works because Indian Brahmic scripts in Unicode share isomorphic code-point offsets!
   */
  transliterateIndicToDevanagari(word) {
    let out = '';
    for (let i = 0; i < word.length; i++) {
      const code = word.charCodeAt(i);
      // Bengali (0980), Gurmukhi (0A00), Gujarati (0A80), Odia (0B00), Tamil (0B80), Telugu (0C00), Kannada (0C80), Malayalam (0D00)
      if (code >= 0x0980 && code <= 0x0D7F) {
        const offset = code & 0x7F;
        const devanagariCode = 0x0900 + offset;
        out += String.fromCharCode(devanagariCode);
      } else {
        out += word[i];
      }
    }
    return out;
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
      { r: 'h', d: 'ह' }, { r: 'z', d: 'ज़' }, { r: 'c', d: 'क' }, { r: 'q', d: 'क' },
      { r: 'a', d: 'ा' }, { r: 'e', d: 'े' }, { r: 'i', d: 'ि' }, { r: 'o', d: 'ो' }, { r: 'u', d: 'ु' }
    ];

    let w = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let out = '';
    let i = 0;

    const initialVowels = { 'aa': 'आ', 'ee': 'ई', 'oo': 'ऊ', 'ai': 'ऐ', 'au': 'औ', 'a': 'अ', 'i': 'इ', 'u': 'उ', 'e': 'ए', 'o': 'ओ' };
    for (const v of Object.keys(initialVowels)) {
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
   * Online neural translation with dual-endpoint fallback (Google GTX + MyMemory)
   */
  async translateOnline(text, sourceLang) {
    const src = (!sourceLang || sourceLang === 'auto') ? 'auto' : sourceLang;

    // Tier 1: Google GTX free public neural endpoint (supports 130+ languages with auto-detection)
    try {
      const controller1 = new AbortController();
      const t1 = setTimeout(() => controller1.abort(), 3000);
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(src)}&tl=hi&dt=t&q=${encodeURIComponent(text)}`;
      const res1 = await fetch(gtxUrl, { signal: controller1.signal });
      clearTimeout(t1);
      if (res1.ok) {
        const data = await res1.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const combined = data[0].map(part => (Array.isArray(part) ? part[0] : '')).join('').trim();
          if (data[2] && typeof data[2] === 'string') {
            this.lastDetectedLang = data[2].toLowerCase();
          }
          if (combined) return combined;
        }
      }
    } catch (e) {
      // Fall through to Tier 2
    }

    // Tier 2: MyMemory public translation API
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 3500);

    try {
      const mmSrc = src === 'auto' ? this.detectLanguage(text) : src;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${mmSrc}|hi`;
      const res = await fetch(url, { signal: controller2.signal });
      clearTimeout(timeout2);

      if (res.ok) {
        const data = await res.json();
        if (data && data.responseData && data.responseData.translatedText) {
          const trans = data.responseData.translatedText.trim();
          if (!trans.includes('MYMEMORY WARNING') && !trans.includes('PLEASE SELECT TWO DISTINCT LANGUAGES')) {
            return trans;
          }
        }
      }
      throw new Error('API response invalid');
    } catch (e) {
      clearTimeout(timeout2);
      throw e;
    }
  }

  async addCustomWord(sourceWord, hindiMeaning, lang = 'en') {
    this.customWords.set(sourceWord.toLowerCase().trim(), hindiMeaning.trim());
    if (typeof window !== 'undefined' && window.bhashaStorage) {
      await window.bhashaStorage.saveCustomWord(sourceWord, hindiMeaning, lang);
    }
  }
}

if (typeof window !== 'undefined') {
  window.LANGUAGE_CATALOG = LANGUAGE_CATALOG;
  window.bhashaTranslator = new BhashaTranslator();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BhashaTranslator, LANGUAGE_CATALOG };
}
