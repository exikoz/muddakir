/**
 * Package search provider — wraps the existing quran-search-engine code.
 * No changes to the underlying search logic.
 */
import type { SearchProvider } from './searchProvider'
import type { SearchResult, SearchOptions } from '../types/quran'
import { searchWord, searchRegex, buildAdjacentPattern, preload } from './quranSearch'

export const packageSearchProvider: SearchProvider = {
  name: 'package',

  async searchWord(query: string, options: SearchOptions, limit = 50): Promise<SearchResult[]> {
    const results = await searchWord(query, options, limit)
    return results.map(r => ({
      ...r,
      hasHighlight: (r.matchedTokens?.length > 0) || r.matchScore > 0,
    }))
  },

  async searchMultiWord(words: string[], adjacent: boolean, options: SearchOptions, limit = 50): Promise<SearchResult[]> {
    if (adjacent) {
      const pattern = buildAdjacentPattern(words)
      const results = await searchRegex(pattern, limit)
      return results.map(r => ({ ...r, hasHighlight: true }))
    }
    // Free mode: space-joined, AND logic
    const query = words.join(' ')
    const results = await searchWord(query, options, limit)
    return results.map(r => ({
      ...r,
      hasHighlight: (r.matchedTokens?.length > 0) || r.matchScore > 0,
    }))
  },

  preload() {
    preload()
  },
}
