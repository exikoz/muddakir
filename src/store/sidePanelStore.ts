/**
 * Centralized side-panel state.
 *
 * Only ONE panel can be open at a time. Every toggle / open action goes
 * through this store so panels never stack on top of each other.
 */

import { create } from 'zustand'

export type PanelId =
  | 'discovery'
  | 'mushaf'
  | 'workspace'
  | 'aiScope'
  | 'verseDetail'

interface SidePanelState {
  /** Currently visible panel, or null when all panels are closed. */
  activePanel: PanelId | null

  /** Open a specific panel (closes whatever was open). */
  open: (panel: PanelId) => void

  /** Close the currently open panel (or a specific one if it matches). */
  close: (panel?: PanelId) => void

  /** Toggle a panel: open it if closed, close it if already open. */
  toggle: (panel: PanelId) => void
}

export const useSidePanelStore = create<SidePanelState>((set, get) => ({
  activePanel: null,

  open: (panel) => set({ activePanel: panel }),

  close: (panel) => {
    // If a specific panel is given, only close if it's the active one.
    if (panel && get().activePanel !== panel) return
    set({ activePanel: null })
  },

  toggle: (panel) => {
    set({ activePanel: get().activePanel === panel ? null : panel })
  },
}))
