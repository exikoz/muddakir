import { create } from 'zustand'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
} from '@xyflow/react'
import type { VerseNode, VerseEdge, NoteNode, Snapshot, ExplorerSnapshot, DiscoveryCacheSnapshot } from '../types/graph'
import type { SearchOptions, SearchResult, Verse } from '../types/quran'
import { VerseExplorer } from '../core/verseExplorer'
import type { ExplorationNode } from '../core/verseExplorer'
import { fetchChapterVerses, fetchVerse } from '../services/quranApi'
import { searchWord, searchRegex, buildAdjacentPattern } from '../services/quranSearch'
import { useSearchProviderStore } from './searchProviderStore'
import { getLayoutedElements } from '../lib/autoLayout'
import { useSidePanelStore } from './sidePanelStore'
import { useWordBuilderStore } from './wordBuilderStore'
import { useDiscoveryCacheStore } from './discoveryCacheStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getReactFlowInstance = () => (window as Record<string, any>).__reactFlowInstance as { fitView: (opts: Record<string, unknown>) => void; getViewport: () => { zoom: number; x: number; y: number } } | undefined

// ReactFlow nodes/edges use loose typing to support mixed node types (verse + note)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEdge = any

interface GraphState {
  // Core explorer (framework-agnostic business logic)
  explorer: VerseExplorer
  
  // ReactFlow state
  nodes: AnyNode[]
  edges: AnyEdge[]
  onNodesChange: OnNodesChange<AnyNode>
  onEdgesChange: OnEdgesChange<AnyEdge>
  onConnect: (connection: Connection) => void
  
  // High-level actions (delegate to explorer)
  addVerseNode: (verseKey: string, parentId?: string, searchMeta?: { matchedTokens?: string[]; tokenTypes?: Record<string, string>; matchType?: import('../types/quran').MatchType; highlightedName?: string }) => Promise<void>
  searchFromWord: (nodeId: string, wordIndex: number) => Promise<void>
  deleteNode: (id: string) => void
  addSequentialVerse: (nodeId: string, direction: 'prev' | 'next') => Promise<void>
  addNoteNode: () => void
  
  // Note color memory
  lastNoteColor: string
  setLastNoteColor: (color: string) => void
  
  // Low-level ReactFlow operations (internal)
  _addReactFlowNode: (node: AnyNode) => void
  _addReactFlowEdge: (edge: AnyEdge) => void
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
  showNodeDiscovery: (nodeId: string) => void
  
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
  
  // History batching (internal) — prevents multiple pushHistory calls per operation
  _historyBatching: boolean
  _beginHistoryBatch: () => void
  _endHistoryBatch: () => void
  
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

  // Mobile-specific: search without auto-adding nodes (all results → discovery only)
  mobileSearchFromWord: (nodeId: string, wordIndex: number) => Promise<void>
  mobileMultiWordSearch: () => Promise<void>
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
      highlightedName: explorationNode.highlightedName,
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
  
  multiWordMode: true,
  adjacentMode: true,
  selectedWords: [],
  
  isDiscoveryOpen: false,
  discoveryResults: [],
  currentSearchTerm: '',
  discoverySearchMode: '',
  discoveryLoading: false,
  
  useAutoLayout: false, // Default OFF
  
  lastNoteColor: '#5DCAA5',
  
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  _historyBatching: false,
  
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
    const isNoteEdge =
      connection.source?.startsWith('note-') || connection.target?.startsWith('note-')
    const edge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      type: isNoteEdge ? ('note' as const) : ('verse' as const),
    }
    set({ edges: addEdge(edge, get().edges) })
  },
  
  // High-level actions (use explorer)
  addVerseNode: async (verseKey, parentId, searchMeta) => {
    const { explorer } = get()
    
    // Check if already exists - if so, focus on it
    if (explorer.hasVerse(verseKey)) {
      const existing = explorer.getNodeByVerseKey(verseKey)
      if (existing) {
        // Focus on existing node
        const reactFlowInstance = getReactFlowInstance()
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
      explorationNode.highlightedName = searchMeta.highlightedName
      explorationNode.searchTerm = explorer.getCurrentSearchTerm()
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

    // Single history push for the whole add operation
    get().pushHistory()
    
    // Center on the new node if it's a root node (no parent)
    if (!parentId) {
      setTimeout(() => {
        const reactFlowInstance = getReactFlowInstance()
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
    const { provider } = useSearchProviderStore.getState()

    // ── API provider: search at store level ──
    if (provider.name === 'api') {
      const node = explorer.getNode(nodeId)
      if (!node) return
      if (explorer.hasChildren(nodeId)) return

      const word = node.verse.words[wordIndex]
      if (!word || word.char_type_name === 'end') return

      const query = word.text_simple || word.text
      console.log(`[Store] API search for: "${query}"`)

      const results = await provider.searchWord(query, searchOptions, 50)

      if (results.length === 0) {
        get().updateNodeData(nodeId, { activeWordIndex: wordIndex, activeWordMatchType: 'none' })
        return
      }

      get()._beginHistoryBatch()

      const sorted = [...results].sort((a, b) => b.matchScore - a.matchScore)
      const existingVerseKeys = new Set(
        Array.from(explorer.getAllNodes()).map(n => n.verse.verse_key)
      )
      const newResults = sorted.filter(r => !existingVerseKeys.has(r.verse_key))
      const toAdd = newResults.slice(0, 3)
      const overflow = newResults.slice(3)

      for (const result of toAdd) {
        const verse = await fetchVerse(result.verse_key)
        if (!verse) continue
        const explorationNode = await explorer.addVerse(result.verse_key, nodeId)
        if (!explorationNode) continue

        explorationNode.matchedTokens = result.matchedTokens
        explorationNode.tokenTypes = result.tokenTypes
        explorationNode.matchType = result.matchType
        explorationNode.searchTerm = query
        explorationNode.highlightedName = result.highlightedName

        const reactFlowNode = toReactFlowNode(explorationNode, get().nodes, get().edges)
        get()._addReactFlowNode(reactFlowNode)

        const edge: VerseEdge = {
          id: `${nodeId}-${explorationNode.id}`,
          source: nodeId, sourceHandle: 'right-src',
          target: explorationNode.id, targetHandle: 'left-tgt',
          type: 'verse',
          data: { matchType: 'exact', edgeType: 'search', searchTerm: query },
        }
        get()._addReactFlowEdge(edge)
      }

      // Update parent
      node.activeWordIndex = wordIndex
      node.matchType = 'exact'
      get().updateNodeData(nodeId, { activeWordIndex: wordIndex, activeWordMatchType: 'exact' })

      explorer.setLastSearchSourceId(nodeId)
      explorer.setCurrentSearchTerm(query)

      if (toAdd.length > 0 && get().useAutoLayout) get()._applyAutoLayout()

      const allOverflow = [...overflow, ...sorted.filter(r => existingVerseKeys.has(r.verse_key))]
      set({
        discoveryResults: allOverflow.length > 0 ? allOverflow : sorted,
        isDiscoveryOpen: sorted.length > toAdd.length || allOverflow.length > 0,
        currentSearchTerm: query,
        discoverySearchMode: 'API',
      })

      const discoveryToCache = allOverflow.length > 0 ? allOverflow : sorted
      if (discoveryToCache.length > 0) {
        useDiscoveryCacheStore.getState().cacheResults(nodeId, discoveryToCache, query, 'API')
      }
      useDiscoveryCacheStore.getState().setActiveNodeId(nodeId)
      if (discoveryToCache.length > 0) useSidePanelStore.getState().open('discovery')

      get()._endHistoryBatch()

      if (toAdd.length > 0) {
        setTimeout(() => {
          const reactFlowInstance = getReactFlowInstance()
          if (reactFlowInstance) {
            reactFlowInstance.fitView({
              nodes: [{ id: nodeId }, ...toAdd.map(r => {
                const n = explorer.getNodeByVerseKey(r.verse_key)
                return n ? { id: n.id } : { id: '' }
              }).filter(n => n.id)],
              duration: 500, padding: 0.3,
            })
          }
        }, 100)
      }
      return
    }

    // ── Package provider: existing explorer flow (unchanged) ──
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
    
    // Begin batch — all nodes/edges added here produce a single history entry
    get()._beginHistoryBatch()

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
    const discoverySearchMode = searchOptions.lemma ? 'Lemma' 
      : searchOptions.root ? 'Root'
      : searchOptions.fuzzy ? 'Fuzzy'
      : searchOptions.semantic ? 'Semantic'
      : 'Exact'
    const discoveryTerm = explorer.getCurrentSearchTerm()
    
    set({
      discoveryResults: result.resultsForDiscovery,
      isDiscoveryOpen: result.shouldOpenDiscovery,
      currentSearchTerm: discoveryTerm,
      discoverySearchMode,
    })
    
    // Cache results for this node so user can revisit later
    if (result.resultsForDiscovery.length > 0) {
      useDiscoveryCacheStore.getState().cacheResults(nodeId, result.resultsForDiscovery, discoveryTerm, discoverySearchMode)
    }
    useDiscoveryCacheStore.getState().setActiveNodeId(nodeId)
    
    if (result.shouldOpenDiscovery) useSidePanelStore.getState().open('discovery')

    // End batch — single history push for the entire search operation
    get()._endHistoryBatch()
    
    // Fit view to show parent and all new children
    if (result.nodesToAdd.length > 0) {
      setTimeout(() => {
        const reactFlowInstance = getReactFlowInstance()
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
  },
  
  _addReactFlowEdge: (edge) => {
    set({ edges: [...get().edges, edge] })
  },
  
  _applyAutoLayout: () => {
    const { nodes, edges } = get()
    const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges, 'LR')
    set({ nodes: layoutedNodes as AnyNode[] })
  },
  
  deleteNode: (id) => {
    const { explorer } = get()

    // Note nodes aren't tracked by the explorer — just remove from ReactFlow
    if (id.startsWith('note-')) {
      set({
        nodes: get().nodes.filter(n => n.id !== id),
        edges: get().edges.filter(e => e.source !== id && e.target !== id),
      })
      get().pushHistory()
      return
    }
    
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
    
    // Evict discovery cache for deleted nodes
    useDiscoveryCacheStore.getState().evict(result.deletedIds)
    
    get().pushHistory()
  },

  addNoteNode: () => {
    // Place near center of current viewport
    const rf = getReactFlowInstance()
    let position = { x: 200, y: 200 }
    if (rf) {
      const viewport = rf.getViewport()
      // Convert screen center to flow coordinates
      const zoom = viewport.zoom || 1
      position = {
        x: (-viewport.x + window.innerWidth / 2) / zoom,
        y: (-viewport.y + window.innerHeight / 2) / zoom,
      }
    }

    const noteNode: NoteNode = {
      id: `note-${Date.now()}`,
      type: 'note' as const,
      position,
      data: { title: 'Note', text: '', color: get().lastNoteColor, createdAt: Date.now(), updatedAt: Date.now() },
    }

    set({ nodes: [...get().nodes, noteNode] })
    get().pushHistory()
  },
  
  setLastNoteColor: (color) => set({ lastNoteColor: color }),
  
  addSequentialVerse: async (nodeId, direction) => {
    const node = get().nodes.find(n => n.id === nodeId)
    if (!node || node.type !== 'verse') return
    
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
    const existing = get().nodes.find(n => n.type === 'verse' && n.data.verse.verse_key === targetVerseKey)
    if (existing) {
      // Focus on existing node
      const reactFlowInstance = getReactFlowInstance()
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
    
    // Register with explorer so deleteNode/undo can find it
    const { explorer } = get()
    const newNodeId = `verse-${targetVerseKey}-${Date.now()}`
    explorer.registerNode({
      id: newNodeId,
      verse,
      // Sequential verses are standalone — not children of the source node
    })
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

    // Single history push for the whole sequential add
    get().pushHistory()
    
    // Focus on the new node
    setTimeout(() => {
      const reactFlowInstance = getReactFlowInstance()
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
    const node = get().nodes.find(n => n.type === 'verse' && n.data.verse.verse_key === verseKey)
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
  
  clearSelectedWords: () => {
    set({ selectedWords: [] })
    useWordBuilderStore.getState().clear()
  },
  
  executeMultiWordSearch: async () => {
    const { selectedWords, searchOptions, adjacentMode, explorer } = get()
    if (selectedWords.length === 0) return

    // 1 word → use normal searchFromWord (respects toolbar mode filter)
    if (selectedWords.length === 1) {
      const w = selectedWords[0]
      set({ selectedWords: [] })
      useWordBuilderStore.getState().clear()
      await get().searchFromWord(w.nodeId, w.wordIndex)
      return
    }
    
    // 2+ words → adjacent regex search (or free AND search if adjacentMode is off)
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
      const { provider } = useSearchProviderStore.getState()

      if (provider.name === 'api') {
        // API provider handles both adjacent and free multi-word
        results = await provider.searchMultiWord(wordTexts, adjacentMode, searchOptions, 50)
      } else if (adjacentMode) {
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
        useWordBuilderStore.getState().clear()
        return
      }
      
      const activeMode = searchOptions.lemma ? 'lemma' 
        : searchOptions.root ? 'root'
        : searchOptions.fuzzy ? 'fuzzy'
        : searchOptions.semantic ? 'semantic'
        : 'exact' as const
      
      const sorted = [...results].sort((a, b) => b.matchScore - a.matchScore)
      const existingVerseKeys = new Set(get().nodes.filter(n => n.type === 'verse').map(n => n.data.verse.verse_key))
      const newResults = sorted.filter(r => !existingVerseKeys.has(r.verse_key))
      
      const toAdd = newResults.slice(0, 3)
      const overflow = newResults.slice(3)
      
      // Begin batch — all nodes/edges added here produce a single history entry
      get()._beginHistoryBatch()

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
        explorationNode.highlightedName = result.highlightedName
        
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
      ;explorer.setLastSearchSourceId(sourceNodeId)
      ;explorer.setCurrentSearchTerm(displayQuery)
      
      // Apply auto-layout if enabled
      if (toAdd.length > 0 && get().useAutoLayout) {
        get()._applyAutoLayout()
      }
      
      // Update discovery panel
      const allOverflow = [...overflow, ...sorted.filter(r => existingVerseKeys.has(r.verse_key))]
      const multiDiscoveryMode = activeMode === 'lemma' ? 'Lemma'
        : activeMode === 'root' ? 'Root'
        : activeMode === 'fuzzy' ? 'Fuzzy'
        : activeMode === 'semantic' ? 'Semantic'
        : 'Exact'
      
      set({
        discoveryResults: allOverflow,
        isDiscoveryOpen: allOverflow.length > 0,
        currentSearchTerm: displayQuery,
        discoverySearchMode: multiDiscoveryMode,
        discoveryLoading: false,
        selectedWords: [],
      })
      useWordBuilderStore.getState().clear()
      
      // Cache results for this node
      if (allOverflow.length > 0) {
        useDiscoveryCacheStore.getState().cacheResults(sourceNodeId, allOverflow, displayQuery, multiDiscoveryMode)
      }
      useDiscoveryCacheStore.getState().setActiveNodeId(sourceNodeId)
      
      if (allOverflow.length > 0) useSidePanelStore.getState().open('discovery')

      // End batch — single history push for the entire multi-word search
      get()._endHistoryBatch()
      
      // Fit view
      if (toAdd.length > 0) {
        setTimeout(() => {
          const reactFlowInstance = getReactFlowInstance()
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
      set({ discoveryLoading: false, _historyBatching: false })
    }
  },
  
  // Discovery drawer
  setDiscoveryOpen: (open) => set({ isDiscoveryOpen: open }),
  
  showNodeDiscovery: (nodeId) => {
    const cached = useDiscoveryCacheStore.getState().getCached(nodeId)
    if (!cached) return
    
    const { explorer } = get()
    
    set({
      discoveryResults: cached.results,
      isDiscoveryOpen: true,
      currentSearchTerm: cached.searchTerm,
      discoverySearchMode: cached.searchMode,
      discoveryLoading: false,
    })
    
    // Sync explorer search term so addVerseNode picks up the correct searchQuery for the new node
    explorer.setCurrentSearchTerm(cached.searchTerm)
    
    useDiscoveryCacheStore.getState().setActiveNodeId(nodeId)
    useSidePanelStore.getState().open('discovery')
  },
  
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
    
    // Manual search from the panel — not tied to any node
    useDiscoveryCacheStore.getState().setActiveNodeId(null)
    
    try {
      const results = await searchWord(trimmed, searchOptions, 50)
      
      // Filter out verses already on the graph
      const existingVerseKeys = new Set(get().nodes.filter(n => n.type === 'verse').map(n => n.data.verse.verse_key))
      const filtered = results.filter(r => !existingVerseKeys.has(r.verse_key))
      
      // Update the explorer's search term so addVerseNode can use it
      ;explorer.setCurrentSearchTerm(trimmed)
      
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
    // If we're inside a batch, skip — the batch-end will push once
    if (get()._historyBatching) return

    const { nodes, edges, history, historyIndex, explorer } = get()
    const explorerState: ExplorerSnapshot = explorer.exportState() as ExplorerSnapshot
    const discoveryCache: DiscoveryCacheSnapshot = useDiscoveryCacheStore.getState().exportSnapshot()
    const snapshot: Snapshot = { nodes, edges, explorerState, discoveryCache, timestamp: Date.now() }
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
    const { history, historyIndex, explorer } = get()
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    const snapshot = history[newIndex]

    // Restore explorer state so business logic stays in sync
    explorer.importState(snapshot.explorerState)

    // Restore discovery cache so per-node results survive undo
    useDiscoveryCacheStore.getState().restoreSnapshot(snapshot.discoveryCache)

    set({
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: true,
    })
  },
  
  redo: () => {
    const { history, historyIndex, explorer } = get()
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    const snapshot = history[newIndex]

    // Restore explorer state
    explorer.importState(snapshot.explorerState)

    // Restore discovery cache
    useDiscoveryCacheStore.getState().restoreSnapshot(snapshot.discoveryCache)

    set({
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      historyIndex: newIndex,
      canUndo: true,
      canRedo: newIndex < history.length - 1,
    })
  },

  _beginHistoryBatch: () => {
    set({ _historyBatching: true })
  },

  _endHistoryBatch: () => {
    set({ _historyBatching: false })
    get().pushHistory()
  },
  
  // Mushaf actions
  setMushafOpen: (open) => set({ isMushafOpen: open }),
  
  openMushaf: async (chapter) => {
    const currentChapter = chapter ?? get().mushafChapter
    set({ isMushafOpen: true })
    useSidePanelStore.getState().open('mushaf')
    
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
    useSidePanelStore.getState().open('mushaf')
    
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

  // ── Mobile-specific search: discovery-only, no auto-add ──

  mobileSearchFromWord: async (nodeId, wordIndex) => {
    const { explorer, searchOptions } = get()

    // Call explorer with autoAddCount=0 → all results go to discovery
    const result = await explorer.searchFromWord(nodeId, wordIndex, searchOptions, 0)

    if (result.nodesToAdd.length === 0 && result.resultsForDiscovery.length === 0) {
      get().updateNodeData(nodeId, {
        activeWordIndex: wordIndex,
        activeWordMatchType: 'none',
      })
      return
    }

    // Update parent node highlight
    const parentNode = explorer.getNode(nodeId)
    if (parentNode) {
      get().updateNodeData(nodeId, {
        activeWordIndex: parentNode.activeWordIndex,
        activeWordMatchType: parentNode.matchType,
      })
    }

    // ALL results go to discovery (nodesToAdd will be empty since autoAddCount=0)
    const allResults = [...result.nodesToAdd.map(n => ({
      verse_key: n.verse.verse_key,
      matchScore: 1,
      matchType: n.matchType || ('exact' as const),
      matchedTokens: n.matchedTokens || [],
      text: n.verse.text_arabic,
    })), ...result.resultsForDiscovery]

    const discoverySearchMode = searchOptions.lemma ? 'Lemma'
      : searchOptions.root ? 'Root'
      : searchOptions.fuzzy ? 'Fuzzy'
      : searchOptions.semantic ? 'Semantic'
      : 'Exact'
    const discoveryTerm = explorer.getCurrentSearchTerm()

    set({
      discoveryResults: allResults,
      isDiscoveryOpen: true,
      currentSearchTerm: discoveryTerm,
      discoverySearchMode,
      discoveryLoading: false,
    })

    if (allResults.length > 0) {
      useDiscoveryCacheStore.getState().cacheResults(nodeId, allResults, discoveryTerm, discoverySearchMode)
    }
    useDiscoveryCacheStore.getState().setActiveNodeId(nodeId)
  },

  mobileMultiWordSearch: async () => {
    const { selectedWords, searchOptions, adjacentMode, explorer } = get()
    if (selectedWords.length === 0) return

    // 1 word → use mobileSearchFromWord
    if (selectedWords.length === 1) {
      const w = selectedWords[0]
      set({ selectedWords: [] })
      useWordBuilderStore.getState().clear()
      await get().mobileSearchFromWord(w.nodeId, w.wordIndex)
      return
    }

    // 2+ words → adjacent regex or free search, but ALL results to discovery
    const sourceNodeId = selectedWords[0].nodeId
    const wordTexts = selectedWords.map(w => w.text)
    const displayQuery = wordTexts.join(' ')

    set({ discoveryLoading: true })

    try {
      let results: SearchResult[]

      if (adjacentMode) {
        const pattern = buildAdjacentPattern(wordTexts)
        results = await searchRegex(pattern, 50)
      } else {
        results = await searchWord(displayQuery, searchOptions, 50)
      }

      if (results.length === 0) {
        get().updateNodeData(sourceNodeId, { activeWordMatchType: 'none' })
        set({ discoveryLoading: false, selectedWords: [] })
        useWordBuilderStore.getState().clear()
        return
      }

      const activeMode = searchOptions.lemma ? 'lemma'
        : searchOptions.root ? 'root'
        : searchOptions.fuzzy ? 'fuzzy'
        : searchOptions.semantic ? 'semantic'
        : 'exact' as const

      const sorted = [...results].sort((a, b) => b.matchScore - a.matchScore)

      // Update parent node
      const parentNode = explorer.getNode(sourceNodeId)
      if (parentNode) {
        parentNode.matchType = activeMode
        get().updateNodeData(sourceNodeId, { activeWordMatchType: activeMode })
      }

      explorer.setLastSearchSourceId(sourceNodeId)
      explorer.setCurrentSearchTerm(displayQuery)

      const multiDiscoveryMode = activeMode === 'lemma' ? 'Lemma'
        : activeMode === 'root' ? 'Root'
        : activeMode === 'fuzzy' ? 'Fuzzy'
        : activeMode === 'semantic' ? 'Semantic'
        : 'Exact'

      set({
        discoveryResults: sorted,
        isDiscoveryOpen: true,
        currentSearchTerm: displayQuery,
        discoverySearchMode: multiDiscoveryMode,
        discoveryLoading: false,
        selectedWords: [],
      })
      useWordBuilderStore.getState().clear()

      if (sorted.length > 0) {
        useDiscoveryCacheStore.getState().cacheResults(sourceNodeId, sorted, displayQuery, multiDiscoveryMode)
      }
      useDiscoveryCacheStore.getState().setActiveNodeId(sourceNodeId)
    } catch (err) {
      console.error('[Store] Mobile multi-word search error:', err)
      set({ discoveryLoading: false })
    }
  },
}))
