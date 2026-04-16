/**
 * Mutashabihat (Similar Phrases) service — lazy-loads phrase data on first use.
 *
 * Data source: static JSON files served from public/data/.
 * Fetched once on first access and cached in memory forever (data never changes).
 */

import type { PhrasesData, PhraseVersesData, ResolvedPhrase } from '../features/verseDetail/types'

let phrasesData: PhrasesData | null = null
let phraseVersesData: PhraseVersesData | null = null
let loadPromise: Promise<void> | null = null

/**
 * Lazily fetch both JSON files from public/data/. Only fetches once;
 * subsequent calls return immediately.
 */
async function ensureLoaded(): Promise<void> {
  if (phrasesData && phraseVersesData) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const [phrasesRes, phraseVersesRes] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/phrases.json`),
      fetch(`${import.meta.env.BASE_URL}data/phrase_verses.json`),
    ])

    if (!phrasesRes.ok || !phraseVersesRes.ok) {
      loadPromise = null
      throw new Error('Failed to load mutashabihat data')
    }

    phrasesData = await phrasesRes.json() as PhrasesData
    phraseVersesData = await phraseVersesRes.json() as PhraseVersesData
  })()

  return loadPromise
}

/**
 * Look up all shared phrases for a given verse key (e.g. "4:69").
 * Returns an empty array if the verse has no shared phrases.
 */
export async function getPhrasesForVerse(verseKey: string): Promise<ResolvedPhrase[]> {
  await ensureLoaded()

  const phraseIds = phraseVersesData![verseKey]
  if (!phraseIds || phraseIds.length === 0) return []

  const results: ResolvedPhrase[] = []

  for (const id of phraseIds) {
    const entry = phrasesData![String(id)]
    if (!entry) continue

    const wordRanges = entry.ayah[verseKey]
    if (!wordRanges || wordRanges.length === 0) continue

    results.push({
      phraseId: String(id),
      surahs: entry.surahs,
      ayahs: entry.ayahs,
      count: entry.count,
      wordRanges,
      allVerses: entry.ayah,
    })
  }

  return results
}
