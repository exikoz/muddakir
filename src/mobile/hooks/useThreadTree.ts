/**
 * useThreadTree — builds a renderable tree from the flat nodes/edges arrays.
 *
 * Converts the ReactFlow graph into a nested thread structure suitable
 * for the mobile vertical timeline view.
 */

import { useMemo } from 'react'
import { useStore } from '../../store'
import { useDiscoveryCacheStore } from '../../store/discoveryCacheStore'
import type { VerseEdge } from '../../types/graph'
import type { SearchResult, MatchType } from '../../types/quran'

// ── Public types ──

export interface ThreadNode {
  id: string
  type: 'verse' | 'note'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  /** Search groups branching from this node */
  searchGroups: ThreadGroup[]
  /** Sequential neighbors (prev/next verse) */
  sequentialPrev?: ThreadNode
  sequentialNext?: ThreadNode
}

export interface ThreadGroup {
  searchTerm: string
  matchType: MatchType
  sourceNodeId: string
  /** Nodes that were added to the workspace from this search */
  addedNodes: ThreadNode[]
  /** Remaining results from discovery cache (not yet added) */
  pendingResults: SearchResult[]
}

export interface ThreadRoot {
  node: ThreadNode
}

// ── Hook ──

export function useThreadTree(): ThreadRoot[] {
  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)
  const cache = useDiscoveryCacheStore(s => s.cache)

  return useMemo(() => {
    if (nodes.length === 0) return []

    // Index edges by source
    const edgesBySource = new Map<string, VerseEdge[]>()
    const incomingSearchTargets = new Set<string>()

    for (const edge of edges) {
      const edgeType = edge.data?.edgeType
      if (!edgeType) continue

      const list = edgesBySource.get(edge.source) || []
      list.push(edge)
      edgesBySource.set(edge.source, list)

      if (edgeType === 'search') {
        incomingSearchTargets.add(edge.target)
      }
    }

    // Build a ThreadNode for a given node ID (recursive)
    const visited = new Set<string>()

    function buildThreadNode(nodeId: string): ThreadNode | null {
      if (visited.has(nodeId)) return null
      visited.add(nodeId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const node = nodes.find((n: any) => n.id === nodeId)
      if (!node) return null

      const outEdges = edgesBySource.get(nodeId) || []

      // Group search edges by searchTerm
      const searchEdgesByTerm = new Map<string, VerseEdge[]>()
      let _seqPrevEdge: VerseEdge | undefined
      let seqNextEdge: VerseEdge | undefined

      for (const edge of outEdges) {
        const edgeType = edge.data?.edgeType
        if (edgeType === 'search') {
          const term = edge.data?.searchTerm || '?'
          const list = searchEdgesByTerm.get(term) || []
          list.push(edge)
          searchEdgesByTerm.set(term, list)
        } else if (edgeType === 'sequential-next') {
          seqNextEdge = edge
        } else if (edgeType === 'sequential-prev') {
          // For prev edges, the source is the new (earlier) node
          // and target is the current node — but we stored it as
          // source=current, target=new in some cases. Check both.
          _seqPrevEdge = edge
        }
      }

      // Also check incoming edges for sequential-prev (source=newNode, target=thisNode)
      for (const edge of edges) {
        if (edge.target === nodeId && edge.data?.edgeType === 'sequential-prev' && !visited.has(edge.source)) {
          _seqPrevEdge = edge
        }
      }

      // Build search groups
      const searchGroups: ThreadGroup[] = []
      for (const [term, termEdges] of searchEdgesByTerm) {
        const matchType = termEdges[0]?.data?.matchType || 'exact'
        const addedNodes: ThreadNode[] = []

        for (const edge of termEdges) {
          const child = buildThreadNode(edge.target)
          if (child) addedNodes.push(child)
        }

        // Get pending results from discovery cache
        const cached = cache.get(nodeId)
        const pendingResults = cached && cached.searchTerm === term
          ? cached.results
          : []

        searchGroups.push({
          searchTerm: term,
          matchType,
          sourceNodeId: nodeId,
          addedNodes,
          pendingResults,
        })
      }

      // Build sequential neighbors
      let sequentialNext: ThreadNode | undefined
      if (seqNextEdge) {
        sequentialNext = buildThreadNode(seqNextEdge.target) ?? undefined
      }

      return {
        id: nodeId,
        type: node.type || 'verse',
        data: node.data,
        searchGroups,
        sequentialNext,
      }
    }

    // Find root nodes: verse nodes with no incoming search edges
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rootNodeIds = nodes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((n: any) => !incomingSearchTargets.has(n.id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((n: any) => n.id as string)

    const roots: ThreadRoot[] = []
    for (const id of rootNodeIds) {
      const threadNode = buildThreadNode(id)
      if (threadNode) {
        roots.push({ node: threadNode })
      }
    }

    return roots
  }, [nodes, edges, cache])
}
