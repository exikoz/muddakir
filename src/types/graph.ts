import type { Node, Edge } from '@xyflow/react'
import type { Verse, MatchType } from './quran'

export interface VerseNodeData extends Record<string, unknown> {
  verse: Verse
  activeWordIndex?: number
  activeWordMatchType?: MatchType
  // Search result metadata for highlighting
  matchedTokens?: string[]
  tokenTypes?: Record<string, string>
}

export interface VerseEdgeData extends Record<string, unknown> {
  matchType?: MatchType
  edgeType?: 'search' | 'sequential-prev' | 'sequential-next'
  label?: string
}

export type VerseNode = Node<VerseNodeData, 'verse'>
export type VerseEdge = Edge<VerseEdgeData, 'verse'>

export interface Snapshot {
  nodes: VerseNode[]
  edges: VerseEdge[]
  timestamp: number
}
