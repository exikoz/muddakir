/**
 * Verse fetching via the Content API proxy (no SDK — avoids CORS on token exchange).
 * Search engine finds verse_keys; this module fetches the full verse data.
 * 
 * Caching Policy:
 * - Verses: 7 days (per Quran Foundation API policy)
 * - Chapter verses: 7 days
 * - Cache entries include timestamp for expiry validation
 */
import { contentFetch } from '../lib/auth'
import type { Verse } from '../types/quran'

const TRANSLATION_ID = 131 // Sahih International
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const verseCache = new Map<string, CacheEntry<Verse>>()
const chapterCache = new Map<string, CacheEntry<{ verses: Verse[]; hasMore: boolean }>>()

/**
 * Check if a cache entry is still valid (within 7 days)
 */
function isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  if (!entry) return false
  return Date.now() - entry.timestamp < CACHE_DURATION_MS
}

/**
 * Clear expired cache entries (run periodically)
 */
function clearExpiredCache() {
  const now = Date.now()
  
  for (const [key, entry] of verseCache.entries()) {
    if (now - entry.timestamp >= CACHE_DURATION_MS) {
      verseCache.delete(key)
    }
  }
  
  for (const [key, entry] of chapterCache.entries()) {
    if (now - entry.timestamp >= CACHE_DURATION_MS) {
      chapterCache.delete(key)
    }
  }
}

// Clear expired cache every hour
setInterval(clearExpiredCache, 60 * 60 * 1000)

export async function fetchVerse(verseKey: string): Promise<Verse | null> {
  const cached = verseCache.get(verseKey)
  if (isCacheValid(cached)) return cached.data

  try {
    const path = `/v4/verses/by_key/${verseKey}?words=true` +
      `&word_fields=text_imlaei,root_name,lemma_name` +
      `&fields=text_imlaei&translation_fields=text` +
      `&translations=${TRANSLATION_ID}` +
      `&word_translation=true&word_transliteration=true`

    const res = await contentFetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const v = json.verse
    if (!v) return null

    const words = (v.words ?? []).map((w: Record<string, unknown>) => ({
      id:              (w.id ?? w.position) as number,
      position:        w.position as number,
      text:            (w.text_imlaei ?? '') as string,
      text_simple:     (w.text_imlaei ?? '') as string,
      char_type_name:  (w.char_type_name ?? 'word') as string,
      transliteration: (w.transliteration as Record<string, string> | undefined)?.text,
      translation:     (w.translation as Record<string, string> | undefined)?.text,
      root:            w.root_name as string | undefined,
      lemma:           w.lemma_name as string | undefined,
    }))

    const arabicText = v.text_imlaei
      ?? words.filter((w: { char_type_name: string }) => w.char_type_name !== 'end').map((w: { text: string }) => w.text).join(' ')

    const translation = v.translations?.[0]?.text ?? ''

    const data: Verse = { verse_key: verseKey, text_arabic: arabicText, translation, words }
    verseCache.set(verseKey, { data, timestamp: Date.now() })
    return data
  } catch (err) {
    console.error('[quranApi] fetchVerse error:', err)
    return null
  }
}

/**
 * Fetch a page of verses from a chapter (for Mushaf panel)
 * Uses pagination to avoid loading entire chapters at once
 * 
 * Best Practices:
 * - Caches pages for 7 days (per API policy)
 * - Cache key includes chapter, page, and perPage for granular caching
 * - Prefetch adjacent pages for smooth navigation (handled by caller)
 */
export async function fetchChapterVerses(
  chapterNumber: number,
  page: number = 1,
  perPage: number = 50
): Promise<{ verses: Verse[]; hasMore: boolean }> {
  const cacheKey = `${chapterNumber}:${page}:${perPage}`
  const cached = chapterCache.get(cacheKey)
  if (isCacheValid(cached)) return cached.data

  try {
    const path = `/v4/verses/by_chapter/${chapterNumber}?words=true` +
      `&word_fields=text_imlaei,root_name,lemma_name` +
      `&fields=text_imlaei&translation_fields=text` +
      `&translations=${TRANSLATION_ID}` +
      `&word_translation=true&word_transliteration=true` +
      `&per_page=${perPage}&page=${page}`

    const res = await contentFetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const verses: Verse[] = (json.verses ?? []).map((v: Record<string, unknown>) => {
      const words = (v.words as Array<Record<string, unknown>> ?? []).map((w: Record<string, unknown>) => ({
        id:              (w.id ?? w.position) as number,
        position:        w.position as number,
        text:            (w.text_imlaei ?? '') as string,
        text_simple:     (w.text_imlaei ?? '') as string,
        char_type_name:  (w.char_type_name ?? 'word') as string,
        transliteration: (w.transliteration as Record<string, string> | undefined)?.text,
        translation:     (w.translation as Record<string, string> | undefined)?.text,
        root:            w.root_name as string | undefined,
        lemma:           w.lemma_name as string | undefined,
      }))

      const arabicText = v.text_imlaei
        ?? words.filter((w: { char_type_name: string }) => w.char_type_name !== 'end').map((w: { text: string }) => w.text).join(' ')

      const translation = (v.translations as Array<{ text?: string }> | undefined)?.[0]?.text ?? ''

      return { verse_key: v.verse_key, text_arabic: arabicText, translation, words }
    })

    const pagination = json.pagination ?? {}
    const hasMore = pagination.next_page != null

    const result = { verses, hasMore }
    chapterCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch (err) {
    console.error('[quranApi] fetchChapterVerses error:', err)
    return { verses: [], hasMore: false }
  }
}
