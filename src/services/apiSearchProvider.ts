/**
 * API search provider — uses the quran.com Search API (v1).
 *
 * Key behaviors:
 * - API handles tashkeel internally (no need to strip)
 * - API does morphological matching (finds related forms)
 * - Results with <em> tags = text match (highlightable)
 * - Results without <em> = semantic/related (no word highlight)
 * - <em> results always come before non-<em> results (clean split)
 * - For multi-word: API finds both adjacent and non-adjacent matches
 */
import type { SearchProvider } from './searchProvider'
import type { SearchResult, SearchOptions, MatchType } from '../types/quran'
import { searchQuranAPI } from './searchApiClient'
import type { APISearchVerse } from './searchApiClient'

/** Parse <em> tags from the API's name field */
function hasEmTags(name?: string): boolean {
  return !!name && name.includes('<em>')
}

/** Convert an API verse result to our SearchResult shape */
function toSearchResult(v: APISearchVerse, queryMatchType: MatchType): SearchResult {
  const highlighted = hasEmTags(v.name)

  // Extract matched tokens from <em> tags for compatibility with existing highlighting
  const matchedTokens: string[] = []
  if (v.name) {
    const re = /<em>(.*?)<\/em>/g
    let m
    while ((m = re.exec(v.name)) !== null) {
      // Each <em> block may contain multiple words — split them
      m[1].trim().split(/\s+/).forEach(w => matchedTokens.push(w))
    }
  }

  return {
    verse_key: v.key,
    matchScore: highlighted ? 3 : 0,
    matchType: highlighted ? queryMatchType : 'none',
    matchedTokens,
    text: v.arabic ?? v.name?.replace(/<\/?em>/g, '') ?? '',
    highlightedName: v.name,
    hasHighlight: highlighted,
  }
}

export const apiSearchProvider: SearchProvider = {
  name: 'api',

  async searchWord(query: string, _options: SearchOptions, limit = 50): Promise<SearchResult[]> {
    const response = await searchQuranAPI(query, { size: limit })

    // Determine match type based on what the user's mode was
    // (the API doesn't tell us exact/lemma/root — we infer from <em> presence)
    const matchType: MatchType = 'exact'

    return response.result.verses.map(v => toSearchResult(v, matchType))
  },

  async searchMultiWord(words: string[], _adjacent: boolean, _options: SearchOptions, limit = 50): Promise<SearchResult[]> {
    // API: send space-joined words — it finds both adjacent and non-adjacent
    const query = words.join(' ')
    const response = await searchQuranAPI(query, { size: limit })

    return response.result.verses.map(v => {
      const result = toSearchResult(v, 'exact')

      // For multi-word: check if the <em> block contains multiple words (= adjacent)
      // Adjacent matches get higher score so they sort first
      if (v.name) {
        const emBlocks = v.name.match(/<em>.*?<\/em>/g) || []
        const hasAdjacentBlock = emBlocks.some(b => {
          const content = b.replace(/<\/?em>/g, '').trim()
          return content.split(/\s+/).length >= words.length
        })
        if (hasAdjacentBlock) {
          result.matchType = 'regex' // mark as adjacent match for edge coloring
          result.matchScore = 10     // adjacent = highest priority
        } else if (result.hasHighlight) {
          result.matchScore = 3      // highlighted but not adjacent
        }
        // non-highlighted stays at 0
      }
      return result
    })
  },
}
