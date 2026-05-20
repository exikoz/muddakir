import { StickyNote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'

export default function AddNoteButton() {
  const { t } = useTranslation('toolbar')
  const addNoteNode = useStore(s => s.addNoteNode)

  return (
    <button
      onClick={addNoteNode}
      className="h-8 px-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold"
      title={t('add_note', 'Add note')}
    >
      <StickyNote size={14} />
      <span>{t('note_label')}</span>
    </button>
  )
}
