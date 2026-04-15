import { Layers, Search, X, Link, Unlink } from 'lucide-react'
import { useStore } from '../../store'

export default function MultiWordToggle() {
  const multiWordMode = useStore(s => s.multiWordMode)
  const adjacentMode = useStore(s => s.adjacentMode)
  const setMultiWordMode = useStore(s => s.setMultiWordMode)
  const setAdjacentMode = useStore(s => s.setAdjacentMode)
  const selectedWords = useStore(s => s.selectedWords)
  const clearSelectedWords = useStore(s => s.clearSelectedWords)
  const executeMultiWordSearch = useStore(s => s.executeMultiWordSearch)

  return (
    <div className="flex items-center gap-1">
      {/* Multi-word mode toggle */}
      <button
        onClick={() => setMultiWordMode(!multiWordMode)}
        className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
          multiWordMode
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white'
        }`}
        title={multiWordMode ? 'Multi-word search ON — click words to select, then search' : 'Enable multi-word search'}
      >
        <Layers size={13} />
        <span>Multi</span>
      </button>

      {/* Adjacent/Free toggle — only visible when multi-word is on */}
      {multiWordMode && (
        <button
          onClick={() => setAdjacentMode(!adjacentMode)}
          className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
            adjacentMode
              ? 'bg-amber-50 text-amber-700 border-amber-300'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white'
          }`}
          title={adjacentMode
            ? 'Adjacent mode — words must appear next to each other in order'
            : 'Free mode — words can appear anywhere in the verse'
          }
        >
          {adjacentMode ? <Link size={13} /> : <Unlink size={13} />}
          <span>{adjacentMode ? 'Adj' : 'Free'}</span>
        </button>
      )}

      {/* Selected words display + search/clear buttons */}
      {multiWordMode && selectedWords.length > 0 && (
        <>
          <div className="h-8 px-2 rounded-lg bg-white border border-slate-200 flex items-center gap-1 text-xs font-arabic text-slate-700 max-w-[200px] overflow-hidden" dir="rtl">
            {selectedWords.map((w, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && (
                  <span className={`text-[8px] font-sans font-bold mx-0.5 ${adjacentMode ? 'text-amber-500' : 'text-slate-400'}`}>
                    {adjacentMode ? '→' : '+'}
                  </span>
                )}
                <span className="bg-emerald-100 text-emerald-800 px-1 py-px rounded text-[10px] font-semibold whitespace-nowrap">
                  {w.text}
                </span>
              </span>
            ))}
          </div>
          <button
            onClick={() => executeMultiWordSearch()}
            className="h-8 px-2.5 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1 bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600"
            title={adjacentMode ? 'Search for adjacent words (regex)' : 'Search for all words (AND)'}
          >
            <Search size={13} />
            <span>{selectedWords.length}</span>
          </button>
          <button
            onClick={clearSelectedWords}
            className="h-8 w-8 rounded-lg border flex items-center justify-center bg-slate-50 text-slate-400 border-slate-200 hover:text-red-500 hover:border-red-300 transition-all"
            title="Clear selection"
          >
            <X size={13} />
          </button>
        </>
      )}
    </div>
  )
}
