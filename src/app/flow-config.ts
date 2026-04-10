import type { NodeTypes, EdgeTypes } from '@xyflow/react'
import VerseNode from '../features/graph/VerseNode/VerseNode'
import VerseEdge from '../features/graph/VerseEdge/VerseEdge'

export const NODE_TYPES: NodeTypes = {
  verse: VerseNode,
}

export const EDGE_TYPES: EdgeTypes = {
  verse: VerseEdge,
}
