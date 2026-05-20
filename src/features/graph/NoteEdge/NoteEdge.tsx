import { memo, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * A dashed edge for note connections.
 * Shows a small trash icon at the midpoint on hover.
 * Also supports select + Backspace/Delete.
 */
function NoteEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const { deleteElements } = useReactFlow()
  const { t } = useTranslation('graph')
  const [hovered, setHovered] = useState(false)

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
        interactionWidth={20}
        style={{
          stroke: selected ? '#60a5fa' : hovered ? '#64748b' : '#94a3b8',
          strokeWidth: selected ? 2 : hovered ? 2 : 1.5,
          strokeDasharray: '6 4',
          transition: 'stroke 150ms, stroke-width 150ms',
        }}
      />
      <EdgeLabelRenderer>
        {/* Invisible hover zone centered on the edge midpoint */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            width: 40,
            height: 40,
            pointerEvents: 'all',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <button
            className={`nodrag nopan flex items-center justify-center w-5 h-5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-200 dark:hover:border-red-700 shadow-sm transition-all ${
              hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
            onClick={() => deleteElements({ edges: [{ id: id as string }] })}
            title={t('note_remove_connection')}
          >
            <Trash2 size={10} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(NoteEdge)
