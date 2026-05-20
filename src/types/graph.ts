import type { Node, Edge } from '@xyflow/react'
import type { Verse, MatchType } from './quran'

export interface VerseNodeData extends Record<string, unknown> {
  verse: Verse
  activeWordIndex?: number
  activeWordMatchType?: MatchType
  // Frozen match type for this result node — set at search time, never changes
  matchType?: MatchType
  // Search result metadata for highlighting
  matchedTokens?: string[]
  tokenTypes?: Record<string, string>
  // Frozen search query — the query that produced this node, never changes
  searchQuery?: string
  // API search: raw Uthmani HTML with <em> tags for highlighting
  highlightedName?: string
}

export interface NoteNodeData extends Record<string, unknown> {
  title: string
  text: string
  color: string
  createdAt: number
  updatedAt: number
  width?: number
  height?: number
}

export interface VerseEdgeData extends Record<string, unknown> {
  matchType?: MatchType
  edgeType?: 'search' | 'sequential-prev' | 'sequential-next'
  label?: string
  /** The Arabic word that was clicked to trigger this search edge */
  searchTerm?: string
}

export type VerseNode = Node<VerseNodeData, 'verse'>
export type NoteNode = Node<NoteNodeData, 'note'>
export type VerseEdge = Edge<VerseEdgeData, 'verse'>

export interface ExplorerSnapshot {
  nodes: [string, import('../core/verseExplorer').ExplorationNode][]
  lastSearchSourceId: string | null
  currentSearchTerm: string
}

export interface DiscoveryCacheSnapshot {
  cache: [string, import('../store/discoveryCacheStore').CachedDiscovery][]
  activeNodeId: string | null
}

export interface Snapshot {
  nodes: VerseNode[]
  edges: VerseEdge[]
  explorerState: ExplorerSnapshot
  discoveryCache: DiscoveryCacheSnapshot
  timestamp: number
}
