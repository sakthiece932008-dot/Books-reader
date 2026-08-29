import { TamilPhoneticNLP, TAMIL_DIALECT_PROFILES, DialectAcousticProfile, isTamilScript } from './tamilNLP';

export type TamilAccent = 'standard' | 'chennai' | 'madurai' | 'kongu' | 'jaffna' | 'singapore';

export type TamilAccentInfo = DialectAcousticProfile;

export const TAMIL_ACCENTS: TamilAccentInfo[] = TAMIL_DIALECT_PROFILES;

/**
 * Detects whether the given text is primarily Tamil script.
 */
export function isTamilText(text: string): boolean {
  return isTamilScript(text);
}

/**
 * Natural Flow & Phonetic NLP Engine:
 * Analyzes Tamil prosody (syllable weight, agglutinative length, clausal pauses, sandhi)
 * and formats text with natural breath groupings and micro-pauses for conversational cadence.
 */
export function applyTamilProsodyAndNaturalFlow(
  text: string,
  accent: TamilAccent = 'standard',
  naturalFlowEnabled: boolean = true
): {
  processedText: string;
  computedRateMultiplier: number;
  computedPitchOffset: number;
  pauseCount: number;
} {
  const result = TamilPhoneticNLP.processText(text, accent, {
    naturalFlow: naturalFlowEnabled,
    prosodyPauses: naturalFlowEnabled
  });

  return {
    processedText: result.phoneticText,
    computedRateMultiplier: result.targetRateMultiplier,
    computedPitchOffset: result.targetPitchOffset,
    pauseCount: result.pauseCount
  };
}

