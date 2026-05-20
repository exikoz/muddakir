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

  const base = 'h-8 px-2 rounded-lg border text-[11px] font-semibold transition-all flex items-center justify-center gap-1'
  const enabled = 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'
  const disabled = 'bg-transparent text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed'

  return (
    <div className="flex gap-0.5">
      <button
        onClick={undo}
        disabled={!canUndo}
        className={`${base} ${canUndo ? enabled : disabled}`}
        title={t('undo_title')}
      >
        <Undo2 size={14} />
        <span>{t('undo_label')}</span>
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className={`${base} ${canRedo ? enabled : disabled}`}
        title={t('redo_title')}
      >
        <Redo2 size={14} />
        <span>{t('redo_label')}</span>
      </button>
    </div>
  )
}
