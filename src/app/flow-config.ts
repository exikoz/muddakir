import type { NodeTypes, EdgeTypes } from '@xyflow/react'
import VerseNode from '../features/graph/VerseNode/VerseNode'
import VerseEdge from '../features/graph/VerseEdge/VerseEdge'

export const NODE_TYPES = {
  verse: VerseNode,
} satisfies NodeTypes

export const EDGE_TYPES = {
  verse: VerseEdge,
} satisfies EdgeTypes
