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
import { fetchChapterVerses, fetchVerse } from '../services/quranApi'
import { searchWord, searchRegex, buildAdjacentPattern } from '../services/quranSearch'
import { getLayoutedElements } from '../lib/autoLayout'

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
  addVerseNode: (verseKey: string, parentId?: string, searchMeta?: { matchedTokens?: string[]; tokenTypes?: Record<string, string>; matchType?: import('../types/quran').MatchType }) => Promise<void>
  searchFromWord: (nodeId: string, wordIndex: number) => Promise<void>
  deleteNode: (id: string) => void
  addSequentialVerse: (nodeId: string, direction: 'prev' | 'next') => Promise<void>
  
  // Low-level ReactFlow operations (internal)
  _addReactFlowNode: (node: VerseNode) => void
  _addReactFlowEdge: (edge: VerseEdge) => void
  _applyAutoLayout: () => void
  updateNodeData: (id: string, data: Partial<VerseNode['data']>) => void
  focusNode: (verseKey: string) => string | null
  
  // Search state
  searchOptions: SearchOptions
  setSearchOptions: (options: SearchOptions) => void
  
  // Multi-word search mode
  multiWordMode: boolean
  adjacentMode: boolean
  setMultiWordMode: (on: boolean) => void
  setAdjacentMode: (on: boolean) => void
  selectedWords: { nodeId: string; wordIndex: number; text: string }[]
  addSelectedWord: (nodeId: string, wordIndex: number, text: string) => void
  removeSelectedWord: (wordIndex: number) => void
  clearSelectedWords: () => void
  executeMultiWordSearch: () => Promise<void>
  
  // Discovery drawer state
  isDiscoveryOpen: boolean
  discoveryResults: SearchResult[]
  currentSearchTerm: string
  discoverySearchMode: string
  discoveryLoading: boolean
  setDiscoveryOpen: (open: boolean) => void
  searchDiscovery: (query: string) => Promise<void>
  
  // Debug settings
  useAutoLayout: boolean
  setUseAutoLayout: (use: boolean) => void
  
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
      const verticalSpacing = 350
      const startOffset = -verticalSpacing
      
      position = {
        x: parent.position.x + 600,
        y: parent.position.y + startOffset + (childIndex * verticalSpacing)
      }
    }
  } else {
    // Root node - find empty space
    const rootNodes = existingNodes.filter(n => {
      const hasIncomingEdges = existingEdges.some(e => e.target === n.id)
      return !hasIncomingEdges
    })
    
    if (rootNodes.length === 0) {
      position = { x: 400, y: 300 }
    } else {
      const rightmostRoot = rootNodes.reduce((max, node) => 
        node.position.x > max.position.x ? node : max
      , rootNodes[0])
      
      position = {
        x: rightmostRoot.position.x + 700,
        y: 300
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
      matchType: explorationNode.matchType, // frozen: mode active when this node was created
      matchedTokens: explorationNode.matchedTokens,
      tokenTypes: explorationNode.tokenTypes,
      searchQuery: explorationNode.searchTerm,
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
    lemma: true,
    root: false,
    fuzzy: false,
    semantic: false,
  },
  
  multiWordMode: false,
  adjacentMode: false,
  selectedWords: [],
  
  isDiscoveryOpen: false,
  discoveryResults: [],
  currentSearchTerm: '',
  discoverySearchMode: '',
  discoveryLoading: false,
  
  useAutoLayout: false, // Default OFF
  
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
  addVerseNode: async (verseKey, parentId, searchMeta) => {
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
    
    // Apply search metadata from discovery result if provided
    if (searchMeta) {
      explorationNode.matchedTokens = searchMeta.matchedTokens
      explorationNode.tokenTypes = searchMeta.tokenTypes
      explorationNode.matchType = searchMeta.matchType
    }
    
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
        data: { matchType: explorationNode.matchType, edgeType: 'search', searchTerm: explorer.getCurrentSearchTerm() },
      }
      get()._addReactFlowEdge(edge)
    }
    
    // Apply auto-layout (only if enabled)
    if (get().useAutoLayout) {
      get()._applyAutoLayout()
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
            maxZoom: 1,
            minZoom: 1,
          })
        }
      }, 50)
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
    // Edge color should reflect the search mode used, not the per-result engine classification
    const parentNode = explorer.getNode(nodeId)
    const searchMode = parentNode?.matchType // activeMode — set on the parent by the explorer
    const searchTerm = explorer.getCurrentSearchTerm()

    result.nodesToAdd.forEach((explorationNode) => {
      const reactFlowNode = toReactFlowNode(explorationNode, get().nodes, get().edges)
      get()._addReactFlowNode(reactFlowNode)
      
      // Create edge — use the search mode for edge color, not the result's matchType
      const edge: VerseEdge = {
        id: `${nodeId}-${explorationNode.id}`,
        source: nodeId,
        sourceHandle: 'right-src',
        target: explorationNode.id,
        targetHandle: 'left-tgt',
        type: 'verse',
        data: { matchType: searchMode, edgeType: 'search', searchTerm },
      }
      get()._addReactFlowEdge(edge)
    })
    
    // Apply auto-layout after adding all nodes (only if enabled)
    if (result.nodesToAdd.length > 0 && get().useAutoLayout) {
      get()._applyAutoLayout()
    }
    
    // Update parent node data
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
      discoverySearchMode: searchOptions.lemma ? 'Lemma' 
        : searchOptions.root ? 'Root'
        : searchOptions.fuzzy ? 'Fuzzy'
        : searchOptions.semantic ? 'Semantic'
        : 'Exact',
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
  
  _applyAutoLayout: () => {
    const { nodes, edges } = get()
    const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges, 'LR')
    // Cast back to VerseNode[] since getLayoutedElements preserves node structure
    set({ nodes: layoutedNodes as VerseNode[] })
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
  
  addSequentialVerse: async (nodeId, direction) => {
    const node = get().nodes.find(n => n.id === nodeId)
    if (!node) return
    
    const currentVerseKey = node.data.verse.verse_key
    const [surahStr, ayahStr] = currentVerseKey.split(':')
    const surah = parseInt(surahStr, 10)
    const ayah = parseInt(ayahStr, 10)
    
    // Calculate target verse
    let targetVerseKey: string
    if (direction === 'prev') {
      if (ayah <= 1) return // Can't go before first verse
      targetVerseKey = `${surah}:${ayah - 1}`
    } else {
      // For 'next', we'll try to fetch and handle if it doesn't exist
      targetVerseKey = `${surah}:${ayah + 1}`
    }
    
    // Check if verse already exists
    const existing = get().nodes.find(n => n.data.verse.verse_key === targetVerseKey)
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
      return
    }
    
    // Fetch the verse
    const verse = await fetchVerse(targetVerseKey)
    if (!verse) return // Verse doesn't exist (end of surah)
    
    // Create new node
    const newNodeId = `verse-${targetVerseKey}-${Date.now()}`
    const position = direction === 'prev'
      ? { x: node.position.x, y: node.position.y - 400 }
      : { x: node.position.x, y: node.position.y + 400 }
    
    const newNode: VerseNode = {
      id: newNodeId,
      type: 'verse',
      position,
      data: {
        verse,
      }
    }
    
    get()._addReactFlowNode(newNode)
    
    // Create sequential edge
    const edge: VerseEdge = {
      id: `${nodeId}-${newNodeId}-${direction}`,
      source: direction === 'prev' ? newNodeId : nodeId,
      sourceHandle: 'bottom-src',
      target: direction === 'prev' ? nodeId : newNodeId,
      targetHandle: 'top-tgt',
      type: 'verse',
      data: { 
        edgeType: direction === 'prev' ? 'sequential-prev' : 'sequential-next',
        label: direction === 'prev' ? `← ${targetVerseKey}` : `${targetVerseKey} →`
      },
    }
    
    get()._addReactFlowEdge(edge)
    
    // Apply auto-layout if enabled
    if (get().useAutoLayout) {
      get()._applyAutoLayout()
    }
    
    // Focus on the new node
    setTimeout(() => {
      const reactFlowInstance = (window as any).__reactFlowInstance
      if (reactFlowInstance) {
        reactFlowInstance.fitView({
          nodes: [{ id: nodeId }, { id: newNodeId }],
          duration: 500,
          padding: 0.3,
        })
      }
    }, 100)
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
  
  // Multi-word search mode
  setMultiWordMode: (on) => set({ multiWordMode: on, selectedWords: [], adjacentMode: false }),
  setAdjacentMode: (on) => set({ adjacentMode: on }),
  
  addSelectedWord: (nodeId, wordIndex, text) => {
    const { selectedWords } = get()
    // Don't add duplicates
    if (selectedWords.some(w => w.nodeId === nodeId && w.wordIndex === wordIndex)) return
    set({ selectedWords: [...selectedWords, { nodeId, wordIndex, text }] })
  },
  
  removeSelectedWord: (index) => {
    set({ selectedWords: get().selectedWords.filter((_, i) => i !== index) })
  },
  
  clearSelectedWords: () => set({ selectedWords: [] }),
  
  executeMultiWordSearch: async () => {
    const { selectedWords, searchOptions, adjacentMode, explorer } = get()
    if (selectedWords.length === 0) return
    
    // Use the first selected word's node as the source
    const sourceNodeId = selectedWords[0].nodeId
    const wordTexts = selectedWords.map(w => w.text)
    
    // Build query based on mode
    // Adjacent: regex pattern word1\s+word2 — finds words next to each other
    // Free: space-joined words — AND logic, words can be anywhere in the verse
    const displayQuery = wordTexts.join(' ')
    
    // Check if source node already has children
    if (explorer.hasChildren(sourceNodeId)) {
      console.log('[Store] Source node already has children, skipping multi-word search')
      return
    }
    
    set({ discoveryLoading: true })
    
    try {
      let results: import('../types/quran').SearchResult[]
      
      if (adjacentMode) {
        // Regex search for adjacent words
        const pattern = buildAdjacentPattern(wordTexts)
        console.log(`[Store] Adjacent search pattern: "${pattern}"`)
        results = await searchRegex(pattern, 50)
      } else {
        // Free multi-word search (AND logic)
        results = await searchWord(displayQuery, searchOptions, 50)
      }
      
      if (results.length === 0) {
        get().updateNodeData(sourceNodeId, {
          activeWordMatchType: 'none',
        })
        set({ discoveryLoading: false, selectedWords: [] })
        return
      }
      
      const activeMode = searchOptions.lemma ? 'lemma' 
        : searchOptions.root ? 'root'
        : searchOptions.fuzzy ? 'fuzzy'
        : searchOptions.semantic ? 'semantic'
        : 'exact' as const
      
      const sorted = [...results].sort((a, b) => b.matchScore - a.matchScore)
      const existingVerseKeys = new Set(get().nodes.map(n => n.data.verse.verse_key))
      const newResults = sorted.filter(r => !existingVerseKeys.has(r.verse_key))
      
      const toAdd = newResults.slice(0, 3)
      const overflow = newResults.slice(3)
      
      // Add top results as nodes
      for (const result of toAdd) {
        const verse = await fetchVerse(result.verse_key)
        if (!verse) continue
        
        const explorationNode = await explorer.addVerse(result.verse_key, sourceNodeId)
        if (!explorationNode) continue
        
        explorationNode.matchedTokens = result.matchedTokens
        explorationNode.tokenTypes = result.tokenTypes
        explorationNode.matchType = result.matchType
        explorationNode.searchTerm = displayQuery
        
        const reactFlowNode = toReactFlowNode(explorationNode, get().nodes, get().edges)
        get()._addReactFlowNode(reactFlowNode)
        
        const edge: VerseEdge = {
          id: `${sourceNodeId}-${explorationNode.id}`,
          source: sourceNodeId,
          sourceHandle: 'right-src',
          target: explorationNode.id,
          targetHandle: 'left-tgt',
          type: 'verse',
          data: { matchType: activeMode, edgeType: 'search', searchTerm: displayQuery },
        }
        get()._addReactFlowEdge(edge)
      }
      
      // Update parent node
      const parentNode = explorer.getNode(sourceNodeId)
      if (parentNode) {
        parentNode.matchType = activeMode
        get().updateNodeData(sourceNodeId, {
          activeWordMatchType: activeMode,
        })
      }
      
      // Update explorer search context
      ;(explorer as any).lastSearchSourceId = sourceNodeId
      ;(explorer as any).currentSearchTerm = displayQuery
      
      // Apply auto-layout if enabled
      if (toAdd.length > 0 && get().useAutoLayout) {
        get()._applyAutoLayout()
      }
      
      // Update discovery panel
      const allOverflow = [...overflow, ...sorted.filter(r => existingVerseKeys.has(r.verse_key))]
      set({
        discoveryResults: allOverflow,
        isDiscoveryOpen: allOverflow.length > 0,
        currentSearchTerm: displayQuery,
        discoverySearchMode: activeMode === 'lemma' ? 'Lemma'
          : activeMode === 'root' ? 'Root'
          : activeMode === 'fuzzy' ? 'Fuzzy'
          : activeMode === 'semantic' ? 'Semantic'
          : 'Exact',
        discoveryLoading: false,
        selectedWords: [],
      })
      
      // Fit view
      if (toAdd.length > 0) {
        setTimeout(() => {
          const reactFlowInstance = (window as any).__reactFlowInstance
          if (reactFlowInstance) {
            reactFlowInstance.fitView({
              nodes: [{ id: sourceNodeId }],
              duration: 500,
              padding: 0.3,
            })
          }
        }, 100)
      }
    } catch (err) {
      console.error('[Store] Multi-word search error:', err)
      set({ discoveryLoading: false })
    }
  },
  
  // Discovery drawer
  setDiscoveryOpen: (open) => set({ isDiscoveryOpen: open }),
  
  searchDiscovery: async (query) => {
    const trimmed = query.trim()
    if (!trimmed) return
    
    const { searchOptions, explorer } = get()
    
    // Determine the active mode label
    const activeMode = searchOptions.lemma ? 'Lemma' 
      : searchOptions.root ? 'Root'
      : searchOptions.fuzzy ? 'Fuzzy'
      : searchOptions.semantic ? 'Semantic'
      : 'Exact'
    
    set({ discoveryLoading: true, currentSearchTerm: trimmed, discoverySearchMode: activeMode })
    
    try {
      const results = await searchWord(trimmed, searchOptions, 50)
      
      // Filter out verses already on the graph
      const existingVerseKeys = new Set(get().nodes.map(n => n.data.verse.verse_key))
      const filtered = results.filter(r => !existingVerseKeys.has(r.verse_key))
      
      // Update the explorer's search term so addVerseNode can use it
      ;(explorer as any).currentSearchTerm = trimmed
      
      // Update edges that came from the last search source to reflect the new search term
      const lastSourceId = explorer.getLastSearchSourceId()
      if (lastSourceId) {
        set({
          edges: get().edges.map(e =>
            e.source === lastSourceId && e.data?.edgeType === 'search'
              ? { ...e, data: { ...e.data, searchTerm: trimmed } }
              : e
          ),
        })
      }
      
      set({
        discoveryResults: filtered,
        discoveryLoading: false,
      })
    } catch (err) {
      console.error('[Store] Discovery search error:', err)
      set({ discoveryLoading: false })
    }
  },
  
  // Debug settings
  setUseAutoLayout: (use) => set({ useAutoLayout: use }),
  
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
