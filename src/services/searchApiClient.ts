/**
 * Client for the quran.com Search API (v1).
 * Calls through our /api/search proxy which handles auth server-side.
 */

export interface APISearchVerse {
  key: string
  result_type: string
  arabic?: string
  name?: string
  isArabic?: boolean
  isTransliteration?: boolean
}

export interface APISearchResponse {
  result: {
    navigation: unknown[]
    verses: APISearchVerse[]
  }
  pagination: {
    total_records: number
    current_page: number
    next_page: number | null
    per_page: number
    total_pages: number
  }
}

export async function searchQuranAPI(
  query: string,
  options?: {
    size?: number
    page?: number
    exact_matches_only?: boolean
  },
): Promise<APISearchResponse> {
  const params = new URLSearchParams({
    mode: 'advanced',
    query,
    highlight: '1',
    get_text: '1',
  })
  if (options?.size) params.set('size', String(options.size))
  if (options?.page) params.set('page', String(options.page))
  if (options?.exact_matches_only) params.set('exact_matches_only', '1')

  const res = await fetch(`/api/search-proxy/v1/search?${params}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Search API error ${res.status}: ${body}`)
  }
  return res.json()
}
