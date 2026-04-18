/**
 * Audio configuration — reciters, CDN base URL, and resource IDs.
 * Change reciters here and they apply everywhere in the app.
 */

export interface ReciterConfig {
  id: number
  name: string
  style: string
  /** Recitation ID — used for verse-by-verse audio playback */
  recitationId: number
  /** Chapter reciter ID — used for the timestamp/segments API */
  chapterReciterId: number
}

export const AUDIO_CDN_BASE = 'https://audio.qurancdn.com/'

export const RECITERS: readonly ReciterConfig[] = [
  { id: 1, name: 'Abdul Basit',  style: 'Mujawwad', recitationId: 1, chapterReciterId: 1 },
  { id: 2, name: 'Al-Minshawi',  style: 'Murattal', recitationId: 9, chapterReciterId: 9 },
  { id: 3, name: 'Al-Husary',    style: 'Murattal', recitationId: 6, chapterReciterId: 6 },
] as const

export const DEFAULT_RECITER_ID = 1

/** Look up the chapter reciter ID for a given recitation ID. */
export function getChapterReciterId(recitationId: number): number | null {
  const r = RECITERS.find(r => r.recitationId === recitationId)
  return r?.chapterReciterId ?? null
}
