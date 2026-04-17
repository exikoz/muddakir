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
}

export interface NoteNodeData extends Record<string, unknown> {
  title: string
  text: string
  color: string
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

export interface Snapshot {
  nodes: VerseNode[]
  edges: VerseEdge[]
  timestamp: number
}
