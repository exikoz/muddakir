/**
 * User API service — pure async functions for Quran Foundation User APIs.
 *
 * All calls require a user access token (from OAuth login).
 * Uses the same header pattern as the Content API: x-auth-token + x-client-id.
 *
 * Bookmark model: We use the __default__ collection (Quran.com Favorites).
 * This means bookmarks created here show up on quran.com and vice versa.
 */

import { getUserApiBase, getUserClientId } from '../lib/userAuth'

// ── Types ───────────────────────────────────────────────────────────────────

export interface Bookmark {
  id: string
  type: 'ayah' | 'surah' | 'page' | 'juz'
  key: number        // surah number for type=ayah
  verseNumber: number | null
  createdAt: string
}

// ── Internal helpers ────────────────────────────────────────────────────────

async function userFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const base = getUserApiBase()
  const clientId = getUserClientId()

  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      'x-auth-token': token,
      'x-client-id': clientId,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

// ── Bookmarks (Favorites collection) ────────────────────────────────────────

/**
 * Fetch all ayah bookmarks from the user's Favorites collection.
 * Returns a Set of verse keys (e.g. "2:255") for fast lookup.
 */
export async function fetchBookmarks(token: string): Promise<Bookmark[]> {
  const res = await userFetch('/auth/v1/bookmarks?type=ayah&mushaf=2', token)
  if (!res.ok) throw new Error(`Bookmarks fetch failed: ${res.status}`)
  const json = await res.json()
  return (json.data ?? []) as Bookmark[]
}

/**
 * Add a verse to the user's Favorites collection (__default__).
 * verseKey format: "2:255" → key=2, verseNumber=255
 */
export async function addBookmark(
  token: string,
  verseKey: string,
): Promise<Bookmark> {
  const [surah, ayah] = verseKey.split(':').map(Number)

  const res = await userFetch('/auth/v1/collections/__default__/bookmarks', token, {
    method: 'POST',
    body: JSON.stringify({
      key: surah,
      verseNumber: ayah,
      type: 'ayah',
      mushaf: 2, // QCFV1
    }),
  })

  if (!res.ok) throw new Error(`Add bookmark failed: ${res.status}`)
  const json = await res.json()
  return json.data as Bookmark
}

/**
 * Remove a verse from the user's Favorites collection.
 */
export async function removeBookmark(
  token: string,
  verseKey: string,
): Promise<void> {
  const [surah, ayah] = verseKey.split(':').map(Number)

  const res = await userFetch(
    `/auth/v1/collections/__default__/bookmarks?key=${surah}&verseNumber=${ayah}&type=ayah&mushaf=2`,
    token,
    { method: 'DELETE' },
  )

  if (!res.ok) throw new Error(`Remove bookmark failed: ${res.status}`)
}
