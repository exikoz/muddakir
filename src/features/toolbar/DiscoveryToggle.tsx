import { Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { useSidePanelStore } from '../../store/sidePanelStore'

export default function DiscoveryToggle() {
  const { t } = useTranslation('toolbar')
  const isOpen = useSidePanelStore(s => s.rightPanel === 'discovery')
  const toggle = useSidePanelStore(s => s.toggle)
  const resultsCount = useStore(s => s.discoveryResults.length)

  const hasResults = resultsCount > 0

  return (
    <button
      onClick={() => toggle('discovery')}
      className={`h-8 px-2.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold relative ${
        isOpen
          ? 'bg-teal-50 text-teal-600 border-teal-300'
          : hasResults
            ? 'bg-slate-50 text-teal-600 border-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300'
            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-300'
      }`}
      title={hasResults ? t('discovery_results_title', { count: resultsCount }) : t('no_discovery_results')}
    >
      <Layers size={14} />
      <span>{t('discovery_label')}</span>
      {hasResults && (
        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-teal-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
          {resultsCount}
        </span>
      )}
    </button>
  )
}
