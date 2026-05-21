/**
 * Mobile note card — editable note inline in the thread.
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { X, Pencil } from 'lucide-react'
import { useStore } from '../../store'

interface Props {
  nodeId: string
  title: string
  text: string
  color: string
}

function MobileNoteCard({ nodeId, title, text, color }: Props) {
  const deleteNode = useStore(s => s.deleteNode)
  const updateNodeData = useStore(s => s.updateNodeData)
  const [editing, setEditing] = useState(false)
  const [localTitle, setLocalTitle] = useState(title)
  const [localText, setLocalText] = useState(text)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const save = useCallback(() => {
    updateNodeData(nodeId, {
      title: localTitle,
      text: localText,
      updatedAt: Date.now(),
    })
  }, [nodeId, localTitle, localText, updateNodeData])

  // Debounced save
  useEffect(() => {
    if (!editing) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(save, 1000)
    return () => clearTimeout(saveTimer.current)
  }, [localTitle, localText, editing, save])

  return (
    <div
      className="rounded-xl border shadow-sm overflow-hidden"
      style={{ borderColor: color, backgroundColor: `${color}10` }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: `${color}30` }}>
        {editing ? (
          <input
            value={localTitle}
            onChange={e => setLocalTitle(e.target.value)}
            className="flex-1 text-sm font-semibold bg-transparent outline-none text-slate-700"
            autoFocus
          />
        ) : (
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(!editing)} className="p-1.5 rounded text-slate-400 hover:text-slate-600">
            <Pencil size={13} />
          </button>
          <button onClick={() => deleteNode(nodeId)} className="p-1.5 rounded text-slate-400 hover:text-red-500">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="px-3 py-2">
        {editing ? (
          <textarea
            value={localText}
            onChange={e => setLocalText(e.target.value)}
            className="w-full min-h-[60px] text-sm bg-transparent outline-none resize-none text-slate-600"
            placeholder="Write your notes…"
          />
        ) : (
          <p className="text-sm text-slate-600 whitespace-pre-wrap">
            {text || <span className="text-slate-400 italic">Empty note</span>}
          </p>
        )}
      </div>
    </div>
  )
}

export default memo(MobileNoteCard)
