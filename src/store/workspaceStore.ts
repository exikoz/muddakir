/**
 * Workspace store — manages multiple saved workspaces.
 *
 * Separated from the graph store to keep concerns clean:
 *   - graphStore owns the live canvas state (nodes, edges, search, undo/redo)
 *   - workspaceStore owns the list of saved workspaces and save/load/switch logic
 *
 * Communication: workspaceStore reads from / writes to graphStore via
 * snapshot helpers (captureWorkspace / restoreWorkspace).
 */

import { create } from 'zustand'
import type { WorkspaceMeta, WorkspaceData } from '../types/workspace'
import {
  listWorkspaces,
  loadWorkspace,
  saveWorkspace,
  deleteWorkspace,
} from '../services/workspaceStorage'
import { useStore } from './index'
import { useSidePanelStore } from './sidePanelStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getReactFlowInstance = () => (window as Record<string, any>).__reactFlowInstance as { fitView: (opts: Record<string, unknown>) => void } | undefined

// ---------------------------------------------------------------------------
// Snapshot helpers — bridge between graphStore and WorkspaceData
// ---------------------------------------------------------------------------

/** Capture the current graph store state into a WorkspaceData blob.
 *
 *  IMPORTANT: We deep-copy nodes/edges via JSON round-trip so the
 *  IndexedDB structured-clone doesn't walk shared object references
 *  (ReactFlow nodes inside history snapshots point to the same Verse
 *  objects → structured clone can explode in size / CPU).
 */
function captureCurrentState(meta: WorkspaceMeta): WorkspaceData {
  const g = useStore.getState()

  // Deep-copy the heavy arrays to break shared references
  const nodes = JSON.parse(JSON.stringify(g.nodes))
  const edges = JSON.parse(JSON.stringify(g.edges))

  return {
    version: 1,
    meta: { ...meta, nodeCount: g.nodes.length, updatedAt: Date.now() },
    nodes,
    edges,
    searchOptions: { ...g.searchOptions },
    multiWordMode: g.multiWordMode,
    adjacentMode: g.adjacentMode,
    useAutoLayout: g.useAutoLayout,
    explorerState: g.explorer.exportState(),
    // Don't persist undo/redo history — it's session-only and can be
    // extremely large (50 snapshots × full node arrays).  On restore
    // we start with a clean history containing just the restored state.
    history: [],
    historyIndex: -1,
  }
}

/** Restore a WorkspaceData blob into the graph store. */
function restoreState(data: WorkspaceData) {
  const g = useStore.getState()

  // Restore explorer core state
  g.explorer.importState(data.explorerState)

  // Build a single initial history snapshot so undo starts clean
  const initialSnapshot = {
    nodes: data.nodes,
    edges: data.edges,
    explorerState: data.explorerState,
    discoveryCache: { cache: [], activeNodeId: null },
    timestamp: Date.now(),
  }

  // Restore graph + UI state in one batch
  useStore.setState({
    nodes: data.nodes,
    edges: data.edges,
    searchOptions: data.searchOptions,
    multiWordMode: data.multiWordMode,
    adjacentMode: data.adjacentMode,
    useAutoLayout: data.useAutoLayout,
    history: [initialSnapshot],
    historyIndex: 0,
    canUndo: false,
    canRedo: false,
    // Reset transient UI state
    selectedWords: [],
    isDiscoveryOpen: false,
    discoveryResults: [],
    discoveryLoading: false,
    currentSearchTerm: data.explorerState.currentSearchTerm,
    isMushafOpen: false,
  })
  useSidePanelStore.getState().close()

  // Fit the viewport to the restored nodes after ReactFlow processes the update
  setTimeout(() => {
    const rf = getReactFlowInstance()
    if (rf && data.nodes.length > 0) {
      rf.fitView({ duration: 300, padding: 0.2 })
    }
  }, 50)
}

/** Reset the graph store to a blank canvas with a fresh explorer. */
function resetGraphStore() {
  const g = useStore.getState()
  g.explorer.clear()

  useStore.setState({
    nodes: [],
    edges: [],
    history: [],
    historyIndex: -1,
    canUndo: false,
    canRedo: false,
    selectedWords: [],
    multiWordMode: false,
    adjacentMode: false,
    isDiscoveryOpen: false,
    discoveryResults: [],
    discoveryLoading: false,
    currentSearchTerm: '',
    isMushafOpen: false,
  })
  useSidePanelStore.getState().close()
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface WorkspaceStore {
  /** All saved workspace metadata (lightweight, for the list UI). */
  workspaces: WorkspaceMeta[]

  /** ID of the currently active workspace (null = unsaved scratch). */
  activeWorkspaceId: string | null

  /** True while an async operation is in progress. */
  loading: boolean

  /** Whether the workspace manager panel is open. */
  isPanelOpen: boolean
  setPanelOpen: (open: boolean) => void

  /** Load the workspace list from IndexedDB (call once on app start). */
  init: () => Promise<void>

  /** Save the current canvas as a new workspace. */
  createWorkspace: (name: string) => Promise<string>

  /** Save the current canvas into the active workspace (overwrite). */
  saveCurrentWorkspace: () => Promise<void>

  /** Switch to a different workspace (saves current first). */
  switchWorkspace: (id: string) => Promise<void>

  /** Start a blank canvas (saves current first). */
  newBlankWorkspace: () => Promise<void>

  /** Rename a workspace. */
  renameWorkspace: (id: string, name: string) => Promise<void>

  /** Delete a workspace. */
  removeWorkspace: (id: string) => Promise<void>

  /** Export the active workspace as a JSON file download. */
  exportWorkspace: (id: string) => Promise<void>

  /** Import a workspace from a JSON file and add it to the list. */
  importWorkspace: (file: File) => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  loading: false,
  isPanelOpen: false,

  setPanelOpen: (open) => set({ isPanelOpen: open }),

  // -----------------------------------------------------------------------
  init: async () => {
    const metas = await listWorkspaces()
    set({ workspaces: metas })
  },

  // -----------------------------------------------------------------------
  createWorkspace: async (name) => {
    const id = crypto.randomUUID()
    const now = Date.now()
    const meta: WorkspaceMeta = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      nodeCount: useStore.getState().nodes.length,
    }

    const data = captureCurrentState(meta)
    await saveWorkspace(data)

    set({
      workspaces: [meta, ...get().workspaces],
      activeWorkspaceId: id,
    })

    return id
  },

  // -----------------------------------------------------------------------
  saveCurrentWorkspace: async () => {
    const { activeWorkspaceId, workspaces } = get()
    if (!activeWorkspaceId) return

    const existing = workspaces.find((w) => w.id === activeWorkspaceId)
    if (!existing) return

    try {
      const data = captureCurrentState(existing)
      await saveWorkspace(data)

      // Update meta in list
      set({
        workspaces: workspaces.map((w) =>
          w.id === activeWorkspaceId ? data.meta : w,
        ),
      })
    } catch (err) {
      console.error('[WorkspaceStore] Failed to save workspace:', err)
    }
  },

  // -----------------------------------------------------------------------
  switchWorkspace: async (id) => {
    const { activeWorkspaceId } = get()
    set({ loading: true })

    try {
      // Auto-save current workspace before switching
      if (activeWorkspaceId) {
        await get().saveCurrentWorkspace()
      }

      const data = await loadWorkspace(id)
      if (!data) {
        console.error(`[WorkspaceStore] Workspace ${id} not found`)
        return
      }

      restoreState(data)
      set({ activeWorkspaceId: id })
    } finally {
      set({ loading: false })
    }
  },

  // -----------------------------------------------------------------------
  newBlankWorkspace: async () => {
    const { activeWorkspaceId } = get()

    // Auto-save current workspace before clearing
    if (activeWorkspaceId) {
      await get().saveCurrentWorkspace()
    }

    resetGraphStore()
    set({ activeWorkspaceId: null })
  },

  // -----------------------------------------------------------------------
  renameWorkspace: async (id, name) => {
    const data = await loadWorkspace(id)
    if (!data) return

    data.meta.name = name
    data.meta.updatedAt = Date.now()
    await saveWorkspace(data)

    set({
      workspaces: get().workspaces.map((w) =>
        w.id === id ? { ...w, name, updatedAt: data.meta.updatedAt } : w,
      ),
    })
  },

  // -----------------------------------------------------------------------
  removeWorkspace: async (id) => {
    await deleteWorkspace(id)

    const { activeWorkspaceId } = get()
    set({
      workspaces: get().workspaces.filter((w) => w.id !== id),
    })

    // If we deleted the active workspace, reset to blank
    if (activeWorkspaceId === id) {
      resetGraphStore()
      set({ activeWorkspaceId: null })
    }
  },

  // -----------------------------------------------------------------------
  exportWorkspace: async (id) => {
    const data = await loadWorkspace(id)
    if (!data) return

    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${data.meta.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.muddakir.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  // -----------------------------------------------------------------------
  importWorkspace: async (file) => {
    const text = await file.text()
    let data: WorkspaceData

    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('Invalid JSON file')
    }

    // Basic validation
    if (data.version !== 1 || !data.meta?.id || !Array.isArray(data.nodes)) {
      throw new Error('Invalid workspace file format')
    }

    // Assign a new ID to avoid collisions with existing workspaces
    data.meta.id = crypto.randomUUID()
    data.meta.updatedAt = Date.now()

    await saveWorkspace(data)

    set({
      workspaces: [data.meta, ...get().workspaces],
    })
  },
}))
