/**
 * Audio state — singleton player. Only one verse plays at a time.
 */

import { create } from 'zustand'
import { DEFAULT_RECITER_ID } from './audioConfig'

interface AudioState {
  currentVerseKey: string | null
  currentReciterId: number
  isPlaying: boolean
  audioUrl: string | null
  duration: number
  currentTime: number

  playVerse: (verseKey: string, reciterId?: number) => void
  pause: () => void
  stop: () => void
  setReciter: (reciterId: number) => void
  setDuration: (d: number) => void
  setCurrentTime: (t: number) => void
  seek: (t: number) => void
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentVerseKey: null,
  currentReciterId: DEFAULT_RECITER_ID,
  isPlaying: false,
  audioUrl: null,
  duration: 0,
  currentTime: 0,

  playVerse: (verseKey, reciterId) => {
    const rid = reciterId ?? get().currentReciterId
    set({
      currentVerseKey: verseKey,
      currentReciterId: rid,
      isPlaying: true,
      duration: 0,
      currentTime: 0,
    })
  },

  pause: () => set({ isPlaying: false }),

  stop: () => set({
    isPlaying: false,
    currentVerseKey: null,
    audioUrl: null,
    duration: 0,
    currentTime: 0,
  }),

  setReciter: (reciterId) => {
    const { currentVerseKey } = get()
    set({ currentReciterId: reciterId })
    if (currentVerseKey) {
      // Restart with new reciter
      set({ isPlaying: true, duration: 0, currentTime: 0 })
    }
  },

  setDuration: (d) => set({ duration: d }),
  setCurrentTime: (t) => set({ currentTime: t }),
  seek: (t) => set({ currentTime: t }),
}))
