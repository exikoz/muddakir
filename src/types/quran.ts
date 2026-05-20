export interface Word {
  id: number
  position: number
  text: string
  text_simple?: string
  char_type_name: string
  transliteration?: string
  translation?: string
  root?: string
  lemma?: string
}

export interface Verse {
  verse_key: string
  text_arabic: string
  translation: string
  words: Word[]
}

export type MatchType = 'exact' | 'lemma' | 'root' | 'fuzzy' | 'semantic' | 'regex' | 'none'

export interface SearchResult {
  verse_key: string
  matchScore: number
  matchType: MatchType
  matchedTokens: string[]
  tokenTypes?: Record<string, string>
  text: string
  /** API search: raw Uthmani HTML with <em> tags around matched words */
  highlightedName?: string
  /** true when we have data to highlight (tokens, <em>, or suffixMatch) */
  hasHighlight?: boolean
}

export interface SearchOptions {
  lemma: boolean
  root: boolean
  fuzzy: boolean
  semantic: boolean
}
