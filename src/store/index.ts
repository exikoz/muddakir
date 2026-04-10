import { create } from 'zustand'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
} from '@xyflow/react'
import type { VerseNode, VerseEdge, Snapshot } from '../types/graph'
import type { SearchOptions, SearchResult } from '../types/quran'

interface GraphState {
  // ReactFlow state
  nodes: VerseNode[]
  edges: VerseEdge[]
  onNodesChange: OnNodesChange<VerseNode>
  onEdgesChange: OnEdgesChange<VerseEdge>
  onConnect: (connection: Connection) => void
  
  // Node management
  addNode: (node: VerseNode) => void
  deleteNode: (id: string) => void
  updateNodeData: (id: string, data: Partial<VerseNode['data']>) => void
  
  // Search state
  searchOptions: SearchOptions
  setSearchOptions: (options: SearchOptions) => void
  
  // Discovery drawer state
  isDiscoveryOpen: boolean
  discoveryResults: SearchResult[]
  currentSearchTerm: string
  lastSearchSourceId: string | null
  setDiscoveryOpen: (open: boolean) => void
  setDiscoveryResults: (results: SearchResult[]) => void
  setCurrentSearchTerm: (term: string) => void
  setLastSearchSourceId: (id: string | null) => void
  
  // History (for undo/redo)
  history: Snapshot[]
  historyIndex: number
  pushHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

export const useStore = create<GraphState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  
  searchOptions: {
    lemma: false,
    root: false,
    fuzzy: false,
    semantic: false,
  },
  
  isDiscoveryOpen: false,
  discoveryResults: [],
  currentSearchTerm: '',
  lastSearchSourceId: null,
  
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  
  // ReactFlow handlers
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) })
  },
  
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },
  
  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) })
  },
  
  // Node management
  addNode: (node) => {
    set({ nodes: [...get().nodes, node] })
    get().pushHistory()
  },
  
  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter(n => n.id !== id),
      edges: get().edges.filter(e => e.source !== id && e.target !== id),
    })
    get().pushHistory()
  },
  
  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })
  },
  
  // Search
  setSearchOptions: (options) => set({ searchOptions: options }),
  
  // Discovery drawer
  setDiscoveryOpen: (open) => set({ isDiscoveryOpen: open }),
  setDiscoveryResults: (results) => set({ discoveryResults: results }),
  setCurrentSearchTerm: (term) => set({ currentSearchTerm: term }),
  setLastSearchSourceId: (id) => set({ lastSearchSourceId: id }),
  
  // History
  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get()
    const snapshot: Snapshot = { nodes, edges, timestamp: Date.now() }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(snapshot)
    // Keep last 50 snapshots
    if (newHistory.length > 50) newHistory.shift()
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: true,
      canRedo: false,
    })
  },
  
  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    const snapshot = history[newIndex]
    set({
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: true,
    })
  },
  
  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    const snapshot = history[newIndex]
    set({
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      historyIndex: newIndex,
      canUndo: true,
      canRedo: newIndex < history.length - 1,
    })
  },
}))
