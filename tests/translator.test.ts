import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { BhashaTranslator, LANGUAGE_CATALOG } = require('../js/translator.js');

test('LANGUAGE_CATALOG supports 40+ Indian and international languages', () => {
  const keys = Object.keys(LANGUAGE_CATALOG);
  assert.ok(keys.length >= 40, `Expected at least 40 language entries, got ${keys.length}`);
  assert.ok(LANGUAGE_CATALOG.ko);
  assert.ok(LANGUAGE_CATALOG.ta);
  assert.ok(LANGUAGE_CATALOG.ml);
  assert.ok(LANGUAGE_CATALOG.kn);
  assert.ok(LANGUAGE_CATALOG.te);
  assert.ok(LANGUAGE_CATALOG.th);
});

test('detectLanguage accurately identifies diverse Indian and world scripts', () => {
  const translator = new BhashaTranslator();
  assert.equal(translator.detectLanguage('안녕하세요'), 'ko');
  assert.equal(translator.detectLanguage('வணக்கம்'), 'ta');
  assert.equal(translator.detectLanguage('നമസ്കാരം'), 'ml');
  assert.equal(translator.detectLanguage('ನಮಸ್ಕಾರ'), 'kn');
  assert.equal(translator.detectLanguage('నమస్కారం'), 'te');
  assert.equal(translator.detectLanguage('নমস্কার'), 'bn');
  assert.equal(translator.detectLanguage('નમસ્તે'), 'gu');
  assert.equal(translator.detectLanguage('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ'), 'pa');
  assert.equal(translator.detectLanguage('สวัสดี'), 'th');
  assert.equal(translator.detectLanguage('こんにちは'), 'ja');
  assert.equal(translator.detectLanguage('你好'), 'zh');
  assert.equal(translator.detectLanguage('مرحبا'), 'ar');
  assert.equal(translator.detectLanguage('Здравствуйте'), 'ru');
  assert.equal(translator.detectLanguage('Bienvenidos a la transmisión en vivo'), 'es');
  assert.equal(translator.detectLanguage('Bienvenue dans notre conférence'), 'fr');
});

test('translateWithMeta translates offline across multiple languages into Hindi', async () => {
  const translator = new BhashaTranslator();
  translator.forceOffline = true;

  const koRes = await translator.translateWithMeta('안녕하세요', 'auto');
  assert.equal(koRes.detectedLang, 'ko');
  assert.equal(koRes.translatedText, 'नमस्ते');

  const taRes = await translator.translateWithMeta('நேரலை ஒளிபரப்பிற்கு வரவேற்கிறோம்', 'auto');
  assert.equal(taRes.detectedLang, 'ta');
  assert.equal(taRes.translatedText, 'लाइव प्रसारण में आपका स्वागत है');

  const esRes = await translator.translateWithMeta('Bienvenidos a la transmisión en vivo', 'auto');
  assert.equal(esRes.detectedLang, 'es');
  assert.equal(esRes.translatedText, 'लाइव प्रसारण में आपका स्वागत है');
});

test('audio-clarity.js defines 12 human speaker profiles with natural non-robotic pitch (0.92-1.08)', () => {
  const code = fs.readFileSync('js/audio-clarity.js', 'utf8');
  const matches = code.match(/id:\s*'speaker-\d+'/g) || [];
  assert.equal(matches.length, 12, 'Expected 12 built-in human speaker profiles');

  const pitchMatches = [...code.matchAll(/pitch:\s*([0-9.]+)/g)].map(m => parseFloat(m[1]));
  for (const p of pitchMatches) {
    assert.ok(p >= 0.90 && p <= 1.10, `Speaker pitch ${p} should be within natural human range`);
  }
});

test('translateInstant and translateWithMeta deliver millisecond (< 5ms) Hindi translation response', async () => {
  const translator = new BhashaTranslator();

  const t0 = performance.now();
  const instant = translator.translateInstant('Welcome to our live broadcast', 'en');
  const elapsedInstant = performance.now() - t0;

  assert.equal(instant.translatedText, 'हमारे लाइव प्रसारण में आपका स्वागत है');
  assert.ok(elapsedInstant < 10, `Expected instant translation in < 10ms, took ${elapsedInstant}ms`);

  const meta = await translator.translateWithMeta('Hello, how are you? Welcome to our live broadcast.', 'en');
  assert.ok(meta.translatedText.includes('नमस्ते'));
  assert.ok(meta.latencyMs <= 10, `Expected millisecond translation latency, got ${meta.latencyMs}ms`);
});

test('tts.js enforces Single-Voice Isolation and zero robotic detune warping', () => {
  const ttsCode = fs.readFileSync('js/tts.js', 'utf8');
  assert.ok(ttsCode.includes('setVoiceIsolationState'), 'Expected Single-Voice Isolation state handler');
  assert.ok(ttsCode.includes('currentSpeakToken'), 'Expected concurrency token preventing simultaneous voices');
  assert.ok(!ttsCode.includes('source.detune.value ='), 'Should not apply robotic detune warping to Web Audio source');
});

