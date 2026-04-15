/**
 * Audio configuration — reciters, CDN base URL, and resource IDs.
 * Change reciters here and they apply everywhere in the app.
 */

export interface ReciterConfig {
  id: number
  name: string
  style: string
  recitationId: number
}

export const AUDIO_CDN_BASE = 'https://audio.qurancdn.com/'

export const RECITERS: readonly ReciterConfig[] = [
  { id: 1, name: 'Abdul Basit',  style: 'Mujawwad', recitationId: 1 },
  { id: 2, name: 'Al-Minshawi',  style: 'Murattal', recitationId: 4 },
  { id: 3, name: 'Al-Husary',    style: 'Murattal', recitationId: 7 },
] as const

export const DEFAULT_RECITER_ID = 1
