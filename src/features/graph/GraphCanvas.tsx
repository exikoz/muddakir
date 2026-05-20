import { useRef, useEffect } from 'react'
import { ReactFlow, Background, BackgroundVariant, Controls, useReactFlow, type ReactFlowInstance } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useStore } from '../../store'
import { useThemeStore } from '../../store/themeStore'
import { NODE_TYPES, EDGE_TYPES } from '../../app/flow-config'

function GraphCanvasInner() {
  const reactFlowInstance = useReactFlow()
  const instanceRef = useRef<ReactFlowInstance | null>(null)
  const isDark = useThemeStore(s => s.resolved === 'dark')

  useEffect(() => {
    instanceRef.current = reactFlowInstance
    // Store the instance globally for access from other components
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as Record<string, any>).__reactFlowInstance = reactFlowInstance
  }, [reactFlowInstance])

  return (
    <>
      <Background variant={BackgroundVariant.Dots} color={isDark ? '#334155' : '#d4d4d4'} gap={20} size={1.5} />
      <Controls />
    </>
  )
}

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
      deleteKeyCode={['Backspace', 'Delete']}
      minZoom={0.1}
      fitView
      className="flow-canvas"
    >
      <GraphCanvasInner />
    </ReactFlow>
  )
}
