import { Layers } from 'lucide-react'
import { useStore } from '../../store'

export default function DiscoveryToggle() {
  const isOpen = useStore(s => s.isDiscoveryOpen)
  const resultsCount = useStore(s => s.discoveryResults.length)
  const setDiscoveryOpen = useStore(s => s.setDiscoveryOpen)

  const hasResults = resultsCount > 0
  const buttonColor = hasResults 
    ? 'bg-emerald-50 text-emerald-600 border-emerald-300 hover:bg-emerald-100' 
    : 'bg-white/80 text-slate-400 border-slate-200'

  return (
    <button
      onClick={() => setDiscoveryOpen(!isOpen)}
      className={`h-9 px-3 rounded-full shadow-sm border text-xs font-bold transition-all flex items-center gap-1.5 ${buttonColor}`}
      title={hasResults ? `${resultsCount} results in discovery` : 'No discovery results'}
    >
      <Layers size={14} />
      {hasResults && <span className="text-[10px]">{resultsCount}</span>}
    </button>
  )
}
