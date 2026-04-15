import { useEffect } from 'react'
import { Undo2, Redo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'

export default function UndoRedo() {
  const { t } = useTranslation('toolbar')
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

  const base = 'h-8 w-8 rounded-lg border text-xs transition-all flex items-center justify-center'
  const enabled = 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white hover:text-slate-700 hover:border-slate-300'
  const disabled = 'bg-transparent text-slate-300 border-transparent cursor-not-allowed'

  return (
    <div className="flex gap-0.5">
      <button
        onClick={undo}
        disabled={!canUndo}
        className={`${base} ${canUndo ? enabled : disabled}`}
        title={t('undo_title')}
      >
        <Undo2 size={14} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className={`${base} ${canRedo ? enabled : disabled}`}
        title={t('redo_title')}
      >
        <Redo2 size={14} />
      </button>
    </div>
  )
}
