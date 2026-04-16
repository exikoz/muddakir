import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react'

/**
 * A custom edge for note connections with a visible delete (×) button.
 * Uses ReactFlow's built-in useReactFlow().deleteElements() for removal.
 */
function NoteEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const { deleteElements } = useReactFlow()

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 20,
  })

  return (
    <>
      <BaseEdge
        id={id as string}
        path={edgePath}
        style={{
          stroke: '#94a3b8',
          strokeWidth: 1.5,
          strokeDasharray: '6 4',
        }}
      />
      <EdgeLabelRenderer>
        <button
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#94a3b8',
            fontSize: 12,
            lineHeight: '18px',
            textAlign: 'center',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fef2f2'
            e.currentTarget.style.color = '#ef4444'
            e.currentTarget.style.borderColor = '#fecaca'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff'
            e.currentTarget.style.color = '#94a3b8'
            e.currentTarget.style.borderColor = '#e2e8f0'
          }}
          onClick={() => deleteElements({ edges: [{ id: id as string }] })}
        >
          ×
        </button>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(NoteEdge)
