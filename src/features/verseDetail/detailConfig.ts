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
