import { Layers } from 'lucide-react'
import { useStore } from '../../store'

export default function DiscoveryToggle() {
  const isOpen = useStore(s => s.isDiscoveryOpen)
  const resultsCount = useStore(s => s.discoveryResults.length)
  const setDiscoveryOpen = useStore(s => s.setDiscoveryOpen)

  const hasResults = resultsCount > 0

  return (
    <button
      onClick={() => setDiscoveryOpen(!isOpen)}
      className={`h-8 w-8 rounded-lg border transition-all flex items-center justify-center relative ${
        isOpen
          ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
          : hasResults
            ? 'bg-slate-50 text-emerald-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:text-slate-600 hover:border-slate-300'
      }`}
      title={hasResults ? `${resultsCount} results in discovery` : 'No discovery results'}
    >
      <Layers size={14} />
      {hasResults && (
        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-emerald-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
          {resultsCount}
        </span>
      )}
    </button>
  )
}
