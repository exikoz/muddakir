import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { X, GripVertical } from 'lucide-react'
import { useStore } from '../../../store'

export interface NoteNodeData extends Record<string, unknown> {
  text: string
  color: string
}

const COLOR_PALETTE = [
  { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-400', ring: 'ring-amber-300' },
  { bg: 'bg-sky-50', border: 'border-sky-200', accent: 'bg-sky-400', ring: 'ring-sky-300' },
  { bg: 'bg-rose-50', border: 'border-rose-200', accent: 'bg-rose-400', ring: 'ring-rose-300' },
  { bg: 'bg-violet-50', border: 'border-violet-200', accent: 'bg-violet-400', ring: 'ring-violet-300' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-400', ring: 'ring-emerald-300' },
  { bg: 'bg-slate-50', border: 'border-slate-200', accent: 'bg-slate-400', ring: 'ring-slate-300' },
]

function getColorClasses(color: string) {
  const idx = COLOR_PALETTE.findIndex(c => c.accent.includes(color))
  return COLOR_PALETTE[idx >= 0 ? idx : 0]
}

function NoteNode({ id, data }: NodeProps<any>) {
  const noteData = data as NoteNodeData
  const deleteNode = useStore(s => s.deleteNode)
  const updateNodeData = useStore(s => s.updateNodeData)

  const [text, setText] = useState(noteData.text ?? '')
  const [isEditing, setIsEditing] = useState(!noteData.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const colors = getColorClasses(noteData.color ?? 'amber')

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(text.length, text.length)
    }
  }, [isEditing])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    updateNodeData(id as string, { text } as any)
  }, [id, text, updateNodeData])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false)
      updateNodeData(id as string, { text } as any)
    }
  }, [id, text, updateNodeData])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [text, isEditing])

  const handleStyle = "!w-3 !h-3 !rounded-full !border-2 !border-white !shadow-sm opacity-0 group-hover:opacity-100 !transition-opacity !duration-200"

  return (
    <div className={`w-[260px] rounded-2xl ${colors.bg} ${colors.border} border shadow-md hover:shadow-lg transition-all duration-200 group relative`}>
      {/* Visible connection handles — left, right, bottom */}
      <Handle id="left-src" type="source" position={Position.Left}
        className={`${handleStyle} !bg-slate-400 hover:!bg-slate-600`} />
      <Handle id="left-tgt" type="target" position={Position.Left}
        className={`${handleStyle} !bg-slate-400 hover:!bg-slate-600`} style={{ top: '40%' }} />
      <Handle id="right-src" type="source" position={Position.Right}
        className={`${handleStyle} !bg-slate-400 hover:!bg-slate-600`} />
      <Handle id="right-tgt" type="target" position={Position.Right}
        className={`${handleStyle} !bg-slate-400 hover:!bg-slate-600`} style={{ top: '40%' }} />
      <Handle id="bottom-src" type="source" position={Position.Bottom}
        className={`${handleStyle} !bg-slate-400 hover:!bg-slate-600`} />
      <Handle id="bottom-tgt" type="target" position={Position.Bottom}
        className={`${handleStyle} !bg-slate-400 hover:!bg-slate-600`} style={{ left: '40%' }} />

      {/* Top accent strip */}
      <div className={`h-1 rounded-t-2xl ${colors.accent}`} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-1 text-slate-400">
          <GripVertical size={12} className="cursor-grab" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Note</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); deleteNode(id as string) }}
          className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Write your thoughts..."
            className={`w-full bg-white/60 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none resize-none min-h-[60px] ring-2 ${colors.ring} transition-all leading-relaxed`}
            rows={3}
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="w-full min-h-[40px] px-3 py-2 text-sm text-slate-700 leading-relaxed cursor-text rounded-xl hover:bg-white/40 transition-colors whitespace-pre-wrap"
          >
            {text || <span className="text-slate-400 italic">Click to add a note...</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(NoteNode)
