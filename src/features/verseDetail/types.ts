/**
 * Types specific to the Verse Detail feature.
 */

export interface TranslationData {
  resourceId: number
  resourceName: string
  text: string
}

export interface TafsirData {
  resourceName: string
  text: string
}

export interface ReflectionPost {
  id: number
  body: string
  postTypeId: number
  authorName: string
  likeCount: number
}

/** A tafsir or translation resource from the /resources API */
export interface ResourceItem {
  id: number
  name: string
  language: string
}

// ── Mutashabihat (Similar Phrases) Types ────────────────────────────────────

/** Word range within a verse: [fromPosition, toPosition] (1-indexed, inclusive) */
export type WordRange = [number, number]

/** Phrase source info — the "canonical" verse where the phrase originates */
export interface PhraseSource {
  key: string
  from: number
  to: number
}

/** A single phrase entry from phrases.json */
export interface PhraseEntry {
  surahs: number
  ayahs: number
  count: number
  source: PhraseSource
  ayah: Record<string, WordRange[]>
}

/** The full phrases.json structure: phraseId → PhraseEntry */
export type PhrasesData = Record<string, PhraseEntry>

/** The full phrase_verses.json structure: verseKey → phraseId[] */
export type PhraseVersesData = Record<string, number[]>

/** Resolved phrase for display in the UI */
export interface ResolvedPhrase {
  phraseId: string
  surahs: number
  ayahs: number
  count: number
  /** Word ranges for the current verse */
  wordRanges: WordRange[]
  /** All verses sharing this phrase: verseKey → WordRange[] */
  allVerses: Record<string, WordRange[]>
}
