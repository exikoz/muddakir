import { useEffect } from 'react'
import { Undo2, Redo2 } from 'lucide-react'
import { useStore } from '../../store'

export default function UndoRedo() {
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const canUndo = useStore((s) => s.canUndo)
  const canRedo = useStore((s) => s.canRedo)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const base = 'h-9 w-9 rounded-full shadow-sm border text-xs transition-all flex items-center justify-center'
  const enabled = 'bg-white/80 text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800'
  const disabled = 'bg-white/40 text-slate-300 border-slate-100 cursor-not-allowed'

  return (
    <div className="flex gap-1">
      <button
        onClick={undo}
        disabled={!canUndo}
        className={`${base} ${canUndo ? enabled : disabled}`}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={16} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className={`${base} ${canRedo ? enabled : disabled}`}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 size={16} />
      </button>
    </div>
  )
}
