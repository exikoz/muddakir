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
// The Quran Reflect API is a separate service (quranreflect.com) that is NOT
// available through the quran.com content proxy. Calling it produces a 404
// that shows as a console error. We disable the fetch entirely and return
// empty until a dedicated Quran Reflect proxy is configured.

const reflectionCache = new Map<string, CacheEntry<ReflectionPost[]>>()

export async function fetchReflections(_verseKey: string): Promise<ReflectionPost[]> {
  // Quran Reflect API not available through current proxy — skip the call
  return []
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

    // URL may be relative or protocol-relative — normalize
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
