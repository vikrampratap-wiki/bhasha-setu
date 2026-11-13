import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

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

test('Indic cross-script transliteration converts unknown regional script words into Devanagari', () => {
  const translator = new BhashaTranslator();
  translator.forceOffline = true;
  // Bengali script word "भारत" (ভারত) -> Devanagari
  const devanagari = translator.transliterateIndicToDevanagari('ভারত');
  assert.equal(devanagari, 'भारत');
});
