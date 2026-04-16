import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { useSidePanelStore } from '../../store/sidePanelStore'

export default function MushafToggle() {
  const { t } = useTranslation('toolbar')
  const isOpen = useSidePanelStore(s => s.activePanel === 'mushaf')
  const toggle = useSidePanelStore(s => s.toggle)
  const openMushaf = useStore(s => s.openMushaf)

  const handleToggle = () => {
    if (isOpen) {
      toggle('mushaf')
    } else {
      toggle('mushaf')
      openMushaf()
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`h-8 w-8 rounded-lg border transition-all flex items-center justify-center ${
        isOpen
          ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:text-slate-600 hover:border-slate-300'
      }`}
      title={t('toggle_mushaf')}
    >
      <BookOpen size={14} />
    </button>
  )
}
