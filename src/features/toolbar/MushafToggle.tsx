import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { useSidePanelStore } from '../../store/sidePanelStore'

export default function MushafToggle() {
  const { t } = useTranslation('toolbar')
  const isOpen = useSidePanelStore(s => s.leftPanel === 'mushaf')
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
      className={`h-8 px-2.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold ${
        isOpen
          ? 'bg-sky-50 text-sky-600 border-sky-300'
          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-300'
      }`}
      title={t('toggle_mushaf')}
    >
      <BookOpen size={14} />
      <span>{t('mushaf_label')}</span>
    </button>
  )
}
