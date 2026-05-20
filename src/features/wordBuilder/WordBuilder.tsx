/**
 * Floating word builder bar.
 *
 * Appears above the graph canvas when the user has clicked one or more
 * words in verse nodes. Shows the accumulated words and a search button.
 *
 * - 1 word  → search uses the toolbar mode filter (Exact / Lemma / Root / …)
 * - 2+ words → search uses adjacent regex
 */

import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWordBuilderStore, type SelectedWord } from '../../store/wordBuilderStore'
import { useStore } from '../../store'

export default function WordBuilder() {
  const { t } = useTranslation('toolbar')
  const words = useWordBuilderStore(s => s.words)
  const removeWord = useWordBuilderStore(s => s.removeWord)
  const clear = useWordBuilderStore(s => s.clear)
  const discoveryLoading = useStore(s => s.discoveryLoading)

  const searchFromWord = useStore(s => s.searchFromWord)
  const executeMultiWordSearch = useStore(s => s.executeMultiWordSearch)

  if (words.length === 0) return null

  const isMulti = words.length > 1

  async function handleSearch() {
    if (words.length === 0) return

    if (isMulti) {
      // 2+ words → adjacent regex search via the main store
      await executeMultiWordSearch()
    } else {
      // 1 word → normal search respecting toolbar mode filter
      const w = words[0]
      await searchFromWord(w.nodeId, w.wordIndex)
      clear()
    }
  }

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-600 shadow-lg">
      {/* Selected words */}
      <div className="flex items-center gap-1" dir="rtl">
        {words.map((w: SelectedWord, i: number) => (
          <span key={`${w.nodeId}-${w.wordIndex}`} className="flex items-center gap-0.5">
            {i > 0 && (
              <span className="text-[9px] font-sans font-bold mx-0.5 text-emerald-500">
                →
              </span>
            )}
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 pl-2 pr-1 py-0.5 rounded-md text-sm font-arabic font-semibold whitespace-nowrap">
              {w.text}
              <button
                onClick={() => removeWord(i)}
                className="p-0.5 rounded hover:bg-emerald-200 text-emerald-500 hover:text-emerald-700 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          </span>
        ))}
      </div>

      {/* Hint text */}
      <span className="text-[10px] text-slate-400 whitespace-nowrap">
        {isMulti ? t('wb_adjacent_hint') : t('wb_single_hint')}
      </span>

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={discoveryLoading}
        className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-emerald-500 text-white text-[11px] font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        {discoveryLoading ? (
          '…'
        ) : (
          <>
            <Search size={12} />
            {t('wb_search')}
          </>
        )}
      </button>

      {/* Clear all */}
      <button
        onClick={clear}
        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        title={t('clear_selection')}
      >
        <X size={14} />
      </button>
    </div>
  )
}
