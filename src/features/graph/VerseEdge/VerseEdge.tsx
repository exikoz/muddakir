import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { MatchType } from '../../../types/quran'
import type { VerseEdgeData } from '../../../types/graph'
import { getEdgeColor } from '../../../lib/modeColors'

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
  const isSearch = edgeType === 'search'
  const color = isSequential 
    ? (edgeType === 'sequential-prev' ? SEQUENTIAL_COLORS.prev : SEQUENTIAL_COLORS.next)
    : getEdgeColor(matchType) // Use dynamic color based on match type
  
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

  const searchTerm = edgeData?.searchTerm

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
        data-edge-type={edgeType}
        data-match-type={matchType}
      />
      {/* Search edge label — shows the clicked word */}
      {isSearch && searchTerm && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              className="font-arabic text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm bg-white border border-slate-200 text-slate-700"
              dir="rtl"
            >
              {searchTerm}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
      {/* Sequential edge label */}
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
