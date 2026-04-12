import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { MatchType } from '../../../types/quran'
import type { VerseEdgeData } from '../../../types/graph'

const EDGE_COLORS: Record<MatchType, string> = {
  exact:    '#10b981', // emerald-500
  lemma:    '#3b82f6', // blue-500
  root:     '#8b5cf6', // violet-500
  fuzzy:    '#f59e0b', // amber-500
  semantic: '#14b8a6', // teal-500
  none:     '#94a3b8', // slate-400
}

const SEQUENTIAL_COLORS = {
  prev: '#14b8a6', // teal-500
  next: '#a855f7', // purple-500
}

function VerseEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<any>) {
  const edgeData = data as VerseEdgeData | undefined
  const edgeType = edgeData?.edgeType ?? 'search'
  const matchType: MatchType = edgeData?.matchType ?? 'none'
  
  // Sequential edges use different styling
  const isSequential = edgeType === 'sequential-prev' || edgeType === 'sequential-next'
  const color = isSequential 
    ? (edgeType === 'sequential-prev' ? SEQUENTIAL_COLORS.prev : SEQUENTIAL_COLORS.next)
    : EDGE_COLORS[matchType]
  
  // Use smooth step path for all edges
  const [edgePath, labelX, labelY] = getSmoothStepPath({ 
    sourceX, 
    sourceY, 
    sourcePosition, 
    targetX, 
    targetY, 
    targetPosition, 
    borderRadius: 16 
  })

  return (
    <>
      <BaseEdge
        id={id as string}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: isSequential ? 3 : 2,
          strokeDasharray: isSequential ? '10 5' : 'none', // Dashed line for sequential
        }}
      />
      {isSequential && edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className={`text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm ${
              edgeType === 'sequential-prev' ? 'bg-teal-500' : 'bg-purple-500'
            }`}>
              {edgeData.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default memo(VerseEdge)
