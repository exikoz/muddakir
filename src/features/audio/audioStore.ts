/**
 * Audio state — singleton player. Only one verse plays at a time.
 * Now plays chapter audio and seeks to the verse position for perfect
 * word-by-word highlighting sync.
 */

import { create } from 'zustand'
import { DEFAULT_RECITER_ID } from './audioConfig'

interface AudioState {
  currentVerseKey: string | null
  currentReciterId: number
  isPlaying: boolean
  isLoading: boolean
  audioUrl: string | null
  duration: number
  currentTime: number

  /** Verse start offset in the chapter audio (seconds) */
  verseStartTime: number
  /** Verse end offset in the chapter audio (seconds) */
  verseEndTime: number

  playVerse: (verseKey: string, reciterId?: number) => void
  pause: () => void
  stop: () => void
  setReciter: (reciterId: number) => void
  setLoading: (loading: boolean) => void
  setDuration: (d: number) => void
  setCurrentTime: (t: number) => void
  setVerseRange: (start: number, end: number) => void
  seek: (t: number) => void
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentVerseKey: null,
  currentReciterId: DEFAULT_RECITER_ID,
  isPlaying: false,
  isLoading: false,
  audioUrl: null,
  duration: 0,
  currentTime: 0,
  verseStartTime: 0,
  verseEndTime: 0,

  playVerse: (verseKey, reciterId) => {
    const rid = reciterId ?? get().currentReciterId
    set({
      currentVerseKey: verseKey,
      currentReciterId: rid,
      isPlaying: true,
      isLoading: true,
      duration: 0,
      currentTime: 0,
      verseStartTime: 0,
      verseEndTime: 0,
    })
  },

  pause: () => set({ isPlaying: false }),

  stop: () => set({
    isPlaying: false,
    isLoading: false,
    currentVerseKey: null,
    audioUrl: null,
    duration: 0,
    currentTime: 0,
    verseStartTime: 0,
    verseEndTime: 0,
  }),

  setReciter: (reciterId) => {
    const { currentVerseKey } = get()
    set({ currentReciterId: reciterId })
    if (currentVerseKey) {
      set({ isPlaying: true, isLoading: true, duration: 0, currentTime: 0, verseStartTime: 0, verseEndTime: 0 })
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setDuration: (d) => set({ duration: d }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setVerseRange: (start, end) => set({ verseStartTime: start, verseEndTime: end }),
  seek: (t) => set({ currentTime: t }),
}))
