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
          ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-600'
          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-300 dark:hover:border-sky-600'
      }`}
      title={t('toggle_mushaf')}
    >
      <BookOpen size={14} />
      <span>{t('mushaf_label')}</span>
    </button>
  )
}
