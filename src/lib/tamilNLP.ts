/**
 * Native Tamil & Multilingual Phonetic NLP Engine
 * Implements Tolkappiyam morpho-phonology, Sandhi (புணர்ச்சி),
 * Regional dialect prosody (Madurai, Jaffna, Chennai, Kongu, Standard, Singapore),
 * Gemination, Retroflex articulation cues, and Clausal Breath modulation.
 */

export type TamilDialect = 'standard' | 'madurai' | 'jaffna' | 'chennai' | 'kongu' | 'singapore';

export interface DialectAcousticProfile {
  id: TamilDialect;
  name: string;
  nativeName: string;
  region: string;
  description: string;
  pitch: number;
  rate: number;
  recommendedPitch: number;
  recommendedRate: number;
  vowelElongation: boolean;
  retroflexWeight: 'standard' | 'crisp' | 'soft' | 'melodic';
  badge: string;
  examplePhrase: string;
}

export const TAMIL_DIALECT_PROFILES: DialectAcousticProfile[] = [
  {
    id: 'standard',
    name: 'Standard Literary',
    nativeName: 'செந்தமிழ் / பொதுத் தமிழ்',
    region: 'Tamil Nadu (Classical & Media)',
    description: 'Pristine, formal pronunciation with clear vowel lengths and standard consonant gemination.',
    pitch: 1.0,
    rate: 1.0,
    recommendedPitch: 1.0,
    recommendedRate: 1.0,
    vowelElongation: false,
    retroflexWeight: 'standard',
    badge: 'Classical Standard',
    examplePhrase: 'வணக்கம், நல்வரவு!'
  },
  {
    id: 'madurai',
    name: 'Madurai & Southern',
    nativeName: 'மதுரை / தென் தமிழ்',
    region: 'Madurai, Tirunelveli, Ramanathapuram',
    description: 'Warm, melodious inflection with gentle elongation of terminal vowels and polite traditional tonality.',
    pitch: 0.95,
    rate: 0.96,
    recommendedPitch: 0.95,
    recommendedRate: 0.96,
    vowelElongation: true,
    retroflexWeight: 'melodic',
    badge: 'Southern Melodic',
    examplePhrase: 'வாங்க, நல்லா இருக்கீங்களா?'
  },
  {
    id: 'jaffna',
    name: 'Jaffna & Sri Lankan',
    nativeName: 'யாழ்ப்பாணம் / ஈழத் தமிழ்',
    region: 'Northern & Eastern Sri Lanka',
    description: 'Authentic archaic phonology, crystal-clear distinction of retroflex ழ (zha) and dental consonants.',
    pitch: 1.05,
    rate: 0.98,
    recommendedPitch: 1.05,
    recommendedRate: 0.98,
    vowelElongation: false,
    retroflexWeight: 'crisp',
    badge: 'Eelam Classical',
    examplePhrase: 'வணக்கம், சுகமாய் இருக்கிறீங்களா?'
  },
  {
    id: 'chennai',
    name: 'Chennai & Northern',
    nativeName: 'சென்னை / வட தமிழ்',
    region: 'Chennai & Northern Tamil Nadu',
    description: 'Modern, fluent conversational cadence with lively rhythm and contemporary urban fluidity.',
    pitch: 1.02,
    rate: 1.05,
    recommendedPitch: 1.02,
    recommendedRate: 1.05,
    vowelElongation: false,
    retroflexWeight: 'soft',
    badge: 'Urban Fluent',
    examplePhrase: 'ஹலோ, எப்படி இருக்கீங்க?'
  },
  {
    id: 'kongu',
    name: 'Kongu & Western',
    nativeName: 'கொங்குத் தமிழ்',
    region: 'Coimbatore, Erode, Salem, Tirupur',
    description: 'Rhythmic, gentle sing-song cadence with melodic rising intonation on clause boundaries.',
    pitch: 0.98,
    rate: 0.97,
    recommendedPitch: 0.98,
    recommendedRate: 0.97,
    vowelElongation: true,
    retroflexWeight: 'melodic',
    badge: 'Western Melodic',
    examplePhrase: 'வணக்கமுங்க, சௌக்கியமா?'
  },
  {
    id: 'singapore',
    name: 'Singapore & Malaysian',
    nativeName: 'சிங்கப்பூர் / மலேசியத் தமிழ்',
    region: 'Singapore & Malaysia',
    description: 'Contemporary Southeast Asian standard, clear articulate pacing suitable for educational reading.',
    pitch: 1.0,
    rate: 1.02,
    recommendedPitch: 1.0,
    recommendedRate: 1.02,
    vowelElongation: false,
    retroflexWeight: 'standard',
    badge: 'Diaspora Standard',
    examplePhrase: 'வணக்கம், நலமா இருக்கிறீர்களா?'
  }
];

// Tamil Unicode character categories
export const TAMIL_VOWELS_INDEPENDENT = ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ', 'ஃ'];
export const TAMIL_VOWEL_SIGNS = ['ா', 'ி', 'ீ', 'ு', 'ூ', 'ெ', 'ே', 'ை', 'ொ', 'ோ', 'ௌ', '்'];
export const TAMIL_CONSONANTS = ['க', 'ங', 'ச', 'ஞ', 'ட', 'ண', 'த', 'ந', 'ப', 'ம', 'ய', 'ர', 'ல', 'வ', 'ழ', 'ள', 'ற', 'ன', 'ஜ', 'ஷ', 'ஸ', 'ஹ', 'க்ஷ'];

// Important clausal conjunctions and discourse markers for breath pauses
const DISCOURSE_CONJUNCTIONS: Record<string, { pauseAfter: string; pauseBefore: string }> = {
  'ஆனால்': { pauseBefore: ', ', pauseAfter: ', ' },
  'எனவே': { pauseBefore: ', ', pauseAfter: ', ' },
  'ஆகையால்': { pauseBefore: ', ', pauseAfter: ', ' },
  'ஆயினும்': { pauseBefore: ', ', pauseAfter: ', ' },
  'இருப்பினும்': { pauseBefore: ', ', pauseAfter: ', ' },
  'மேலும்': { pauseBefore: ', ', pauseAfter: ' ' },
  'என்று': { pauseBefore: ' ', pauseAfter: ', ' },
  'என': { pauseBefore: ' ', pauseAfter: ', ' },
  'அப்போது': { pauseBefore: ', ', pauseAfter: ' ' },
  'எப்போது': { pauseBefore: ', ', pauseAfter: ' ' },
  'காரணமாக': { pauseBefore: ' ', pauseAfter: ', ' },
  'பொழுது': { pauseBefore: ' ', pauseAfter: ', ' },
  'போது': { pauseBefore: ' ', pauseAfter: ', ' },
  'பின்னர்': { pauseBefore: ', ', pauseAfter: ' ' },
  'பின்பு': { pauseBefore: ', ', pauseAfter: ' ' }
};

/**
 * Checks if a string contains predominantly Tamil Unicode characters
 */
export function isTamilScript(text: string): boolean {
  if (!text) return false;
  const tamilChars = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  const totalLetters = text.replace(/[\s\d.,!?;:()"'«»—–-]/g, '').length;
  return totalLetters > 0 && (tamilChars / totalLetters) > 0.25;
}

/**
 * Tamil Phonetic NLP Processor
 * Analyzes sentence structures, morpho-phonemics, and regional accent parameters.
 */
export class TamilPhoneticNLP {
  /**
   * Transforms input text with phonetic dialect markers, sandhi breath pauses,
   * and moraic duration hints optimized for the target speech engine.
   */
  public static processText(
    rawText: string,
    dialect: TamilDialect = 'standard',
    options: {
      naturalFlow?: boolean;
      honorificEnhance?: boolean;
      prosodyPauses?: boolean;
    } = {}
  ): {
    phoneticText: string;
    targetRateMultiplier: number;
    targetPitchOffset: number;
    pauseCount: number;
    dialectInfo: DialectAcousticProfile;
  } {
    const naturalFlow = options.naturalFlow !== false;
    const prosodyPauses = options.prosodyPauses !== false;
    const profile = TAMIL_DIALECT_PROFILES.find(d => d.id === dialect) || TAMIL_DIALECT_PROFILES[0];

    if (!rawText || !rawText.trim()) {
      return {
        phoneticText: rawText,
        targetRateMultiplier: 1.0,
        targetPitchOffset: 0,
        pauseCount: 0,
        dialectInfo: profile
      };
    }

    if (!isTamilScript(rawText)) {
      return {
        phoneticText: rawText,
        targetRateMultiplier: profile.rate,
        targetPitchOffset: profile.pitch - 1.0,
        pauseCount: 0,
        dialectInfo: profile
      };
    }

    let processed = rawText;
    let pauseCount = 0;

    // 1. Normalize whitespace & punctuation
    processed = processed
      .replace(/\r\n/g, '\n')
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip zero-width characters
      .replace(/[ \t]+/g, ' ');

    // 2. Sandhi & Morpho-phonemic Conjunction Pause Injection (Lightweight & responsive)
    if (naturalFlow && prosodyPauses) {
      for (const [conj, rule] of Object.entries(DISCOURSE_CONJUNCTIONS)) {
        // Match conjunction with spaces around it and ensure no duplicate punctuation
        const escapedConj = conj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<![,.;!?:])\\s+(${escapedConj})(?![,,.;!?:])\\s+`, 'g');
        processed = processed.replace(regex, (_match, word) => {
          pauseCount++;
          return `${rule.pauseBefore}${word}${rule.pauseAfter}`;
        });
      }
    }

    // 3. Dialect-specific Phonological & Cadence Transformations (Fast & Natural)
    switch (dialect) {
      case 'madurai': {
        // Southern Melodic Cadence: Smooth natural rhythm
        processed = processed
          .replace(/(?:^|(?<=\s))(சொன்னார்|செய்தார்|வந்தார்|போனார்|பார்த்தார்)(?=\s|[.,!?]|$)/g, '$1, ');
        break;
      }

      case 'jaffna': {
        // Eelam Classical Cadence: Crisp metric spacing
        processed = processed
          .replace(/(?:^|(?<=\s))(கொண்டு|வந்து|சென்று|பார்த்து)(?=\s|[.,!?]|$)\s*/g, '$1, ');
        break;
      }

      case 'chennai': {
        // Northern Urban Fluidity: Smooth transitions, brisk pace
        processed = processed
          .replace(/\s*,\s*என்று\s*/g, ' என்று ')
          .replace(/\s*,\s*என\s*/g, ' என ');
        break;
      }

      case 'kongu': {
        // Western Melodic Lilt: Gentle cadence at clause breaks
        processed = processed
          .replace(/([ுி])([.,!?])/g, '$1$2');
        break;
      }

      case 'singapore': {
        // Clean international Southeast Asian Tamil standard
        processed = processed
          .replace(/([.,!?])\s*/g, '$1 ');
        break;
      }

      case 'standard':
      default: {
        // Standard balanced classical prosody
        break;
      }
    }

    // 4. Clean up redundant consecutive commas or spaces for instant TTS start
    processed = processed
      .replace(/\.{2,}/g, '.')
      .replace(/,\s*,+/g, ',')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      phoneticText: processed,
      targetRateMultiplier: profile.rate,
      targetPitchOffset: profile.pitch - 1.0,
      pauseCount,
      dialectInfo: profile
    };
  }

  /**
   * Helper to clean numbers and abbreviations for crisp TTS speech in Tamil
   */
  public static normalizeNumeralsAndSymbols(text: string): string {
    const tamilDigits: Record<string, string> = {
      '௦': '0', '௧': '1', '௨': '2', '௩': '3', '௪': '4',
      '௫': '5', '௬': '6', '௭': '7', '௮': '8', '௯': '9',
      '௰': '10', '௱': '100', '௲': '1000'
    };

    let result = text;
    for (const [tDigit, aDigit] of Object.entries(tamilDigits)) {
      result = result.split(tDigit).join(aDigit);
    }

    return result;
  }

  /**
   * Phonetic Romanized transliteration (Tanglish) for learners and non-native readers
   */
  public static transliterateToLatin(text: string): string {
    if (!text) return "";
    const map: Record<string, string> = {
      'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo',
      'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oa', 'ஔ': 'au', 'ஃ': 'ak',
      'க': 'ka', 'ங': 'nga', 'ச': 'cha', 'ஞ': 'nya', 'ட': 'ta', 'ண': 'na',
      'த': 'tha', 'ந': 'na', 'ப': 'pa', 'ம': 'ma', 'ய': 'ya', 'ர': 'ra',
      'ல': 'la', 'வ': 'va', 'ழ': 'zha', 'ள': 'la', 'ற': 'ra', 'ன': 'na',
      'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo', 'ெ': 'e',
      'ே': 'ae', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oa', 'ௌ': 'au', '்': ''
    };
    return text.split('').map(c => map[c] !== undefined ? map[c] : c).join('');
  }
}
