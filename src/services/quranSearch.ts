/**
 * Search engine singleton — loads quran-search-engine data once,
 * exposes typed search() + getHighlightRanges re-export.
 */
import {
  search,
  loadQuranData,
  loadMorphology,
  loadWordMap,
  buildInvertedIndex,
  loadSemanticData,
  normalizeArabic,
  getHighlightRanges as libGetHighlightRanges,
} from 'quran-search-engine'
import type {
  QuranText,
  MorphologyAya,
  WordMap,
  InvertedIndex,
  SearchContext,
} from 'quran-search-engine'
import type { SearchOptions, SearchResult } from '../types/quran'

export { libGetHighlightRanges as getHighlightRanges }

/**
 * Get the active search mode from SearchOptions
 * This is the single source of truth for determining which mode is active
 */
export function getActiveSearchMode(options: SearchOptions): string {
  if (options.lemma) return 'lemma'
  if (options.root) return 'root'
  if (options.fuzzy) return 'fuzzy'
  if (options.semantic) return 'semantic'
  return 'exact'
}

// ── Singleton state ──────────────────────────────────────────────────────────
let quranData: Map<number, QuranText> | null = null
let morphologyMap: Map<number, MorphologyAya> | null = null
let wordMap: WordMap | null = null
let invertedIndex: InvertedIndex | null = null
let semanticMap: Map<string, string[]> | null = null
let loadPromise: Promise<void> | null = null

async function ensureLoaded(): Promise<void> {
  if (quranData && morphologyMap && wordMap) {
    console.log('✅ [quranSearch] Data already loaded')
    return
  }
  if (loadPromise) {
    console.log('⏳ [quranSearch] Loading in progress...')
    return loadPromise
  }
  
  console.group('📦 [quranSearch] Loading Data')
  console.time('Total Load Time')
  
  loadPromise = Promise.all([
    (async () => {
      console.time('⏱️ loadQuranData()')
      const data = await loadQuranData()
      console.timeEnd('⏱️ loadQuranData()')
      console.log(`✅ Loaded ${data.size} verses`)
      return data
    })(),
    (async () => {
      console.time('⏱️ loadMorphology()')
      const data = await loadMorphology()
      console.timeEnd('⏱️ loadMorphology()')
      console.log(`✅ Loaded morphology for ${data.size} verses`)
      return data
    })(),
    (async () => {
      console.time('⏱️ loadWordMap()')
      const data = await loadWordMap()
      console.timeEnd('⏱️ loadWordMap()')
      console.log(`✅ Loaded ${Object.keys(data).length} word mappings`)
      return data
    })(),
    (async () => {
      console.time('⏱️ loadSemanticData()')
      const data = await loadSemanticData()
      console.timeEnd('⏱️ loadSemanticData()')
      console.log(`✅ Loaded ${data.size} semantic mappings`)
      return data
    })(),
  ]).then(([qd, mm, wm, sm]) => {
    quranData = qd // keep the original Map<gid, QuranText> — never convert
    morphologyMap = mm
    wordMap = new Map(
      [...wm].map(([k, v]) => [k, { ...v, root: v.root ? normalizeArabic(v.root) : v.root }])
    )
    semanticMap = sm
    
    console.time('⏱️ buildInvertedIndex()')
    invertedIndex = buildInvertedIndex(mm, qd, sm)
    console.timeEnd('⏱️ buildInvertedIndex()')
    console.log('✅ Built inverted index (lemma, root, word)')
    console.log('📊 Index Stats:', {
      lemmaKeys: invertedIndex.lemmaIndex?.size ?? 0,
      rootKeys: invertedIndex.rootIndex?.size ?? 0,
      wordKeys: invertedIndex.wordIndex?.size ?? 0,
    })
    
    console.timeEnd('Total Load Time')
    console.groupEnd()
  }).finally(() => { loadPromise = null })
  
  return loadPromise
}

function buildContext(): SearchContext<QuranText> {
  return {
    quranData: quranData!,
    morphologyMap: morphologyMap!,
    wordMap: wordMap!,
    invertedIndex: invertedIndex ?? undefined,
    semanticMap: semanticMap ?? undefined,
  }
}

// ── Logging utilities ────────────────────────────────────────────────────────
const isDev = import.meta.env.DEV

function logSearch(query: string, options: SearchOptions, limit: number) {
  if (!isDev) return
  console.group(`🔍 [quranSearch] Query: "${query}"`)
  console.log('Options:', {
    lemma: options.lemma,
    root: options.root,
    fuzzy: options.fuzzy,
    semantic: options.semantic,
    isRegex: (options as unknown as Record<string, unknown>).isRegex,
    isBoolean: (options as unknown as Record<string, unknown>).isBoolean,
  })
  console.log('Limit:', limit)
  console.time('Search Duration')
}

function logResults(results: Array<{ matchType?: string; matchScore?: number; matchedTokens?: string[]; sura_id?: number; aya_id?: number }>, duration?: number) {
  if (!isDev) return
  console.log(`✅ Found ${results.length} results`)
  
  if (results.length > 0) {
    const matchTypeCounts = results.reduce((acc, r) => {
      const mt = r.matchType ?? 'unknown'
      acc[mt] = (acc[mt] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('Match Type Distribution:', matchTypeCounts)
    console.log('Top 3 Results:', results.slice(0, 3).map(r => ({
      verse: `${r.sura_id}:${r.aya_id}`,
      matchType: r.matchType,
      score: r.matchScore,
      tokens: r.matchedTokens?.slice(0, 3),
    })))
    
    const avgScore = results.reduce((sum, r) => sum + (r.matchScore ?? 0), 0) / results.length
    console.log('Average Score:', avgScore.toFixed(2))
  }
  
  if (duration !== undefined) {
    console.log(`⏱️ Duration: ${duration.toFixed(2)}ms`)
  }
  console.timeEnd('Search Duration')
  console.groupEnd()
}

function logError(error: unknown, query: string) {
  if (!isDev) return
  console.group(`❌ [quranSearch] Error for query: "${query}"`)
  console.error(error)
  console.groupEnd()
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function searchWord(
  query: string,
  options: SearchOptions,
  limit = 50,
): Promise<SearchResult[]> {
  const startTime = performance.now()
  
  try {
    await ensureLoaded()
    
    logSearch(query, options, limit)
    
    const response = search(query, buildContext(), options, { page: 1, limit })
    const duration = performance.now() - startTime
    
    const results = response.results.map(r => ({
      verse_key:     `${r.sura_id}:${r.aya_id}`,
      matchScore:    r.matchScore ?? 0,
      matchType:     (r.matchType ?? 'none') as SearchResult['matchType'],
      matchedTokens: r.matchedTokens ?? [],
      tokenTypes:    r.tokenTypes as Record<string, string> | undefined,
      text:          r.uthmani,
    }))
    
    logResults(response.results, duration)
    
    return results
  } catch (error) {
    logError(error, query)
    throw error
  }
}

/**
 * Regex-based search — used for adjacent multi-word queries.
 * Builds a pattern like `word1\s+word2\s+word3` and passes isRegex: true.
 * Words are normalized before building the pattern.
 */
export async function searchRegex(
  pattern: string,
  limit = 50,
): Promise<SearchResult[]> {
  const startTime = performance.now()

  try {
    await ensureLoaded()

    if (isDev) {
      console.group(`🔍 [quranSearch] Regex: "${pattern}"`)
      console.time('Search Duration')
    }

    const response = search(pattern, buildContext(), {
      lemma: false,
      root: false,
      fuzzy: false,
      isRegex: true,
    }, { page: 1, limit })

    const duration = performance.now() - startTime

    const results = response.results.map(r => ({
      verse_key:     `${r.sura_id}:${r.aya_id}`,
      matchScore:    r.matchScore ?? 0,
      matchType:     (r.matchType ?? 'none') as SearchResult['matchType'],
      matchedTokens: r.matchedTokens ?? [],
      tokenTypes:    r.tokenTypes as Record<string, string> | undefined,
      text:          r.uthmani,
    }))

    logResults(response.results, duration)

    return results
  } catch (error) {
    logError(error, pattern)
    throw error
  }
}

/**
 * Build a regex pattern for adjacent word matching.
 * Normalizes each word and joins with \s+ to match words that appear
 * next to each other (with any whitespace between them).
 */
export function buildAdjacentPattern(words: string[]): string {
  return words
    .map(w => normalizeArabic(w))
    .filter(w => w.length > 0)
    .join('\\s+')
}

/** Get full raw search response with all details */
export async function searchRaw(
  query: string,
  options: SearchOptions,
  limit = 50,
) {
  await ensureLoaded()
  const response = search(query, buildContext(), options, { page: 1, limit })
  return response
}

/** Get current data loading status */
export function getDataStatus() {
  return {
    loaded: !!(quranData && morphologyMap && wordMap),
    loading: !!loadPromise,
    methods: {
      quranData: {
        loaded: !!quranData,
        count: quranData?.size ?? 0,
        name: 'loadQuranData()'
      },
      morphology: {
        loaded: !!morphologyMap,
        count: morphologyMap?.size ?? 0,
        name: 'loadMorphology()'
      },
      wordMap: {
        loaded: !!wordMap,
        count: wordMap ? Object.keys(wordMap).length : 0,
        name: 'loadWordMap()'
      },
      semanticMap: {
        loaded: !!semanticMap,
        count: semanticMap?.size ?? 0,
        name: 'loadSemanticData()'
      },
      invertedIndex: {
        loaded: !!invertedIndex,
        name: 'buildInvertedIndex()',
        stats: invertedIndex ? {
          lemmaKeys: invertedIndex.lemmaIndex?.size ?? 0,
          rootKeys: invertedIndex.rootIndex?.size ?? 0,
          wordKeys: invertedIndex.wordIndex?.size ?? 0,
        } : null
      }
    }
  }
}

/** Preload in the background so first search is instant */
export function preload(): void {
  ensureLoaded().catch(console.error)
}
