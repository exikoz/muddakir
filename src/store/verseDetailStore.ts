/**
 * Verse Detail store — manages the detail panel state.
 *
 * The detail panel is a sidebar mode that shows structured verse information.
 * It coexists with AI Scope and Discovery — switching between them preserves
 * each panel's state.
 */

import { create } from 'zustand'
import type { Verse } from '../types/quran'

interface VerseDetailState {
  isOpen: boolean
  verse: Verse | null
  /** Which panel was open before detail was opened (to restore on back) */
  previousPanel: 'aiScope' | 'discovery' | null

  openDetail: (verse: Verse, previousPanel?: 'aiScope' | 'discovery' | null) => void
  close: () => void
}

export const useVerseDetailStore = create<VerseDetailState>((set) => ({
  isOpen: false,
  verse: null,
  previousPanel: null,

  openDetail: (verse, previousPanel = null) => set({
    isOpen: true,
    verse,
    previousPanel,
  }),

  close: () => set({ isOpen: false, verse: null, previousPanel: null }),
}))
