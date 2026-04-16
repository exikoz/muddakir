import { Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { useSidePanelStore } from '../../store/sidePanelStore'

export default function DiscoveryToggle() {
  const { t } = useTranslation('toolbar')
  const isOpen = useSidePanelStore(s => s.activePanel === 'discovery')
  const toggle = useSidePanelStore(s => s.toggle)
  const resultsCount = useStore(s => s.discoveryResults.length)

  const hasResults = resultsCount > 0

  return (
    <button
      onClick={() => toggle('discovery')}
      className={`h-8 w-8 rounded-lg border transition-all flex items-center justify-center relative ${
        isOpen
          ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
          : hasResults
            ? 'bg-slate-50 text-emerald-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:text-slate-600 hover:border-slate-300'
      }`}
      title={hasResults ? t('discovery_results_title', { count: resultsCount }) : t('no_discovery_results')}
    >
      <Layers size={14} />
      {hasResults && (
        <span className="absolute -top-1 -right-1 rtl:-right-auto rtl:-left-1 min-w-[14px] h-[14px] rounded-full bg-emerald-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
          {resultsCount}
        </span>
      )}
    </button>
  )
}
