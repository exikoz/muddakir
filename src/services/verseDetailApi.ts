/**
 * API functions for the Verse Detail panel.
 * All calls go through the existing contentFetch (authenticated + proxied)
 * and use the same cache pattern as quranApi.ts (7-day TTL).
 */

import { contentFetch } from '../lib/auth'
import { TRANSLATION_IDS, TAFSIR } from '../features/verseDetail/detailConfig'
import type { TranslationData, TafsirData, ReflectionPost } from '../features/verseDetail/types'

const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CacheEntry<T> { data: T; timestamp: number }
function isCacheValid<T>(e: CacheEntry<T> | undefined): e is CacheEntry<T> {
  return !!e && Date.now() - e.timestamp < CACHE_DURATION_MS
}

// ── Translations ────────────────────────────────────────────────────────────

const translationCache = new Map<string, CacheEntry<TranslationData[]>>()

export async function fetchTranslations(verseKey: string): Promise<TranslationData[]> {
  const cached = translationCache.get(verseKey)
  if (isCacheValid(cached)) return cached.data

  try {
    const path = `/api/v4/verses/by_key/${verseKey}` +
      `?translations=${TRANSLATION_IDS}` +
      `&translation_fields=resource_name,language_name` +
      `&fields=text_imlaei`

    const res = await contentFetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const translations: TranslationData[] = (json.verse?.translations ?? []).map((t: any) => ({
      resourceId: t.resource_id,
      resourceName: t.resource_name ?? 'Unknown',
      text: (t.text ?? '').replace(/<[^>]*>/g, ''), // strip HTML tags
    }))

    translationCache.set(verseKey, { data: translations, timestamp: Date.now() })
    return translations
  } catch (err) {
    console.error('[verseDetailApi] fetchTranslations error:', err)
    return []
  }
}

// ── Tafsir ──────────────────────────────────────────────────────────────────

const tafsirCache = new Map<string, CacheEntry<TafsirData | null>>()

export async function fetchTafsir(verseKey: string): Promise<TafsirData | null> {
  const cacheKey = `${TAFSIR.id}:${verseKey}`
  const cached = tafsirCache.get(cacheKey)
  if (isCacheValid(cached)) return cached.data

  try {
    const path = `/api/v4/tafsirs/${TAFSIR.id}/by_ayah/${verseKey}` +
      `?fields=resource_name,language_name`

    const res = await contentFetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const tafsir = json.tafsir
    if (!tafsir) return null

    const data: TafsirData = {
      resourceName: tafsir.resource_name ?? TAFSIR.name,
      text: tafsir.text ?? '',
    }

    tafsirCache.set(cacheKey, { data, timestamp: Date.now() })
    return data
  } catch (err) {
    console.error('[verseDetailApi] fetchTafsir error:', err)
    return null
  }
}

// ── Reflections (Quran Reflect) ─────────────────────────────────────────────

const reflectionCache = new Map<string, CacheEntry<ReflectionPost[]>>()

export async function fetchReflections(verseKey: string): Promise<ReflectionPost[]> {
  const cached = reflectionCache.get(verseKey)
  if (isCacheValid(cached)) return cached.data

  const [chapterStr, verseStr] = verseKey.split(':')

  try {
    const params = new URLSearchParams({
      'references[0][chapterId]': chapterStr,
      'references[0][from]': verseStr,
      'references[0][to]': verseStr,
      'verifiedOnly': 'true',
      'limit': '3',
    })

    const path = `/api/v4/quran-reflect/posts?${params.toString()}`
    const res = await contentFetch(path)

    // This endpoint may not be available — gracefully degrade
    if (!res.ok) {
      console.warn(`[verseDetailApi] Reflections not available (${res.status})`)
      return []
    }

    const json = await res.json()
    const posts: ReflectionPost[] = (json.posts ?? []).map((p: any) => ({
      id: p.id,
      body: p.body ?? '',
      postTypeId: p.postTypeId ?? 1,
      authorName: p.author
        ? `${p.author.firstName ?? ''} ${p.author.lastName ?? ''}`.trim() || p.author.username || 'Anonymous'
        : 'Anonymous',
      likeCount: p.likes ?? 0,
    }))

    reflectionCache.set(verseKey, { data: posts, timestamp: Date.now() })
    return posts
  } catch (err) {
    console.warn('[verseDetailApi] fetchReflections error:', err)
    return []
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

    // URL may be relative — prepend CDN base if needed
    let url: string = audioFile.url
    if (!url.startsWith('http')) {
      url = `https://audio.qurancdn.com/${url}`
    }

    audioCache.set(cacheKey, { data: url, timestamp: Date.now() })
    return url
  } catch (err) {
    console.error('[verseDetailApi] fetchAudioUrl error:', err)
    return null
  }
}
