/**
 * Per-node discovery result cache.
 *
 * Every time a search is triggered from a verse node (word click or multi-word),
 * the overflow results are cached here keyed by the source node ID.
 * This lets users revisit any node's discovery results later.
 */

import { create } from 'zustand'
import type { SearchResult } from '../types/quran'

export interface CachedDiscovery {
  results: SearchResult[]
  searchTerm: string
  searchMode: string
  timestamp: number
}

interface DiscoveryCacheState {
  /** nodeId → cached discovery results */
  cache: Map<string, CachedDiscovery>

  /** The node ID whose results are currently shown in the discovery panel (null = manual/free search) */
  activeNodeId: string | null

  /** Cache results for a node */
  cacheResults: (nodeId: string, results: SearchResult[], searchTerm: string, searchMode: string) => void

  /** Load cached results for a node (returns null if not cached) */
  getCached: (nodeId: string) => CachedDiscovery | null

  /** Set which node is currently active in the discovery panel */
  setActiveNodeId: (nodeId: string | null) => void

  /** Remove cache entries for deleted nodes */
  evict: (nodeIds: string[]) => void

  /** Check if a node has cached results */
  has: (nodeId: string) => boolean

  /** Export current cache state for undo/redo snapshots */
  exportSnapshot: () => { cache: [string, CachedDiscovery][]; activeNodeId: string | null }

  /** Restore cache state from an undo/redo snapshot */
  restoreSnapshot: (snapshot: { cache: [string, CachedDiscovery][]; activeNodeId: string | null }) => void
}

export const useDiscoveryCacheStore = create<DiscoveryCacheState>((set, get) => ({
  cache: new Map(),
  activeNodeId: null,

  cacheResults: (nodeId, results, searchTerm, searchMode) => {
    const next = new Map(get().cache)
    next.set(nodeId, { results, searchTerm, searchMode, timestamp: Date.now() })
    set({ cache: next })
  },

  getCached: (nodeId) => {
    return get().cache.get(nodeId) ?? null
  },

  setActiveNodeId: (nodeId) => {
    set({ activeNodeId: nodeId })
  },

  evict: (nodeIds) => {
    const next = new Map(get().cache)
    let changed = false
    for (const id of nodeIds) {
      if (next.delete(id)) changed = true
    }
    if (changed) {
      const activeNodeId = get().activeNodeId
      set({
        cache: next,
        activeNodeId: activeNodeId && nodeIds.includes(activeNodeId) ? null : activeNodeId,
      })
    }
  },

  has: (nodeId) => {
    return get().cache.has(nodeId)
  },

  exportSnapshot: () => {
    return {
      cache: Array.from(get().cache.entries()),
      activeNodeId: get().activeNodeId,
    }
  },

  restoreSnapshot: (snapshot) => {
    set({
      cache: new Map(snapshot.cache),
      activeNodeId: snapshot.activeNodeId,
    })
  },
}))
