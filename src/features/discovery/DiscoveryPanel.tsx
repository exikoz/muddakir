import { X, Search } from 'lucide-react'
import { useStore } from '../../store'
import DiscoveryItem from './DiscoveryItem'

export default function DiscoveryPanel() {
  const isOpen = useStore(s => s.isDiscoveryOpen)
  const results = useStore(s => s.discoveryResults)
  const currentSearchTerm = useStore(s => s.currentSearchTerm)
  const setDiscoveryOpen = useStore(s => s.setDiscoveryOpen)

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-semibold text-slate-800">Deep Discovery</h2>
            <p className="text-xs text-slate-500">{results.length} related verses found</p>
          </div>
          <button
            onClick={() => setDiscoveryOpen(false)}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {currentSearchTerm && (
          <div className="relative">
            <input
              type="text"
              value={currentSearchTerm}
              readOnly
              className="w-full pl-9 pr-4 py-2 rounded-full border border-amber-400 bg-white text-slate-700 text-sm font-arabic font-medium"
              dir="rtl"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {results.map(result => (
          <DiscoveryItem key={result.verse_key} result={result} />
        ))}

        {results.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <p>No extra results to display based on your last search.</p>
          </div>
        )}
      </div>
    </div>
  )
}
