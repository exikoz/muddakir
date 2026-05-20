/**
 * Search provider abstraction.
 *
 * Both the quran-search-engine package and the quran.com Search API
 * implement this interface so the rest of the app can switch between them.
 */
import type { SearchResult, SearchOptions } from '../types/quran'

export interface SearchProvider {
  readonly name: 'package' | 'api'

  /** Single-word search (word click) */
  searchWord(query: string, options: SearchOptions, limit?: number): Promise<SearchResult[]>

  /** Multi-word search — adjacent or free depending on the provider */
  searchMultiWord(words: string[], adjacent: boolean, options: SearchOptions, limit?: number): Promise<SearchResult[]>

  /** Optional preload / warm-up */
  preload?(): void
}
