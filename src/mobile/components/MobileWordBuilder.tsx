/**
 * Mobile word builder — floating chip bar for word selection.
 *
 * Tapping words in verse cards adds them here (same as desktop).
 * - 1 word → search uses the toolbar mode filter (lemma/root/etc.)
 * - 2+ words → adjacent regex search
 *
 * After search, opens the discovery panel with results.
 */

import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWordBuilderStore, type SelectedWord } from '../../store/wordBuilderStore'
import { useStore } from '../../store'
import { useMobileStore } from '../store/mobileStore'

export default function MobileWordBuilder() {
  const { t } = useTranslation('toolbar')
  const words = useWordBuilderStore(s => s.words)
  const removeWord = useWordBuilderStore(s => s.removeWord)
  const clear = useWordBuilderStore(s => s.clear)
  const discoveryLoading = useStore(s => s.discoveryLoading)
  const mobileSearchFromWord = useStore(s => s.mobileSearchFromWord)
  const mobileMultiWordSearch = useStore(s => s.mobileMultiWordSearch)
  const openPanel = useMobileStore(s => s.openPanel)

  if (words.length === 0) return null

  const isMulti = words.length > 1

  async function handleSearch() {
    if (words.length === 0) return

    if (isMulti) {
      await mobileMultiWordSearch()
    } else {
      const w = words[0]
      await mobileSearchFromWord(w.nodeId, w.wordIndex)
      clear()
    }

    // Open discovery panel to show results
    openPanel({ type: 'discovery' })
  }

  return (
    <div className="fixed bottom-16 left-2 right-2 z-[60] flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-lg">
      {/* Selected words */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto" dir="rtl">
        {words.map((w: SelectedWord, i: number) => (
          <span key={`${w.nodeId}-${w.wordIndex}`} className="inline-flex items-center gap-1">
            {i > 0 && (
              <span className="text-[9px] font-sans font-bold mx-0.5 text-emerald-500">→</span>
            )}
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 pl-2 pr-1 py-0.5 rounded-md text-sm font-arabic font-semibold whitespace-nowrap shrink-0">
              {w.text}
              <button onClick={() => removeWord(i)} className="p-0.5 rounded hover:bg-emerald-200 text-emerald-500">
                <X size={10} />
              </button>
            </span>
          </span>
        ))}
      </div>

      {/* Hint */}
      <span className="text-[9px] text-slate-400 whitespace-nowrap shrink-0">
        {isMulti ? t('wb_adjacent_hint', 'Adjacent') : t('wb_single_hint', 'Tap more or search')}
      </span>

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={discoveryLoading}
        className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
      >
        {discoveryLoading ? '…' : <><Search size={12} /> {t('wb_search', 'Search')}</>}
      </button>

      {/* Clear all */}
      <button onClick={clear} className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500">
        <X size={14} />
      </button>
    </div>
  )
}
