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
    <div className="flex items-center gap-1.5">
      {/* Multi-word mode toggle */}
      <button
        onClick={() => setMultiWordMode(!multiWordMode)}
        className={`h-9 px-3 rounded-full shadow-sm border text-xs font-bold transition-all flex items-center gap-1.5 ${
          multiWordMode
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
            : 'bg-white/80 text-slate-700 border-slate-200 hover:border-slate-300'
        }`}
        title={multiWordMode ? 'Multi-word search ON — click words to select, then search' : 'Enable multi-word search'}
      >
        <Layers size={14} />
        <span>Multi</span>
      </button>

      {/* Adjacent/Free toggle — only visible when multi-word is on */}
      {multiWordMode && (
        <button
          onClick={() => setAdjacentMode(!adjacentMode)}
          className={`h-9 px-3 rounded-full shadow-sm border text-xs font-bold transition-all flex items-center gap-1.5 ${
            adjacentMode
              ? 'bg-amber-50 text-amber-700 border-amber-300'
              : 'bg-white/80 text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
          title={adjacentMode
            ? 'Adjacent mode — words must appear next to each other in order'
            : 'Free mode — words can appear anywhere in the verse'
          }
        >
          {adjacentMode ? <Link size={14} /> : <Unlink size={14} />}
          <span>{adjacentMode ? 'Adjacent' : 'Free'}</span>
        </button>
      )}

      {/* Selected words display + search/clear buttons */}
      {multiWordMode && selectedWords.length > 0 && (
        <>
          <div className="h-9 px-3 rounded-full bg-white/80 border border-slate-200 flex items-center gap-1.5 text-xs font-arabic text-slate-700 max-w-[250px] overflow-hidden" dir="rtl">
            {selectedWords.map((w, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && (
                  <span className={`text-[9px] font-sans font-bold mx-0.5 ${adjacentMode ? 'text-amber-500' : 'text-slate-400'}`}>
                    {adjacentMode ? '→' : '+'}
                  </span>
                )}
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap">
                  {w.text}
                </span>
              </span>
            ))}
          </div>
          <button
            onClick={() => executeMultiWordSearch()}
            className="h-9 px-3 rounded-full shadow-sm border text-xs font-bold transition-all flex items-center gap-1.5 bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600"
            title={adjacentMode ? 'Search for adjacent words (regex)' : 'Search for all words (AND)'}
          >
            <Search size={14} />
            <span>Search ({selectedWords.length})</span>
          </button>
          <button
            onClick={clearSelectedWords}
            className="h-9 w-9 rounded-full shadow-sm border flex items-center justify-center bg-white/80 text-slate-500 border-slate-200 hover:text-red-500 hover:border-red-300 transition-all"
            title="Clear selection"
          >
            <X size={14} />
          </button>
        </>
      )}
    </div>
  )
}
