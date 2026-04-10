import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { MatchType } from '../../../types/quran'

interface VerseEdgeData {
  matchType?: MatchType
}

const EDGE_COLORS: Record<MatchType, string> = {
  exact:    '#10b981', // emerald-500
  lemma:    '#3b82f6', // blue-500
  root:     '#8b5cf6', // violet-500
  fuzzy:    '#f59e0b', // amber-500
  semantic: '#14b8a6', // teal-500
  none:     '#94a3b8', // slate-400
}

function VerseEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<VerseEdgeData>) {
  const matchType = data?.matchType ?? 'none'
  const color = EDGE_COLORS[matchType]

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: 2,
        }}
      />
    </>
  )
}

export default memo(VerseEdge)
