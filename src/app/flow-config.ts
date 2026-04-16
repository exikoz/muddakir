import type { NodeTypes, EdgeTypes } from '@xyflow/react'
import VerseNode from '../features/graph/VerseNode/VerseNode'
import NoteNode from '../features/graph/NoteNode/NoteNode'
import VerseEdge from '../features/graph/VerseEdge/VerseEdge'
import NoteEdge from '../features/graph/NoteEdge/NoteEdge'

export const NODE_TYPES = {
  verse: VerseNode as any,
  note: NoteNode as any,
} satisfies NodeTypes

export const EDGE_TYPES = {
  verse: VerseEdge as any,
  note: NoteEdge as any,
} satisfies EdgeTypes
