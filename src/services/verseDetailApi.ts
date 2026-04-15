/**
 * API functions for the Verse Detail panel.
 * All calls go through the existing contentFetch (authenticated + proxied)
 * and use the same cache pattern as quranApi.ts (7-day TTL).
 */

import { contentFetch } from '../lib/auth'
import type { TranslationData, TafsirData, ResourceItem } from '../features/verseDetail/types'

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
    const items: ResourceItem[] = (json.tafsirs ?? []).map((t: any) => ({
      id: t.id,
      name: t.name ?? t.translated_name?.name ?? 'Unknown',
      language: t.language_name ?? t.translated_name?.language_name ?? '',
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
    const items: ResourceItem[] = (json.translations ?? []).map((t: any) => ({
      id: t.id,
      name: t.name ?? t.translated_name?.name ?? 'Unknown',
      language: t.language_name ?? t.translated_name?.language_name ?? '',
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
    const translations: TranslationData[] = (json.verse?.translations ?? []).map((t: any) => ({
      resourceId: t.resource_id,
      resourceName: t.resource_name ?? 'Unknown',
      text: (t.text ?? '').replace(/<[^>]*>/g, ''),
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
