import type { VerseNode, VerseEdge, Snapshot } from './graph'
import type { SearchOptions } from './quran'

/** Lightweight metadata shown in the workspace list (no heavy data) */
export interface WorkspaceMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  nodeCount: number
}

/** Full workspace payload stored in IndexedDB */
export interface WorkspaceData {
  version: 1
  meta: WorkspaceMeta

  // Graph state
  nodes: VerseNode[]
  edges: VerseEdge[]

  // Search & UI preferences
  searchOptions: SearchOptions
  multiWordMode: boolean
  adjacentMode: boolean
  useAutoLayout: boolean

  // Core explorer context
  explorerState: {
    nodes: [string, import('../core/verseExplorer').ExplorationNode][]
    lastSearchSourceId: string | null
    currentSearchTerm: string
  }

  // Undo/redo history for this workspace
  history: Snapshot[]
  historyIndex: number
}

/** JSON export format — same as WorkspaceData, used for file import/export */
export type WorkspaceExport = WorkspaceData
