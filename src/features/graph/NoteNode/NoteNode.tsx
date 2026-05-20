import { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { PenLine, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../../store'
import { useThemeStore } from '../../../store/themeStore'
import { rtlLanguages, type SupportedLanguage } from '../../../i18n/config'

export interface NoteNodeData extends Record<string, unknown> {
  title: string
  text: string
  color: string
  createdAt: number
  updatedAt: number
  width?: number
  height?: number
}

/* ── Smart relative time ─────────────────────────────────────────────────── */

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.345, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
]

function formatRelative(ts: number | undefined, locale: string): { label: string; full: string } {
  if (!ts) return { label: '—', full: '' }

  const date = new Date(ts)
  const now = new Date()

  const full = date.toLocaleString(locale, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    return { label: time, full }
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' })
  let diff = (ts - now.getTime()) / 1000

  for (const division of DIVISIONS) {
    if (Math.abs(diff) < division.amount) {
      return { label: rtf.format(Math.round(diff), division.unit), full }
    }
    diff /= division.amount
  }

  return { label: full, full }
}

/* ── Handle style ────────────────────────────────────────────────────────── */

const HANDLE_STYLE = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  border: '2px solid rgb(217 199 163)',
  background: '#d4c9b8',
} as const

const MIN_WIDTH = 200
const MIN_HEIGHT = 140
const DEFAULT_WIDTH = 240

/* ── Component ───────────────────────────────────────────────────────────── */

function NoteNode({ id, data, selected }: NodeProps) {
  const { t, i18n } = useTranslation('graph')
  const noteData = data as NoteNodeData
  const deleteNode = useStore(s => s.deleteNode)
  const updateNodeData = useStore(s => s.updateNodeData)
  const isDark = useThemeStore(s => s.resolved === 'dark')

  const isRtl = rtlLanguages.includes(i18n.language as SupportedLanguage)
  const locale = i18n.language

  const [title, setTitle] = useState(noteData.title ?? t('note_default_title'))
  const [text, setText] = useState(noteData.text ?? '')
  const [editingTitle, setEditingTitle] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Track what's been committed so we can skip no-op updates
  const committedTitle = useRef(noteData.title)
  const committedText = useRef(noteData.text)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Debounced text commit ─────────────────────────────────────────────── */

  const flushText = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    const current = text
    if (current === committedText.current) return
    committedText.current = current
    updateNodeData(id as string, { text: current, updatedAt: Date.now() } as never)
  }, [id, text, updateNodeData])

  // Debounce on every keystroke — flush after 1s of inactivity
  useEffect(() => {
    if (text === committedText.current) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(flushText, 1000)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [text, flushText])

  // Also flush immediately on blur
  const handleTextBlur = useCallback(() => { flushText() }, [flushText])

  /* ── Title commit (only on blur / Enter) ───────────────────────────────── */

  const commitTitle = useCallback(() => {
    setEditingTitle(false)
    const final = title || t('note_default_title')
    if (final === committedTitle.current) return
    committedTitle.current = final
    updateNodeData(id as string, { title: final, updatedAt: Date.now() } as never)
  }, [id, title, updateNodeData, t])

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

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [text])

  /* ── Resize handler ────────────────────────────────────────────────────── */

  const handleResize = useCallback((_event: unknown, params: { width: number; height: number }) => {
    updateNodeData(id as string, { width: params.width, height: params.height } as never)
  }, [id, updateNodeData])

  /* ── Timestamps ────────────────────────────────────────────────────────── */

  const created = useMemo(() => formatRelative(noteData.createdAt, locale), [noteData.createdAt, locale])
  const updated = useMemo(() => formatRelative(noteData.updatedAt, locale), [noteData.updatedAt, locale])
  const wasEdited = noteData.updatedAt && noteData.createdAt && noteData.updatedAt - noteData.createdAt > 1000

  const nodeWidth = noteData.width ?? DEFAULT_WIDTH

  return (
    <div
      className={`rounded-xl relative group transition-all duration-200 ${
        selected ? 'ring-2 ring-amber-200 dark:ring-amber-700' : ''
      }`}
      style={{
        width: nodeWidth,
        height: noteData.height ?? 'auto',
        background: isDark ? '#2a2520' : '#FFFCF5',
        border: `1px solid ${isDark ? '#4a3f33' : '#e8e0d4'}`,
        boxShadow: selected
          ? isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(180,160,120,0.15)'
          : isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(180,160,120,0.10)',
      }}
    >
      {/* ── Resizer ── */}
      <NodeResizer
        isVisible={!!selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        onResize={handleResize}
        lineStyle={{ borderColor: 'rgb(217 199 163)' }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#d4c9b8',
          border: '2px solid rgb(217 199 163)',
        }}
      />

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
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b border-amber-200 dark:border-amber-800/60 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <PenLine
            size={10}
            className="nodrag shrink-0 text-amber-700 dark:text-amber-500 hover:text-amber-900 dark:hover:text-amber-300 cursor-pointer transition-colors"
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
              className="nodrag max-w-[140px] text-[11px] uppercase tracking-wider bg-white/70 dark:bg-slate-800/70 outline-none rounded px-1 py-0.5 ring-1 ring-amber-300 dark:ring-amber-600 text-amber-900 dark:text-amber-200 font-medium"
              placeholder={t('note_title_placeholder')}
            />
          ) : (
            <span
              onDoubleClick={() => setEditingTitle(true)}
              className="text-[11px] uppercase tracking-wider truncate max-w-[140px] select-none cursor-text text-amber-700 dark:text-amber-400 font-medium"
              title={t('note_rename_hint')}
            >
              {title || t('note_label')}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); deleteNode(id as string) }}
          className="nodrag p-0.5 rounded text-amber-400 dark:text-amber-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X size={10} />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="px-3 py-2 flex-1 overflow-auto">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
          dir={isRtl ? 'rtl' : 'ltr'}
          placeholder={t('note_body_placeholder')}
          className="nodrag w-full bg-transparent text-[12px] placeholder:text-amber-300 dark:placeholder:text-amber-700 outline-none resize-none min-h-[40px] focus:ring-1 focus:ring-amber-200 dark:focus:ring-amber-700 rounded px-0.5 py-0.5 transition-shadow"
          style={{ color: isDark ? '#c4a882' : '#6b5c45', lineHeight: 1.7 }}
          rows={2}
        />
      </div>

      {/* ── Footer: timestamps ── */}
      <div className="flex justify-between px-3 py-1 border-t border-amber-200 dark:border-amber-800/60 select-none">
        <span
          className="text-[10px] text-amber-700/40 dark:text-amber-500/40"
          title={created.full}
        >
          {created.label}
        </span>
        {wasEdited && (
          <span
            className="text-[10px] text-amber-700/40 dark:text-amber-500/40 italic"
            title={updated.full}
          >
            {t('note_edited')} {updated.label}
          </span>
        )}
      </div>

      {/* ── Folded corner ── */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, transparent 50%, #3d3428 50%)'
            : 'linear-gradient(135deg, transparent 50%, #efe8db 50%)',
          borderRadius: '0 0 0.75rem 0',
        }}
      />
    </div>
  )
}

export default memo(NoteNode)
