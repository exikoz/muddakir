import { StickyNote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'

export default function AddNoteButton() {
  const { t } = useTranslation('toolbar')
  const addNoteNode = useStore(s => s.addNoteNode)

  return (
    <button
      onClick={addNoteNode}
      className="h-8 w-8 rounded-lg border bg-slate-50 text-slate-400 border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 transition-all flex items-center justify-center"
      title={t('add_note', 'Add note')}
    >
      <StickyNote size={14} />
    </button>
  )
}
