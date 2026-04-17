/**
 * Word Builder Store
 *
 * Manages the state for the word-by-word search builder.
 * When a user clicks words in verse nodes, they accumulate here.
 *
 * - 1 word  → executes a normal search (respects toolbar mode filter)
 * - 2+ words → executes an adjacent regex search
 *
 * The "free mode" (non-adjacent AND search) is kept in the interface
 * but not exposed in the UI for now — flip `adjacentMode` to false to use it.
 */

import { create } from 'zustand'

export interface SelectedWord {
  nodeId: string
  wordIndex: number
  text: string
}

interface WordBuilderState {
  /** Words the user has clicked, in order. */
  words: SelectedWord[]

  /**
   * When true, multi-word searches use adjacent regex.
   * When false, multi-word searches use AND (free) logic.
   * Default: true (adjacent). Free mode kept for future use.
   */
  adjacentMode: boolean

  /** Add a word to the builder. Deduplicates by nodeId+wordIndex. */
  addWord: (nodeId: string, wordIndex: number, text: string) => void

  /** Remove a word by its index in the `words` array. */
  removeWord: (index: number) => void

  /** Clear all selected words. */
  clear: () => void

  /** Toggle adjacent vs free mode (for future use). */
  setAdjacentMode: (on: boolean) => void
}

export const useWordBuilderStore = create<WordBuilderState>((set, get) => ({
  words: [],
  adjacentMode: true,

  addWord: (nodeId, wordIndex, text) => {
    const { words } = get()
    // Toggle off if already selected
    const existing = words.findIndex(
      w => w.nodeId === nodeId && w.wordIndex === wordIndex
    )
    if (existing >= 0) {
      set({ words: words.filter((_, i) => i !== existing) })
    } else {
      set({ words: [...words, { nodeId, wordIndex, text }] })
    }
  },

  removeWord: (index) => {
    set({ words: get().words.filter((_, i) => i !== index) })
  },

  clear: () => set({ words: [] }),

  setAdjacentMode: (on) => set({ adjacentMode: on }),
}))
