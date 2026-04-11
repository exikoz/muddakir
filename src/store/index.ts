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
import type { SearchOptions, SearchResult, Verse } from '../types/quran'
import { VerseExplorer } from '../core/verseExplorer'
import type { ExplorationNode } from '../core/verseExplorer'
import { fetchChapterVerses } from '../services/quranApi'

interface GraphState {
  // Core explorer (framework-agnostic business logic)
  explorer: VerseExplorer
  
  // ReactFlow state
  nodes: VerseNode[]
  edges: VerseEdge[]
  onNodesChange: OnNodesChange<VerseNode>
  onEdgesChange: OnEdgesChange<VerseEdge>
  onConnect: (connection: Connection) => void
  
  // High-level actions (delegate to explorer)
  addVerseNode: (verseKey: string, parentId?: string) => Promise<void>
  searchFromWord: (nodeId: string, wordIndex: number) => Promise<void>
  deleteNode: (id: string) => void
  
  // Low-level ReactFlow operations (internal)
  _addReactFlowNode: (node: VerseNode) => void
  _addReactFlowEdge: (edge: VerseEdge) => void
  updateNodeData: (id: string, data: Partial<VerseNode['data']>) => void
  focusNode: (verseKey: string) => string | null
  
  // Search state
  searchOptions: SearchOptions
  setSearchOptions: (options: SearchOptions) => void
  
  // Discovery drawer state
  isDiscoveryOpen: boolean
  discoveryResults: SearchResult[]
  currentSearchTerm: string
  setDiscoveryOpen: (open: boolean) => void
  
  // History (for undo/redo)
  history: Snapshot[]
  historyIndex: number
  pushHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  
  // Mushaf panel state
  isMushafOpen: boolean
  mushafChapter: number
  mushafVerses: Verse[]
  mushafLoading: boolean
  mushafHasPrev: boolean
  mushafHasMore: boolean
  mushafHighlightVerse: string | null
  mushafFirstPage: number
  mushafLastPage: number
  setMushafOpen: (open: boolean) => void
  openMushaf: (chapter?: number) => Promise<void>
  openMushafToVerse: (verseKey: string) => Promise<void>
  loadMushafChapter: (chapter: number) => Promise<void>
  loadMushafMore: () => Promise<void>
  loadMushafPrev: () => Promise<void>
}

// Helper: Convert ExplorationNode to ReactFlow VerseNode
function toReactFlowNode(
  explorationNode: ExplorationNode, 
  existingNodes: VerseNode[],
  existingEdges: VerseEdge[]
): VerseNode {
  let position = { x: 400, y: 300 } // Default center position
  
  if (explorationNode.parentId) {
    // Position relative to parent - spread children vertically with proper spacing
    const parent = existingNodes.find(n => n.id === explorationNode.parentId)
    if (parent) {
      // Count how many children this parent already has by checking edges
      const existingChildrenOfParent = existingEdges.filter(e => e.source === explorationNode.parentId)
      
      const childIndex = existingChildrenOfParent.length
      const verticalSpacing = 350 // Increased spacing between child nodes (was 200)
      
      // For 3 children, center them around parent:
      // Child 0: parent.y - 350
      // Child 1: parent.y
      // Child 2: parent.y + 350
      const startOffset = -verticalSpacing // Start one spacing above parent
      
      position = {
        x: parent.position.x + 600, // Increased horizontal distance from parent (was 500)
        y: parent.position.y + startOffset + (childIndex * verticalSpacing)
      }
    }
  } else {
    // Root node - find empty space
    // Get all existing root nodes (nodes without parents)
    const rootNodes = existingNodes.filter(n => {
      // A node is a root if it has no incoming edges
      const hasIncomingEdges = existingEdges.some(e => e.target === n.id)
      return !hasIncomingEdges
    })
    
    if (rootNodes.length === 0) {
      // First root node - center position
      position = { x: 400, y: 300 }
    } else {
      // Find the rightmost root node and position to its right
      const rightmostRoot = rootNodes.reduce((max, node) => 
        node.position.x > max.position.x ? node : max
      , rootNodes[0])
      
      // Position new root to the right with spacing
      position = {
        x: rightmostRoot.position.x + 700, // Horizontal spacing between root nodes
        y: 300 // Keep same vertical level
      }
    }
  }
  
  return {
    id: explorationNode.id,
    type: 'verse',
    position,
    data: {
      verse: explorationNode.verse,
      activeWordIndex: explorationNode.activeWordIndex,
      activeWordMatchType: explorationNode.matchType,
      matchedTokens: explorationNode.matchedTokens,
      tokenTypes: explorationNode.tokenTypes,
    }
  }
}

export const useStore = create<GraphState>((set, get) => ({
  // Core explorer instance
  explorer: new VerseExplorer(),
  
  // Initial state
  nodes: [],
  edges: [],
  
  searchOptions: {
    lemma: true,   // ✅ Default to lemma search only
    root: false,
    fuzzy: false,
    semantic: false,
  },
  
  isDiscoveryOpen: false,
  discoveryResults: [],
  currentSearchTerm: '',
  
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  
  // Mushaf initial state
  isMushafOpen: false,
  mushafChapter: 1,
  mushafVerses: [],
  mushafLoading: false,
  mushafHasPrev: false,
  mushafHasMore: false,
  mushafHighlightVerse: null,
  mushafFirstPage: 1,
  mushafLastPage: 1,
  
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
  
  // High-level actions (use explorer)
  addVerseNode: async (verseKey, parentId) => {
    const { explorer } = get()
    
    // Check if already exists - if so, focus on it
    if (explorer.hasVerse(verseKey)) {
      const existing = explorer.getNodeByVerseKey(verseKey)
      if (existing) {
        // Focus on existing node
        const reactFlowInstance = (window as any).__reactFlowInstance
        if (reactFlowInstance) {
          reactFlowInstance.fitView({
            nodes: [{ id: existing.id }],
            duration: 800,
            padding: 0.5,
          })
        }
      }
      return
    }
    
    // Add to explorer
    const explorationNode = await explorer.addVerse(verseKey, parentId)
    if (!explorationNode) return
    
    // Convert to ReactFlow format
    const reactFlowNode = toReactFlowNode(explorationNode, get().nodes, get().edges)
    get()._addReactFlowNode(reactFlowNode)
    
    // Create edge if has parent
    if (parentId) {
      const edge: VerseEdge = {
        id: `${parentId}-${explorationNode.id}`,
        source: parentId,
        sourceHandle: 'right-src',
        target: explorationNode.id,
        targetHandle: 'left-tgt',
        type: 'verse',
        data: { matchType: explorationNode.matchType },
      }
      get()._addReactFlowEdge(edge)
    }
    
    // Center on the new node if it's a root node (no parent)
    if (!parentId) {
      setTimeout(() => {
        const reactFlowInstance = (window as any).__reactFlowInstance
        if (reactFlowInstance) {
          reactFlowInstance.fitView({
            nodes: [{ id: explorationNode.id }],
            duration: 500,
            padding: 0.5,
            maxZoom: 1, // Keep current zoom level
            minZoom: 1,
          })
        }
      }, 50) // Small delay to ensure node is rendered
    }
  },
  
  searchFromWord: async (nodeId, wordIndex) => {
    const { explorer, searchOptions } = get()
    
    // Perform search using explorer
    const result = await explorer.searchFromWord(nodeId, wordIndex, searchOptions, 3)
    
    // Handle no results case
    if (result.nodesToAdd.length === 0 && result.resultsForDiscovery.length === 0) {
      // Update node to show "no results" state
      get().updateNodeData(nodeId, {
        activeWordIndex: wordIndex,
        activeWordMatchType: 'none', // Special marker for no results
      })
      
      // Show a brief message (could be a toast notification in the future)
      console.log(`[Store] No results found for word at index ${wordIndex}`)
      
      return
    }
    
    // Add nodes to ReactFlow with proper spacing
    result.nodesToAdd.forEach((explorationNode) => {
      const reactFlowNode = toReactFlowNode(explorationNode, get().nodes, get().edges)
      get()._addReactFlowNode(reactFlowNode)
      
      // Create edge
      const edge: VerseEdge = {
        id: `${nodeId}-${explorationNode.id}`,
        source: nodeId,
        sourceHandle: 'right-src',
        target: explorationNode.id,
        targetHandle: 'left-tgt',
        type: 'verse',
        data: { matchType: explorationNode.matchType },
      }
      get()._addReactFlowEdge(edge)
    })
    
    // Update parent node data
    const parentNode = explorer.getNode(nodeId)
    if (parentNode) {
      get().updateNodeData(nodeId, {
        activeWordIndex: parentNode.activeWordIndex,
        activeWordMatchType: parentNode.matchType,
      })
    }
    
    // Update discovery panel
    set({
      discoveryResults: result.resultsForDiscovery,
      isDiscoveryOpen: result.shouldOpenDiscovery,
      currentSearchTerm: explorer.getCurrentSearchTerm(),
    })
    
    // Fit view to show parent and all new children
    if (result.nodesToAdd.length > 0) {
      setTimeout(() => {
        const reactFlowInstance = (window as any).__reactFlowInstance
        if (reactFlowInstance) {
          const nodeIds = [nodeId, ...result.nodesToAdd.map(n => n.id)]
          reactFlowInstance.fitView({
            nodes: nodeIds.map(id => ({ id })),
            duration: 500,
            padding: 0.3,
          })
        }
      }, 100)
    }
  },
  
  // Low-level ReactFlow operations
  _addReactFlowNode: (node) => {
    set({ nodes: [...get().nodes, node] })
    get().pushHistory()
  },
  
  _addReactFlowEdge: (edge) => {
    set({ edges: [...get().edges, edge] })
  },
  
  deleteNode: (id) => {
    const { explorer } = get()
    
    // Check if this is a root node (no parent)
    const nodeToDelete = explorer.getNode(id)
    const isRootNode = nodeToDelete && !nodeToDelete.parentId
    
    // Delete from explorer (handles all business logic)
    const result = explorer.deleteNode(id)
    
    // Update ReactFlow state
    set({
      nodes: get().nodes.filter(n => !result.deletedIds.includes(n.id)),
      edges: get().edges.filter(e => 
        !result.deletedIds.includes(e.source) && 
        !result.deletedIds.includes(e.target)
      ),
    })
    
    // Clear highlights on affected nodes
    result.nodesToClearHighlights.forEach(nodeId => {
      get().updateNodeData(nodeId, {
        activeWordIndex: undefined,
        activeWordMatchType: undefined,
      })
    })
    
    // Close discovery panel if needed OR if deleting a root node
    if (result.shouldCloseDiscovery || isRootNode) {
      set({
        discoveryResults: [],
        isDiscoveryOpen: false,
        currentSearchTerm: '',
      })
    }
    
    get().pushHistory()
  },
  
  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })
  },
  
  focusNode: (verseKey) => {
    const node = get().nodes.find(n => n.data.verse.verse_key === verseKey)
    return node?.id || null
  },
  
  // Search
  setSearchOptions: (options) => set({ searchOptions: options }),
  
  // Discovery drawer
  setDiscoveryOpen: (open) => set({ isDiscoveryOpen: open }),
  
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
  
  // Mushaf actions
  setMushafOpen: (open) => set({ isMushafOpen: open }),
  
  openMushaf: async (chapter) => {
    const currentChapter = chapter ?? get().mushafChapter
    set({ isMushafOpen: true })
    
    // Only load if chapter changed or no verses loaded
    if (currentChapter !== get().mushafChapter || get().mushafVerses.length === 0) {
      await get().loadMushafChapter(currentChapter)
    }
  },
  
  openMushafToVerse: async (verseKey) => {
    const [surahStr, ayahStr] = verseKey.split(':')
    const surah = parseInt(surahStr, 10)
    const ayah = parseInt(ayahStr, 10)
    
    set({ isMushafOpen: true, mushafHighlightVerse: null })
    
    // If already on this chapter and verse is loaded, just highlight and scroll
    if (surah === get().mushafChapter) {
      const existingVerse = get().mushafVerses.find(v => v.verse_key === verseKey)
      if (existingVerse) {
        set({ mushafHighlightVerse: verseKey })
        return
      }
    }
    
    // Calculate which page contains this verse (50 verses per page)
    const targetPage = Math.ceil(ayah / 50)
    
    set({
      mushafChapter: surah,
      mushafVerses: [],
      mushafHasPrev: targetPage > 1,
      mushafFirstPage: targetPage,
      mushafLastPage: targetPage,
      mushafLoading: true,
    })
    
    const { verses, hasMore } = await fetchChapterVerses(surah, targetPage)
    set({
      mushafVerses: verses,
      mushafHasMore: hasMore,
      mushafLoading: false,
      mushafHighlightVerse: verseKey,
    })
    
    // Prefetch adjacent pages for smooth navigation
    const prefetchPromises = []
    if (targetPage > 1) {
      prefetchPromises.push(fetchChapterVerses(surah, targetPage - 1).catch(() => {}))
    }
    if (hasMore) {
      prefetchPromises.push(fetchChapterVerses(surah, targetPage + 1).catch(() => {}))
    }
    if (prefetchPromises.length > 0) {
      Promise.all(prefetchPromises).catch(() => {}) // Silent prefetch
    }
  },
  
  loadMushafChapter: async (chapter) => {
    set({
      mushafChapter: chapter,
      mushafVerses: [],
      mushafLoading: true,
      mushafHasPrev: false,
      mushafFirstPage: 1,
      mushafLastPage: 1,
    })
    
    const { verses, hasMore } = await fetchChapterVerses(chapter, 1)
    set({
      mushafVerses: verses,
      mushafHasMore: hasMore,
      mushafLoading: false,
    })
    
    // Prefetch next page for smooth scrolling
    if (hasMore) {
      fetchChapterVerses(chapter, 2).catch(() => {}) // Silent prefetch
    }
  },
  
  loadMushafMore: async () => {
    if (get().mushafLoading || !get().mushafHasMore) return
    
    set({ mushafLoading: true })
    const nextPage = get().mushafLastPage + 1
    const chapter = get().mushafChapter
    const { verses, hasMore } = await fetchChapterVerses(chapter, nextPage)
    
    set({
      mushafVerses: [...get().mushafVerses, ...verses],
      mushafHasMore: hasMore,
      mushafLastPage: nextPage,
      mushafLoading: false,
    })
    
    // Prefetch next page
    if (hasMore) {
      fetchChapterVerses(chapter, nextPage + 1).catch(() => {})
    }
  },
  
  loadMushafPrev: async () => {
    if (get().mushafLoading || !get().mushafHasPrev) return
    
    set({ mushafLoading: true })
    const prevPage = get().mushafFirstPage - 1
    const chapter = get().mushafChapter
    const { verses } = await fetchChapterVerses(chapter, prevPage)
    
    set({
      mushafVerses: [...verses, ...get().mushafVerses],
      mushafHasPrev: prevPage > 1,
      mushafFirstPage: prevPage,
      mushafLoading: false,
    })
    
    // Prefetch previous page
    if (prevPage > 1) {
      fetchChapterVerses(chapter, prevPage - 1).catch(() => {})
    }
  },
}))
