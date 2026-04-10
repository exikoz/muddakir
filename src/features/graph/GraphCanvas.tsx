import { ReactFlow, Background, Controls } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useStore } from '../../store'
import { NODE_TYPES, EDGE_TYPES } from '../../app/flow-config'

export default function GraphCanvas() {
  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)
  const onNodesChange = useStore(s => s.onNodesChange)
  const onEdgesChange = useStore(s => s.onEdgesChange)
  const onConnect = useStore(s => s.onConnect)

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      fitView
      className="flow-canvas"
    >
      <Background color="#cbd5e1" gap={24} size={1} />
      <Controls />
    </ReactFlow>
  )
}
