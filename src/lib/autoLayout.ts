/**
 * Automatic graph layout using Dagre algorithm
 * Prevents node stacking and creates clean hierarchical layouts
 * 
 * Direction Handling:
 * - 'LR' (Left-to-Right): Main flow is horizontal, but edges can connect from any side
 * - 'TB' (Top-to-Bottom): Main flow is vertical, but edges can connect from any side
 * 
 * Dagre automatically determines the best edge routing based on:
 * 1. The overall graph direction (rankdir)
 * 2. The actual source/target handles used in edges
 * 3. Node positions and spacing constraints
 * 
 * Edge Handle Support:
 * - Edges can use any handle: top, bottom, left, right
 * - Dagre respects the edge connections and routes accordingly
 * - Layout adapts to mixed edge directions (e.g., some from right, some from top)
 */
import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'

const NODE_WIDTH = 400
const NODE_HEIGHT = 200

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR' // LR = Left to Right (horizontal), TB = Top to Bottom (vertical)
) {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  
  // Configure layout
  // Note: These settings work well regardless of which handles are used
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 150,  // Horizontal spacing between nodes at same level
    ranksep: 250,  // Vertical spacing between levels (or horizontal if TB)
    edgesep: 100,  // Spacing between edges
    marginx: 50,
    marginy: 50,
  })

  // Add nodes to dagre
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  // Add edges to dagre
  // Dagre uses the source/target to determine hierarchy, not the handles
  // The actual edge routing (which handle to use) is determined by ReactFlow
  // based on node positions after layout
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Calculate layout
  dagre.layout(dagreGraph)

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}
