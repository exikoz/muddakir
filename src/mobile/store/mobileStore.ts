/**
 * Mobile-specific UI state.
 *
 * Manages tab navigation, expanded groups, and full-screen panel state
 * that only exist in the mobile view. The core data (nodes, edges,
 * workspaces) lives in the shared stores.
 */

import { create } from 'zustand'

export type MobileTab = 'explorer' | 'mushaf' | 'ai' | 'workspaces'

export type MobilePanel =
  | { type: 'verseDetail'; verseKey: string }
  | { type: 'mushaf'; chapter?: number; highlightVerse?: string }
  | { type: 'ai' }
  | { type: 'discovery'; nodeId?: string }
  | null

interface MobileState {
  /** Active bottom tab */
  activeTab: MobileTab
  setActiveTab: (tab: MobileTab) => void

  /** Full-screen panel stack (slides up over the current tab) */
  panel: MobilePanel
  openPanel: (panel: MobilePanel) => void
  closePanel: () => void

  /** Expanded result groups (by source node ID) */
  expandedGroups: Set<string>
  toggleGroup: (nodeId: string) => void
  isGroupExpanded: (nodeId: string) => boolean

  /** Multi-word selection mode (triggered by long-press) */
  wordSelectionMode: boolean
  setWordSelectionMode: (on: boolean) => void
}

export const useMobileStore = create<MobileState>((set, get) => ({
  activeTab: 'explorer',
  setActiveTab: (tab) => set({ activeTab: tab, panel: null }),

  panel: null,
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),

  expandedGroups: new Set(),
  toggleGroup: (nodeId) => {
    const next = new Set(get().expandedGroups)
    if (next.has(nodeId)) next.delete(nodeId)
    else next.add(nodeId)
    set({ expandedGroups: next })
  },
  isGroupExpanded: (nodeId) => get().expandedGroups.has(nodeId),

  wordSelectionMode: false,
  setWordSelectionMode: (on) => set({ wordSelectionMode: on }),
}))
