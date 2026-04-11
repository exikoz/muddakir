/**
 * VerseExplorer - Framework-agnostic business logic for Quran verse exploration
 * 
 * This class manages the core functionality of exploring verses through word searches,
 * without any dependency on UI frameworks (ReactFlow, React Native, etc.)
 * 
 * Can be used by:
 * - Desktop app (ReactFlow graph visualization)
 * - Mobile app (list/card view)
 * - CLI tools
 * - Testing
 */

import { searchWord } from '../services/quranSearch'
import { fetchVerse } from '../services/quranApi'
import type { SearchOptions, SearchResult, Verse } from '../types/quran'

export interface ExplorationNode {
  id: string
  verse: Verse
  parentId?: string
  searchTerm?: string
  matchType?: string
  activeWordIndex?: number
  matchedTokens?: string[]
  tokenTypes?: Record<string, string>
}

export interface ExplorationResult {
  nodesToAdd: ExplorationNode[]
  resultsForDiscovery: SearchResult[]
  shouldOpenDiscovery: boolean
}

export interface DeleteResult {
  deletedIds: string[]
  nodesToClearHighlights: string[]
  shouldCloseDiscovery: boolean
}

/**
 * VerseExplorer manages a collection of verse nodes and their relationships
 */
export class VerseExplorer {
  private nodes: Map<string, ExplorationNode> = new Map()
  private lastSearchSourceId: string | null = null
  private currentSearchTerm: string = ''

  /**
   * Check if a verse already exists in the exploration
   */
  hasVerse(verseKey: string): boolean {
    return Array.from(this.nodes.values()).some(n => n.verse.verse_key === verseKey)
  }

  /**
   * Get node by verse key
   */
  getNodeByVerseKey(verseKey: string): ExplorationNode | null {
    return Array.from(this.nodes.values()).find(n => n.verse.verse_key === verseKey) || null
  }

  /**
   * Add a verse node to the exploration
   * Returns the node if added, or existing node if duplicate
   */
  async addVerse(verseKey: string, parentId?: string): Promise<ExplorationNode | null> {
    // Check for duplicate
    const existing = this.getNodeByVerseKey(verseKey)
    if (existing) {
      console.log(`[VerseExplorer] Verse ${verseKey} already exists`)
      return existing
    }

    // Fetch verse data
    const verse = await fetchVerse(verseKey)
    if (!verse) {
      console.error(`[VerseExplorer] Failed to fetch verse ${verseKey}`)
      return null
    }

    // Create node
    const node: ExplorationNode = {
      id: `verse-${verseKey}-${Date.now()}`,
      verse,
      parentId,
    }

    this.nodes.set(node.id, node)
    console.log(`[VerseExplorer] Added verse ${verseKey} (${node.id})`)

    return node
  }

  /**
   * Search from a word in a verse node
   * This is the core "word click" functionality
   * 
   * @param nodeId - The node containing the word
   * @param wordIndex - Index of the word in the verse
   * @param searchOptions - Search configuration (lemma, root, fuzzy, semantic)
   * @param autoAddCount - How many top results to auto-add (default: 3)
   */
  async searchFromWord(
    nodeId: string,
    wordIndex: number,
    searchOptions: SearchOptions,
    autoAddCount: number = 3
  ): Promise<ExplorationResult> {
    const node = this.nodes.get(nodeId)
    if (!node) {
      throw new Error(`[VerseExplorer] Node ${nodeId} not found`)
    }

    // Check if this node already has children (word already clicked)
    const hasChildren = this.hasChildren(nodeId)
    if (hasChildren) {
      console.log(`[VerseExplorer] Node ${nodeId} already has children, skipping search`)
      return {
        nodesToAdd: [],
        resultsForDiscovery: [],
        shouldOpenDiscovery: false,
      }
    }

    // Get the word
    const word = node.verse.words[wordIndex]
    if (!word || word.char_type_name === 'end') {
      console.log(`[VerseExplorer] Invalid word at index ${wordIndex}`)
      return {
        nodesToAdd: [],
        resultsForDiscovery: [],
        shouldOpenDiscovery: false,
      }
    }

    // Perform search
    const query = word.text_simple || word.text
    console.log(`[VerseExplorer] Searching for word: "${query}"`)

    const results = await searchWord(query, searchOptions, 50)

    if (results.length === 0) {
      console.log(`[VerseExplorer] No results found for "${query}"`)
      
      // Mark word as searched but with no results
      node.activeWordIndex = wordIndex
      node.matchType = 'none'
      
      // Store search context even with no results
      this.lastSearchSourceId = nodeId
      this.currentSearchTerm = query
      
      return {
        nodesToAdd: [],
        resultsForDiscovery: [],
        shouldOpenDiscovery: false,
      }
    }

    // Sort by score
    const sorted = [...results].sort((a, b) => b.matchScore - a.matchScore)

    // Filter out verses that already exist
    const existingVerseKeys = new Set(
      Array.from(this.nodes.values()).map(n => n.verse.verse_key)
    )
    const newResults = sorted.filter(r => !existingVerseKeys.has(r.verse_key))

    console.log(`[VerseExplorer] Found ${results.length} results, ${newResults.length} are new`)

    // Auto-add top N new results
    const toAdd = newResults.slice(0, autoAddCount)
    const overflow = newResults.slice(autoAddCount)

    const nodesToAdd: ExplorationNode[] = []

    for (const result of toAdd) {
      const verse = await fetchVerse(result.verse_key)
      if (!verse) continue

      const newNode: ExplorationNode = {
        id: `verse-${result.verse_key}-${Date.now()}-${nodesToAdd.length}`,
        verse,
        parentId: nodeId,
        searchTerm: query,
        matchType: result.matchType,
        matchedTokens: result.matchedTokens,
        tokenTypes: result.tokenTypes,
      }

      this.nodes.set(newNode.id, newNode)
      nodesToAdd.push(newNode)
    }

    // Update parent node with active word
    node.activeWordIndex = wordIndex
    node.matchType = sorted[0]?.matchType

    // Store search context
    this.lastSearchSourceId = nodeId
    this.currentSearchTerm = query

    // Include already-existing verses in discovery results
    const allOverflow = [...overflow, ...sorted.filter(r => existingVerseKeys.has(r.verse_key))]

    console.log(`[VerseExplorer] Auto-added ${nodesToAdd.length} nodes, ${allOverflow.length} in discovery`)

    return {
      nodesToAdd,
      resultsForDiscovery: allOverflow,
      shouldOpenDiscovery: allOverflow.length > 0,
    }
  }

  /**
   * Delete a node and all its descendants
   * Also handles cleanup of highlights and discovery panel
   */
  deleteNode(nodeId: string): DeleteResult {
    const node = this.nodes.get(nodeId)
    if (!node) {
      console.log(`[VerseExplorer] Node ${nodeId} not found`)
      return {
        deletedIds: [],
        nodesToClearHighlights: [],
        shouldCloseDiscovery: false,
      }
    }

    // Find all descendants recursively
    const toDelete = this.getDescendants(nodeId)
    toDelete.push(nodeId)

    console.log(`[VerseExplorer] Deleting node ${nodeId} and ${toDelete.length - 1} descendants`)

    // Delete all nodes
    toDelete.forEach(id => this.nodes.delete(id))

    // Check if parent should clear highlights
    const nodesToClearHighlights: string[] = []
    let shouldCloseDiscovery = false

    if (node.parentId) {
      const parentHasOtherChildren = this.hasChildren(node.parentId)

      if (!parentHasOtherChildren) {
        const parent = this.nodes.get(node.parentId)
        if (parent) {
          parent.activeWordIndex = undefined
          parent.matchType = undefined
          nodesToClearHighlights.push(node.parentId)

          // If this was the last search source, clear discovery
          if (node.parentId === this.lastSearchSourceId) {
            shouldCloseDiscovery = true
            this.lastSearchSourceId = null
            this.currentSearchTerm = ''
          }
        }
      }
    }

    // Check all remaining nodes - clear highlights if they have no children
    Array.from(this.nodes.values()).forEach(n => {
      if (!this.hasChildren(n.id) && (n.activeWordIndex !== undefined || n.matchType !== undefined)) {
        n.activeWordIndex = undefined
        n.matchType = undefined
        nodesToClearHighlights.push(n.id)

        // If this was the last search source, clear discovery
        if (n.id === this.lastSearchSourceId) {
          shouldCloseDiscovery = true
          this.lastSearchSourceId = null
          this.currentSearchTerm = ''
        }
      }
    })

    return {
      deletedIds: toDelete,
      nodesToClearHighlights,
      shouldCloseDiscovery,
    }
  }

  /**
   * Get all nodes in the exploration
   */
  getAllNodes(): ExplorationNode[] {
    return Array.from(this.nodes.values())
  }

  /**
   * Get a specific node by ID
   */
  getNode(id: string): ExplorationNode | undefined {
    return this.nodes.get(id)
  }

  /**
   * Get all children of a node
   */
  getChildren(nodeId: string): ExplorationNode[] {
    return Array.from(this.nodes.values()).filter(n => n.parentId === nodeId)
  }

  /**
   * Check if a node has any children
   */
  hasChildren(nodeId: string): boolean {
    return Array.from(this.nodes.values()).some(n => n.parentId === nodeId)
  }

  /**
   * Get the last search source node ID
   */
  getLastSearchSourceId(): string | null {
    return this.lastSearchSourceId
  }

  /**
   * Get the current search term
   */
  getCurrentSearchTerm(): string {
    return this.currentSearchTerm
  }

  /**
   * Clear all nodes (reset exploration)
   */
  clear(): void {
    this.nodes.clear()
    this.lastSearchSourceId = null
    this.currentSearchTerm = ''
    console.log('[VerseExplorer] Cleared all nodes')
  }

  /**
   * Get exploration statistics
   */
  getStats() {
    const nodes = Array.from(this.nodes.values())
    const rootNodes = nodes.filter(n => !n.parentId)
    const childNodes = nodes.filter(n => n.parentId)
    const nodesWithHighlights = nodes.filter(n => n.activeWordIndex !== undefined)

    return {
      totalNodes: nodes.length,
      rootNodes: rootNodes.length,
      childNodes: childNodes.length,
      nodesWithHighlights: nodesWithHighlights.length,
      hasActiveSearch: this.lastSearchSourceId !== null,
      currentSearchTerm: this.currentSearchTerm,
    }
  }

  /**
   * Export exploration state (for save/load functionality)
   */
  exportState() {
    return {
      nodes: Array.from(this.nodes.entries()),
      lastSearchSourceId: this.lastSearchSourceId,
      currentSearchTerm: this.currentSearchTerm,
    }
  }

  /**
   * Import exploration state (for save/load functionality)
   */
  importState(state: ReturnType<typeof this.exportState>) {
    this.nodes = new Map(state.nodes)
    this.lastSearchSourceId = state.lastSearchSourceId
    this.currentSearchTerm = state.currentSearchTerm
    console.log(`[VerseExplorer] Imported state with ${this.nodes.size} nodes`)
  }

  // Private helper methods

  /**
   * Get all descendants of a node recursively
   */
  private getDescendants(nodeId: string): string[] {
    const children = this.getChildren(nodeId)
    const descendants: string[] = []

    for (const child of children) {
      descendants.push(child.id)
      descendants.push(...this.getDescendants(child.id))
    }

    return descendants
  }
}
