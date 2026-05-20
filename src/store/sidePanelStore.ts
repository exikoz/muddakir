/**
 * Centralized side-panel state.
 *
 * Panels are grouped by side (left / right). Within each side only ONE panel
 * can be open at a time, but a left panel and a right panel can coexist.
 *
 * To register a new panel, add it to `PanelId` and `PANEL_SIDE`.
 */

import { create } from 'zustand'

export type PanelId =
  | 'discovery'
  | 'mushaf'
  | 'workspace'
  | 'aiScope'
  | 'verseDetail'
  | 'userProfile'

export type PanelSide = 'left' | 'right'

/** Defines which side each panel lives on. */
export const PANEL_SIDE: Record<PanelId, PanelSide> = {
  mushaf: 'left',
  discovery: 'right',
  workspace: 'right',
  aiScope: 'right',
  verseDetail: 'right',
  userProfile: 'right',
}

interface SidePanelState {
  leftPanel: PanelId | null
  rightPanel: PanelId | null

  /** The currently active panel on a given side (or check both). */
  activePanel: PanelId | null

  /** Open a specific panel (only closes the panel on the same side). */
  open: (panel: PanelId) => void

  /** Close the currently open panel (or a specific one if it matches). */
  close: (panel?: PanelId) => void

  /** Toggle a panel: open it if closed, close it if already open. */
  toggle: (panel: PanelId) => void
}

export const useSidePanelStore = create<SidePanelState>((set, get) => ({
  leftPanel: null,
  rightPanel: null,

  /** Derived — returns the "most recently relevant" active panel.
   *  Kept for backward-compat with code that reads `activePanel`. */
  get activePanel() {
    // Right panel takes precedence for legacy reads (most consumers are right-side).
    return get().rightPanel ?? get().leftPanel
  },

  open: (panel) => {
    const side = PANEL_SIDE[panel]
    if (side === 'left') {
      set({ leftPanel: panel })
    } else {
      set({ rightPanel: panel })
    }
  },

  close: (panel) => {
    const { leftPanel, rightPanel } = get()

    if (!panel) {
      // Close everything
      set({ leftPanel: null, rightPanel: null })
      return
    }

    if (leftPanel === panel) set({ leftPanel: null })
    if (rightPanel === panel) set({ rightPanel: null })
  },

  toggle: (panel) => {
    const side = PANEL_SIDE[panel]
    const key = side === 'left' ? 'leftPanel' : 'rightPanel'
    const current = get()[key]
    set({ [key]: current === panel ? null : panel })
  },
}))
