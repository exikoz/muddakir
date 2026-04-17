import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { PenLine, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../../store'

export interface NoteNodeData extends Record<string, unknown> {
  title: string
  text: string
  color: string
}

const HANDLE_STYLE = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  border: '2px solid #e8e0d4',
  background: '#d4c9b8',
} as const

function NoteNode({ id, data, selected }: NodeProps) {
  const { t } = useTranslation('graph')
  const noteData = data as NoteNodeData
  const deleteNode = useStore(s => s.deleteNode)
  const updateNodeData = useStore(s => s.updateNodeData)

  const [title, setTitle] = useState(noteData.title ?? t('note_default_title'))
  const [text, setText] = useState(noteData.text ?? '')
  const [editingTitle, setEditingTitle] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const commitTitle = useCallback(() => {
    setEditingTitle(false)
    updateNodeData(id as string, { title: title || t('note_default_title') } as never)
  }, [id, title, updateNodeData])

  const commitText = useCallback(() => {
    updateNodeData(id as string, { text } as never)
  }, [id, text, updateNodeData])

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur()
  }, [])

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur()
  }, [])

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingTitle])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [text])

  return (
    <div
      className={`w-[240px] rounded-xl relative group transition-all duration-200 ${
        selected ? 'ring-2 ring-amber-200' : ''
      }`}
      style={{
        background: '#FFFDF5',
        border: '1px solid #e8e0d4',
        boxShadow: selected
          ? '0 4px 12px rgba(180,160,120,0.15)'
          : '0 2px 8px rgba(180,160,120,0.10)',
      }}
    >
      {/* ── Handles ── */}
      <Handle id="top-tgt" type="target" position={Position.Top} style={HANDLE_STYLE} />
      <Handle id="bottom-src" type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle id="bottom-tgt" type="target" position={Position.Bottom}
        style={{ ...HANDLE_STYLE, left: '35%' }} />
      <Handle id="left-tgt-1" type="target" position={Position.Left}
        style={{ ...HANDLE_STYLE, top: '35%' }} />
      <Handle id="left-tgt-2" type="target" position={Position.Left}
        style={{ ...HANDLE_STYLE, top: '65%' }} />
      <Handle id="right-src-1" type="source" position={Position.Right}
        style={{ ...HANDLE_STYLE, top: '35%' }} />
      <Handle id="right-src-2" type="source" position={Position.Right}
        style={{ ...HANDLE_STYLE, top: '65%' }} />

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 cursor-grab active:cursor-grabbing"
        style={{ borderBottom: '1px solid #efe8db' }}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <PenLine
            size={10}
            className="nodrag shrink-0 text-[#b8a88a] hover:text-[#8a7a60] cursor-pointer transition-colors"
            onClick={() => setEditingTitle(true)}
          />
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={handleTitleKeyDown}
              maxLength={30}
              className="nodrag max-w-[140px] text-[12px] uppercase tracking-wider bg-white/70 outline-none rounded px-1 py-0.5 ring-1 ring-[#d4c9b8]"
              style={{ color: '#5a4d38', fontWeight: 500 }}
              placeholder={t('note_title_placeholder')}
            />
          ) : (
            <span
              onDoubleClick={() => setEditingTitle(true)}
              className="text-[12px] uppercase tracking-wider truncate max-w-[140px] select-none cursor-text"
              style={{ color: '#6b5c45', fontWeight: 500 }}
              title={t('note_rename_hint')}
            >
              {title || t('note_default_title')}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); deleteNode(id as string) }}
          className="nodrag p-0.5 rounded text-[#c4b89a] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X size={10} />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="px-3 py-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={handleTextKeyDown}
          placeholder={t('note_body_placeholder')}
          className="nodrag w-full bg-transparent text-[12px] placeholder:text-[#c4b89a] outline-none resize-none min-h-[40px] focus:ring-1 focus:ring-[#d4c9b8] rounded px-0.5 py-0.5 transition-shadow"
          style={{ color: '#6b5c45', lineHeight: 1.7, fontWeight: 400 }}
          rows={2}
        />
      </div>

      {/* ── Folded corner ── */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, transparent 50%, #efe8db 50%)',
          borderRadius: '0 0 0.75rem 0',
        }}
      />
    </div>
  )
}

export default memo(NoteNode)
