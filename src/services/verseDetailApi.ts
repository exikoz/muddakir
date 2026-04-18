/**
 * API functions for the Verse Detail panel.
 * All calls go through the existing contentFetch (authenticated + proxied)
 * and use the same cache pattern as quranApi.ts (7-day TTL).
 */

import { contentFetch } from '../lib/auth'
import type { TranslationData, TafsirData, ResourceItem, ReflectionPost } from '../features/verseDetail/types'

const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CacheEntry<T> { data: T; timestamp: number }
function isCacheValid<T>(e: CacheEntry<T> | undefined): e is CacheEntry<T> {
  return !!e && Date.now() - e.timestamp < CACHE_DURATION_MS
}

// ── Resource Lists (tafsirs, translations) ──────────────────────────────────

let tafsirListCache: CacheEntry<ResourceItem[]> | undefined
let translationListCache: CacheEntry<ResourceItem[]> | undefined

export async function fetchAvailableTafsirs(): Promise<ResourceItem[]> {
  if (isCacheValid(tafsirListCache)) return tafsirListCache.data

  try {
    const res = await fetch('https://api.quran.com/api/v4/resources/tafsirs?language=en')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const items: ResourceItem[] = (json.tafsirs ?? []).map((t: Record<string, unknown>) => ({
      id: t.id as number,
      name: (t.name ?? (t.translated_name as Record<string, string> | undefined)?.name ?? 'Unknown') as string,
      language: (t.language_name ?? (t.translated_name as Record<string, string> | undefined)?.language_name ?? '') as string,
    }))
    tafsirListCache = { data: items, timestamp: Date.now() }
    return items
  } catch (err) {
    console.error('[verseDetailApi] fetchAvailableTafsirs error:', err)
    return []
  }
}

export async function fetchAvailableTranslations(): Promise<ResourceItem[]> {
  if (isCacheValid(translationListCache)) return translationListCache.data

  try {
    const res = await fetch('https://api.quran.com/api/v4/resources/translations?language=en')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const items: ResourceItem[] = (json.translations ?? []).map((t: Record<string, unknown>) => ({
      id: t.id as number,
      name: (t.name ?? (t.translated_name as Record<string, string> | undefined)?.name ?? 'Unknown') as string,
      language: (t.language_name ?? (t.translated_name as Record<string, string> | undefined)?.language_name ?? '') as string,
    }))
    translationListCache = { data: items, timestamp: Date.now() }
    return items
  } catch (err) {
    console.error('[verseDetailApi] fetchAvailableTranslations error:', err)
    return []
  }
}

// ── Translations ────────────────────────────────────────────────────────────

const translationCache = new Map<string, CacheEntry<TranslationData[]>>()

export async function fetchTranslations(verseKey: string, translationIds: number[]): Promise<TranslationData[]> {
  const ids = translationIds.join(',')
  const cacheKey = `${verseKey}:${ids}`
  const cached = translationCache.get(cacheKey)
  if (isCacheValid(cached)) return cached.data

  try {
    const path = `/api/v4/verses/by_key/${verseKey}` +
      `?translations=${ids}` +
      `&translation_fields=resource_name,language_name` +
      `&fields=text_imlaei`

    const res = await contentFetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const translations: TranslationData[] = (json.verse?.translations ?? []).map((t: Record<string, unknown>) => ({
      resourceId: t.resource_id as number,
      resourceName: (t.resource_name ?? 'Unknown') as string,
      text: ((t.text ?? '') as string).replace(/<[^>]*>/g, ''),
    }))

    translationCache.set(cacheKey, { data: translations, timestamp: Date.now() })
    return translations
  } catch (err) {
    console.error('[verseDetailApi] fetchTranslations error:', err)
    return []
  }
}

// ── Tafsir ──────────────────────────────────────────────────────────────────

const tafsirCache = new Map<string, CacheEntry<TafsirData | null>>()

export async function fetchTafsir(verseKey: string, tafsirId: number): Promise<TafsirData | null> {
  const cacheKey = `${tafsirId}:${verseKey}`
  const cached = tafsirCache.get(cacheKey)
  if (isCacheValid(cached)) return cached.data

  try {
    const path = `/api/v4/tafsirs/${tafsirId}/by_ayah/${verseKey}` +
      `?fields=resource_name,language_name`

    const res = await contentFetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const tafsir = json.tafsir
    if (!tafsir) return null

    const data: TafsirData = {
      resourceName: tafsir.resource_name ?? 'Tafsir',
      text: tafsir.text ?? '',
    }

    tafsirCache.set(cacheKey, { data, timestamp: Date.now() })
    return data
  } catch (err) {
    console.error('[verseDetailApi] fetchTafsir error:', err)
    return null
  }
}

// ── Audio ────────────────────────────────────────────────────────────────────

const audioCache = new Map<string, CacheEntry<string>>()

export async function fetchAudioUrl(verseKey: string, recitationId: number): Promise<string | null> {
  const cacheKey = `${recitationId}:${verseKey}`
  const cached = audioCache.get(cacheKey)
  if (isCacheValid(cached)) return cached.data

  try {
    const path = `/api/v4/recitations/${recitationId}/by_ayah/${verseKey}`
    const res = await contentFetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const audioFile = json.audio_files?.[0]
    if (!audioFile?.url) return null

    let url: string = audioFile.url
    if (url.startsWith('//')) {
      url = `https:${url}`
    } else if (!url.startsWith('http')) {
      url = `https://audio.qurancdn.com/${url}`
    }

    audioCache.set(cacheKey, { data: url, timestamp: Date.now() })
    return url
  } catch (err) {
    console.error('[verseDetailApi] fetchAudioUrl error:', err)
    return null
  }
}


// ── Reflections ─────────────────────────────────────────────────────────────

const reflectionCache = new Map<string, CacheEntry<ReflectionPost[]>>()

export async function fetchReflections(verseKey: string): Promise<ReflectionPost[]> {
  const cached = reflectionCache.get(verseKey)
  if (isCacheValid(cached)) return cached.data

  try {
    const res = await fetch(
      `https://api.quran.com/api/v4/posts/by_ayah/${verseKey}?language=en`
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const posts: ReflectionPost[] = (json.posts ?? []).map((p: Record<string, unknown>) => ({
      id: p.id as number,
      body: (p.body ?? '') as string,
      postTypeId: (p.post_type_id ?? 1) as number,
      authorName: (p.author_name ?? '') as string,
      likeCount: (p.like_count ?? 0) as number,
    }))

    reflectionCache.set(verseKey, { data: posts, timestamp: Date.now() })
    return posts
  } catch (err) {
    console.error('[verseDetailApi] fetchReflections error:', err)
    return []
  }
}


// ── Word Timestamps (for word-by-word highlighting) ─────────────────────────

export interface WordTimestamp {
  wordIndex: number       // 0-based
  timestampFrom: number   // ms (absolute within chapter audio)
  timestampTo: number     // ms (absolute within chapter audio)
}

export interface ChapterAudioData {
  audioUrl: string
  verseTimings: Map<string, {
    timestampFrom: number  // ms
    timestampTo: number    // ms
    wordTimings: WordTimestamp[]
  }>
}

/** Cache: chapterReciterId:chapter → full chapter audio data */
const chapterAudioCache = new Map<string, CacheEntry<ChapterAudioData>>()

/**
 * Fetch chapter audio data including the audio URL, verse timings, and
 * word-level segments. Cached per chapter+reciter.
 */
export async function fetchChapterAudio(
  chapterReciterId: number,
  chapter: number
): Promise<ChapterAudioData | null> {
  const cacheKey = `chaudio:${chapterReciterId}:${chapter}`
  const cached = chapterAudioCache.get(cacheKey)
  if (isCacheValid(cached)) return cached.data

  try {
    const url = `https://api.quran.com/api/v4/chapter_recitations/${chapterReciterId}/${chapter}?segments=true`
    const res = await fetch(url)
    if (!res.ok) return null

    const json = await res.json()
    const audioFile = json.audio_file
    if (!audioFile?.audio_url) return null

    const timestamps = audioFile.timestamps as Array<{
      verse_key: string
      timestamp_from: number
      timestamp_to: number
      segments: [number, number, number][]
    }> | undefined

    const verseTimings = new Map<string, {
      timestampFrom: number
      timestampTo: number
      wordTimings: WordTimestamp[]
    }>()

    if (timestamps) {
      for (const vt of timestamps) {
        const wordTimings: WordTimestamp[] = (vt.segments ?? []).map((seg, i, arr) => ({
          wordIndex: seg[0] - 1,
          timestampFrom: seg[1],
          timestampTo: i < arr.length - 1 ? arr[i + 1][1] : seg[2],
        }))

        verseTimings.set(vt.verse_key, {
          timestampFrom: vt.timestamp_from,
          timestampTo: vt.timestamp_to,
          wordTimings,
        })
      }
    }

    const data: ChapterAudioData = {
      audioUrl: audioFile.audio_url as string,
      verseTimings,
    }

    chapterAudioCache.set(cacheKey, { data, timestamp: Date.now() })
    return data
  } catch (err) {
    console.error('[verseDetailApi] fetchChapterAudio error:', err)
    return null
  }
}

/**
 * Get word timestamps for a specific verse (absolute ms within chapter audio).
 */
export async function fetchWordTimestamps(
  verseKey: string,
  chapterReciterId: number,
  _totalWords: number
): Promise<WordTimestamp[]> {
  const [chapterStr] = verseKey.split(':')
  const chapter = parseInt(chapterStr, 10)
  const data = await fetchChapterAudio(chapterReciterId, chapter)
  return data?.verseTimings.get(verseKey)?.wordTimings ?? []
}
