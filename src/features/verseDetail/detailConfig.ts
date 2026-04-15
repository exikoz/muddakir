/**
 * Verse Detail panel configuration — translation IDs, tafsir IDs, and API resource constants.
 * Change resource IDs here, not inline in components.
 */

export interface TranslationConfig {
  id: number
  name: string
}

export interface TafsirConfig {
  id: number
  name: string
  language: string
}

/** Translations to display in the detail panel */
export const TRANSLATIONS: readonly TranslationConfig[] = [
  { id: 20,  name: 'Abdel Haleem' },
  { id: 131, name: 'Sahih International' },
] as const

/** Tafsir to display in the detail panel */
export const TAFSIR: TafsirConfig = {
  id: 169,
  name: 'Ibn Kathir',
  language: 'English',
}

/** Max characters for tafsir preview before "Read full tafsir" toggle */
export const TAFSIR_PREVIEW_LENGTH = 200

/** Max characters for reflection body before "Read more" */
export const REFLECTION_PREVIEW_LENGTH = 150

/** Translation IDs as comma-separated string for API calls */
export const TRANSLATION_IDS = TRANSLATIONS.map(t => t.id).join(',')

// ── AI Prompt Templates ─────────────────────────────────────────────────────

const langDirective = (lang: string) =>
  lang === 'en'
    ? 'Respond in English.'
    : `Respond entirely in the language with code "${lang}". All commentary and explanations must be in that language.`

export const VERSE_EXPLANATION_PROMPT = (verseKey: string, arabicText: string, translation: string, language = 'en') =>
  `Explain verse ${verseKey} briefly.
Arabic: ${arabicText}
Translation: ${translation}

${langDirective(language)}

Write exactly 2 short sentences: one on what the verse is about, one on its key lesson. Separate them with a blank line.

Plain text only. No markdown, no bullets, no headers, no asterisks.`

export const WORD_EXPLANATION_PROMPT = (
  wordText: string,
  transliteration: string,
  wordTranslation: string,
  verseKey: string,
  arabicText: string,
  translation: string,
  language = 'en',
) =>
  `Explain the word "${wordText}" (${transliteration}, "${wordTranslation}") in verse ${verseKey}.
Verse: ${arabicText}
Translation: ${translation}

${langDirective(language)}

Write exactly 3 short lines separated by blank lines:
Line 1: Root letters and core meaning.
Line 2: Grammatical form (verb/noun, tense, person, number).
Line 3: How it functions in this verse (1 sentence).

Plain text only. No markdown, no bullets, no headers, no asterisks.`
