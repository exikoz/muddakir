/**
 * Verse fetching via the Content API proxy (no SDK — avoids CORS on token exchange).
 * Search engine finds verse_keys; this module fetches the full verse data.
 */
import { contentFetch } from '../lib/auth'
import type { Verse } from '../types/quran'

const TRANSLATION_ID = 131 // Sahih International
const cache = new Map<string, Verse>()

export async function fetchVerse(verseKey: string): Promise<Verse | null> {
  if (cache.has(verseKey)) return cache.get(verseKey)!

  try {
    const path = `/api/v4/verses/by_key/${verseKey}?words=true` +
      `&word_fields=text_imlaei,text_imlaei_simple,root_name,lemma_name` +
      `&fields=text_imlaei&translation_fields=text` +
      `&translations=${TRANSLATION_ID}` +
      `&word_translation=true&word_transliteration=true`

    const res = await contentFetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const v = json.verse
    if (!v) return null

    const words = (v.words ?? []).map((w: any) => ({
      id:              w.id ?? w.position,
      position:        w.position,
      text:            w.text_imlaei ?? w.text_imlaei_simple ?? '',
      text_simple:     w.text_imlaei_simple ?? w.text_imlaei ?? '',
      char_type_name:  w.char_type_name ?? 'word',
      transliteration: w.transliteration?.text,
      translation:     w.translation?.text,
      root:            w.root_name,
      lemma:           w.lemma_name,
    }))

    const arabicText = v.text_imlaei
      ?? words.filter((w: any) => w.char_type_name !== 'end').map((w: any) => w.text).join(' ')

    const translation = v.translations?.[0]?.text ?? ''

    const data: Verse = { verse_key: verseKey, text_arabic: arabicText, translation, words }
    cache.set(verseKey, data)
    return data
  } catch (err) {
    console.error('[quranApi] fetchVerse error:', err)
    return null
  }
}
