/**
 * Word-level highlight matching utility.
 *
 * Three strategies:
 * 1. Exact match: matchedTokens from engine → removeTashkeel comparison
 * 2. Lemma/root/fuzzy fallback: searchQuery → removeTashkeel + includes
 * 3. Regex: searchQuery → normalizeArabic + concatenated string + offset mapping
 *
 * Used by both graph nodes (ArabicText) and the Discovery panel (DiscoveryItem).
 */
import { removeTashkeel, normalizeArabic } from 'quran-search-engine'
import type { Word, MatchType } from '../types/quran'

const DEBUG = import.meta.env.DEV

/**
 * Main entry point. Dispatches to the right strategy based on available data.
 *
 * @param words       - API word objects (verse.words)
 * @param matchedTokens - from engine result (may be empty)
 * @param matchType   - from engine result (includes 'regex' for adjacent searches)
 * @param searchQuery - the original search query (needed for lemma/regex fallback)
 * @param verseKey    - for debug logging
 */
export function getWordHighlights(
  words: Word[],
  matchedTokens: string[],
  matchType: MatchType,
  searchQuery?: string,
  verseKey?: string,
): Map<number, MatchType> {
  // Regex → always use regex strategy
  if (matchType === 'regex' && searchQuery) {
    return getHighlightPositions_RegexB(words, searchQuery, verseKey)
  }

  // Exact matches with tokens from engine → use token comparison
  if (matchedTokens && matchedTokens.length > 0) {
    return getHighlights_ExactTokens(words, matchedTokens, matchType as MatchType, verseKey)
  }

  // Lemma/root/fuzzy/none with empty tokens → use includes fallback
  if (searchQuery) {
    return getHighlightPositions_LemmaA(words, searchQuery, matchType as MatchType, verseKey)
  }

  return new Map()
}

/**
 * Strategy 1: Exact token matching (existing behavior).
 * Engine gave us matchedTokens — compare with removeTashkeel.
 */
function getHighlights_ExactTokens(
  words: Word[],
  matchedTokens: string[],
  matchType: MatchType,
  verseKey?: string,
): Map<number, MatchType> {
  const map = new Map<number, MatchType>()
  const strippedTokens = matchedTokens.map(t => removeTashkeel(t).trim())

  if (DEBUG) {
    console.groupCollapsed(`[highlight:exact] ${verseKey ?? '?'} — tokens: [${matchedTokens.join(', ')}]`)
  }

  words.forEach((word, index) => {
    if (word.char_type_name === 'end') return
    const strippedWord = removeTashkeel(word.text).trim()
    const matched = strippedTokens.some(token => token === strippedWord)
    if (DEBUG) {
      console.log(`  [${index}] "${word.text}" → "${strippedWord}" ${matched ? '✅' : '—'}`)
    }
    if (matched) {
      map.set(index, matchType)
    }
  })

  if (DEBUG) {
    console.log(`  Result: ${map.size} words highlighted`)
    console.groupEnd()
  }
  return map
}

/**
 * Strategy 2: Lemma/root/fuzzy fallback.
 * No tokens from engine — check if each word CONTAINS the search query.
 * Direction: strippedWord.includes(strippedQuery) only, never reverse.
 * This catches prefixed forms (ولسليمان contains سليمان).
 */
function getHighlightPositions_LemmaA(
  words: Word[],
  searchQuery: string,
  matchType: MatchType,
  verseKey?: string,
): Map<number, MatchType> {
  const map = new Map<number, MatchType>()
  const strippedQuery = removeTashkeel(searchQuery).trim()
  if (!strippedQuery) return map

  if (DEBUG) {
    console.groupCollapsed(`[highlight:lemma] ${verseKey ?? '?'} — query: "${searchQuery}" → "${strippedQuery}"`)
  }

  words.forEach((word, index) => {
    if (word.char_type_name === 'end') return
    const strippedWord = removeTashkeel(word.text).trim()
    const matched = strippedWord.includes(strippedQuery)
    if (DEBUG) {
      console.log(`  [${index}] "${word.text}" → "${strippedWord}" ${matched ? '✅' : '—'}`)
    }
    if (matched) {
      map.set(index, matchType === 'none' ? 'lemma' : matchType)
    }
  })

  if (DEBUG) {
    console.log(`  Result: ${map.size} words highlighted`)
    console.groupEnd()
  }
  return map
}

/**
 * Strategy 3: Regex/adjacent-word highlighting.
 * Concatenate normalizeArabic(text) of each word, run regex, map offsets to indices.
 * Uses normalizeArabic (not removeTashkeel) because the regex engine normalizes
 * hamza internally (أ/إ/آ → ا).
 */
function getHighlightPositions_RegexB(
  words: Word[],
  searchQuery: string,
  verseKey?: string,
): Map<number, MatchType> {
  const map = new Map<number, MatchType>()

  const actualWords: { word: Word; index: number }[] = []
  words.forEach((w, i) => {
    if (w.char_type_name !== 'end') actualWords.push({ word: w, index: i })
  })

  const normalizedWords = actualWords.map(aw => normalizeArabic(aw.word.text).trim())

  // Build concatenated string and track word boundaries
  const wordBoundaries: { start: number; end: number; originalIndex: number }[] = []
  let pos = 0
  for (let i = 0; i < normalizedWords.length; i++) {
    const start = pos
    const end = pos + normalizedWords[i].length
    wordBoundaries.push({ start, end, originalIndex: actualWords[i].index })
    pos = end + 1 // +1 for space
  }
  const concatenated = normalizedWords.join(' ')

  // Build and run regex
  const normalizedQuery = normalizeArabic(searchQuery).trim()
  const tokens = normalizedQuery.split(/\s+/)
  const regexStr = tokens.join('\\s+')

  let regex: RegExp
  try {
    regex = new RegExp(regexStr, 'g')
  } catch {
    return map
  }

  if (DEBUG) {
    console.groupCollapsed(`[highlight:regex] ${verseKey ?? '?'} — pattern: "${regexStr}"`)
    console.log(`  Concatenated: "${concatenated.substring(0, 120)}..."`)
  }

  let match: RegExpExecArray | null
  while ((match = regex.exec(concatenated)) !== null) {
    const matchStart = match.index
    const matchEnd = match.index + match[0].length
    for (const wb of wordBoundaries) {
      if (wb.end > matchStart && wb.start < matchEnd) {
        map.set(wb.originalIndex, 'exact')
      }
    }
    if (DEBUG) {
      console.log(`  Match [${matchStart}:${matchEnd}] "${match[0]}"`)
    }
  }

  if (DEBUG) {
    console.log(`  Result: ${map.size} words highlighted`)
    console.groupEnd()
  }
  return map
}
