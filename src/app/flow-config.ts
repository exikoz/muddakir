import type { NodeTypes, EdgeTypes } from '@xyflow/react'
import VerseNode from '../features/graph/VerseNode/VerseNode'
import NoteNode from '../features/graph/NoteNode/NoteNode'
import VerseEdge from '../features/graph/VerseEdge/VerseEdge'
import NoteEdge from '../features/graph/NoteEdge/NoteEdge'

// ReactFlow requires component references typed as NodeTypes/EdgeTypes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asNodeType = <T,>(c: T) => c as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asEdgeType = <T,>(c: T) => c as any

export const NODE_TYPES = {
  verse: asNodeType(VerseNode),
  note: asNodeType(NoteNode),
} satisfies NodeTypes

export const EDGE_TYPES = {
  verse: asEdgeType(VerseEdge),
  note: asEdgeType(NoteEdge),
} satisfies EdgeTypes
