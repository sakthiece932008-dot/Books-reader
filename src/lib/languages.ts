export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  speechLocale: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechLocale: 'ta-IN', flag: '🇮🇳' },
  { code: 'en', name: 'English', nativeName: 'English', speechLocale: 'en-US', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechLocale: 'hi-IN', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', speechLocale: 'te-IN', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', speechLocale: 'ml-IN', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechLocale: 'kn-IN', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechLocale: 'bn-IN', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechLocale: 'mr-IN', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', speechLocale: 'gu-IN', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', speechLocale: 'pa-IN', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', speechLocale: 'es-ES', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', speechLocale: 'fr-FR', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', speechLocale: 'de-DE', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', speechLocale: 'ja-JP', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', speechLocale: 'zh-CN', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', speechLocale: 'ar-SA', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', speechLocale: 'ru-RU', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', speechLocale: 'pt-BR', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', speechLocale: 'it-IT', flag: '🇮🇹' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', speechLocale: 'ko-KR', flag: '🇰🇷' },
];

export const GEMINI_AI_VOICES = [
  { id: 'Kore', name: 'Kore (Warm & Natural)', gender: 'Female', description: 'Warm, balanced reading tone, great for novels & poetry' },
  { id: 'Puck', name: 'Puck (Engaging & Clear)', gender: 'Male', description: 'Clear articulation, upbeat and storytelling style' },
  { id: 'Charon', name: 'Charon (Deep & Calming)', gender: 'Male', description: 'Deep baritone, soothing pace for classical literature' },
  { id: 'Fenrir', name: 'Fenrir (Authoritative)', gender: 'Male', description: 'Resonant and expressive academic or narration voice' },
  { id: 'Aoede', name: 'Aoede (Melodic & Gentle)', gender: 'Female', description: 'Soft, lyrical voice perfect for verse and contemplation' },
  { id: 'Zephyr', name: 'Zephyr (Modern & Crisp)', gender: 'Female', description: 'Crisp, contemporary pronunciation with high intelligibility' },
];

export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  if (!lang) return code.toUpperCase();
  if (lang.name.toLowerCase() === lang.nativeName.toLowerCase()) {
    return lang.name;
  }
  return `${lang.name} (${lang.nativeName})`;
}

/**
 * Automatically inspects unicode characters in text to identify language script
 */
export function detectScriptLanguage(text: string, fallback = 'en'): string {
  if (!text || text.trim().length === 0) return fallback;
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi / Sanskrit
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
  if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi
  if (/[\u0600-\u06FF]/.test(text)) return 'ar'; // Arabic
  if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(text)) return 'ja'; // Japanese
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'; // Chinese
  if (/[\u0400-\u04FF]/.test(text)) return 'ru'; // Russian
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'; // Korean
  return 'en';
}

export function getLanguageLocale(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang?.speechLocale || 'en-US';
}

/**
 * Normalizes text to valid UTF-8 NFC canonical composition and strips non-pronounceable markers,
 * URLs, page numbers, and watermark artifacts.
 */
export function normalizeTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Normalize Unicode to canonical composition (NFC)
    .normalize('NFC')
    // Remove broken PDF dotted circles and stray replacement marks
    .replace(/[\u25CC\u25CB\u25CD\uFFFD]/g, '')
    // Remove embedded translation/transliteration tags if present
    .replace(/\[Transliteration:.*?\]/gis, '')
    .replace(/\[Translation:.*?\]/gis, '')
    // Strip URLs & web domains
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.[a-z0-9\-_.]+\.[a-z]{2,}(?:\/\S*)?/gi, '')
    .replace(/\b[a-z0-9\-_.]+\.(?:com|org|net|in|co|io|me|xyz|info|edu|gov|app|club|site|online)(?:\/\S*)?/gi, '')
    .replace(/FreeTamilEbooks(?:\.com)?/gi, '')
    .replace(/Kaniyam(?:\.com)?/gi, '')
    // Remove trailing/isolated numbers (like page numbers)
    .replace(/\b(?:page\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?\b/gi, '')
    // Remove zero-width characters (ZWNJ \u200C, ZWJ \u200D, soft hyphens, BOM)
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // Replace non-breaking spaces and exotic whitespace with standard space
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Replace typographic smart quotes and dashes with basic equivalents
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // Trim and normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits raw page text into clean paragraphs, extracting any pre-existing transliteration/translation lines,
 * and filtering out common document noise like URLs, page numbers, repeated headers, and download watermarks.
 */
export function parseRawParagraphs(rawPageText: string, options?: { ignoreNoise?: boolean }): {
  cleanParagraphs: string[];
  embeddedTransliterations: Record<number, string>;
  embeddedTranslations: Record<number, string>;
} {
  if (!rawPageText) {
    return { cleanParagraphs: [], embeddedTransliterations: {}, embeddedTranslations: {} };
  }

  const ignoreNoise = options?.ignoreNoise !== false; // enabled by default

  // Pre-clean broken PDF glyphs like dotted circles
  let sanitizedRaw = rawPageText
    .replace(/[\u25CC\u25CB\u25CD\uFFFD\u200B\u200C\u200D\uFEFF]/g, '');

  if (ignoreNoise) {
    // Strip URLs, domain names, and watermarks anywhere in the text
    sanitizedRaw = sanitizedRaw
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/www\.[a-z0-9\-_.]+\.[a-z]{2,}(?:\/\S*)?/gi, '')
      .replace(/\b[a-z0-9\-_.]+\.(?:com|org|net|in|co|io|me|xyz|info|edu|gov|app|club|site|online)(?:\/\S*)?/gi, '')
      .replace(/FreeTamilEbooks(?:\.com)?/gi, '')
      .replace(/Kaniyam(?:\.com)?/gi, '')
      .replace(/t\.me\/\S+/gi, '')
      .replace(/t\.co\/\S+/gi, '');
  }

  // Split on double newlines or single newlines if structured
  const blocks = sanitizedRaw.split(/\n\s*\n/).filter(b => b.trim().length > 0);
  const cleanParagraphs: string[] = [];
  const embeddedTransliterations: Record<number, string> = {};
  const embeddedTranslations: Record<number, string> = {};

  blocks.forEach((block) => {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const textLines: string[] = [];
    let foundTranslit = '';
    let foundTrans = '';

    lines.forEach(line => {
      if (/^\[Transliteration:/i.test(line)) {
        foundTranslit = line.replace(/^\[Transliteration:\s*/i, '').replace(/\]$/, '').trim();
      } else if (/^\[Translation:/i.test(line)) {
        foundTrans = line.replace(/^\[Translation:\s*/i, '').replace(/\]$/, '').trim();
      } else {
        let l = line.trim();
        if (ignoreNoise) {
          // 1. Skip URLs, web links, domain names
          if (/(?:https?:\/\/|www\.|t\.me\/|t\.co\/|\.com|\.org|\.in|\.net|\.io|\.co)/i.test(l) ||
              /\b[a-zA-Z0-9-]+\.(?:com|org|net|in|io|co|xyz|me|info)\b/i.test(l)) {
            l = l
              .replace(/https?:\/\/\S+/gi, '')
              .replace(/www\.[a-z0-9\-_.]+\.[a-z]{2,}(?:\/\S*)?/gi, '')
              .replace(/\b[a-z0-9\-_.]+\.(?:com|org|net|in|co|io|me|xyz|info|edu|gov|app|club|site|online)(?:\/\S*)?/gi, '')
              .replace(/FreeTamilEbooks(?:\.com)?/gi, '')
              .replace(/Kaniyam(?:\.com)?/gi, '')
              .trim();
          }
          // 2. Skip standalone page numbers and header counter marks
          if (/^(?:page\s*\d+(?:\s*(?:of|\/)\s*\d+)?|\-?\s*\d+\s*\-?|\[\d+\]|\d+\s*\/\s*\d+|\d+)$/i.test(l)) {
            return;
          }
          // 3. Skip watermarks and scan disclaimers
          if (/^(?:downloaded from|uploaded by|scanned by|pdf converted by|free ebook|all rights reserved|published by|visit our website|kaniyam|freetamilebooks)/i.test(l)) {
            return;
          }
        }
        if (l.length > 0) {
          textLines.push(l);
        }
      }
    });

    if (textLines.length > 0) {
      let cleanPara = textLines.join('\n').trim();
      
      if (ignoreNoise) {
        // Strip trailing/leading standalone numbers (page numbers attached to paragraph ends)
        cleanPara = cleanPara.replace(/(?:[\s\n]+|^)(?:page\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?(?=[\s\n]+|$)/gi, ' ').trim();
        cleanPara = cleanPara.replace(/\s+/g, ' ').trim();
      }

      if (cleanPara.length > 0) {
        // If noise filtering is on, skip standalone short chapter header lines (e.g. "Chapter 1" alone in a block)
        if (ignoreNoise && /^(?:chapter\s+\d+|ch\.\s*\d+|part\s+\d+|அத்தியாயம்\s+\d+|பாகம்\s+\d+|இயல்\s+\d+)$/i.test(cleanPara)) {
          return;
        }

        const idx = cleanParagraphs.length;
        cleanParagraphs.push(cleanPara);
        if (foundTranslit) embeddedTransliterations[idx] = foundTranslit;
        if (foundTrans) embeddedTranslations[idx] = foundTrans;
      }
    }
  });

  // Fallback if filtering stripped everything
  if (cleanParagraphs.length === 0 && rawPageText.trim().length > 0) {
    const simple = rawPageText.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    return { cleanParagraphs: simple.length > 0 ? simple : [rawPageText.trim()], embeddedTransliterations: {}, embeddedTranslations: {} };
  }

  return { cleanParagraphs, embeddedTransliterations, embeddedTranslations };
}

/**
 * Converts PCM 16-bit raw audio buffer to a standard playable WAV Blob
 */
export function pcmToWavBlob(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Blob {
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // ByteRate
  view.setUint16(32, numChannels * (bitsPerSample / 8), true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data bytes
  new Uint8Array(buffer, 44).set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}
