import { useState, useCallback, useRef, useEffect } from 'react'
import { X, Search, Loader2, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { useSidePanelStore } from '../../store/sidePanelStore'
import { MODE_COLORS } from '../../lib/modeColors'
import type { SearchOptions } from '../../types/quran'
import DiscoveryItem from './DiscoveryItem'

const MODE_OPTIONS: { key: keyof SearchOptions | 'exact'; label: string; dot: string }[] = [
  { key: 'exact',    label: MODE_COLORS.exact.name,    dot: MODE_COLORS.exact.dot },
  { key: 'lemma',    label: MODE_COLORS.lemma.name,    dot: MODE_COLORS.lemma.dot },
  { key: 'root',     label: MODE_COLORS.root.name,     dot: MODE_COLORS.root.dot },
  { key: 'fuzzy',    label: MODE_COLORS.fuzzy.name,    dot: MODE_COLORS.fuzzy.dot },
  { key: 'semantic', label: MODE_COLORS.semantic.name,  dot: MODE_COLORS.semantic.dot },
]

export default function DiscoveryPanel() {
  const { t } = useTranslation('discovery')
  const isOpen = useSidePanelStore(s => s.rightPanel === 'discovery')
  const closePanel = useSidePanelStore(s => s.close)
  const results = useStore(s => s.discoveryResults)
  const currentSearchTerm = useStore(s => s.currentSearchTerm)
  const discoverySearchMode = useStore(s => s.discoverySearchMode)
  const discoveryLoading = useStore(s => s.discoveryLoading)
  const searchDiscovery = useStore(s => s.searchDiscovery)
  const searchOptions = useStore(s => s.searchOptions)
  const setSearchOptions = useStore(s => s.setSearchOptions)

  const [inputValue, setInputValue] = useState('')
  const [modeOpen, setModeOpen] = useState(false)
  const modeRef = useRef<HTMLDivElement>(null)

  // Sync input with store term when it changes from a word click
  const [lastSyncedTerm, setLastSyncedTerm] = useState('')
  if (currentSearchTerm !== lastSyncedTerm) {
    setInputValue(currentSearchTerm)
    setLastSyncedTerm(currentSearchTerm)
  }

  // Close mode dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) setModeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Derive active mode label & dot from searchOptions
  const activeKey = searchOptions.lemma ? 'lemma'
    : searchOptions.root ? 'root'
    : searchOptions.fuzzy ? 'fuzzy'
    : searchOptions.semantic ? 'semantic'
    : 'exact'
  const activeModeOption = MODE_OPTIONS.find(o => o.key === activeKey)!

  function selectMode(key: keyof SearchOptions | 'exact') {
    if (key === 'exact') {
      setSearchOptions({ lemma: false, root: false, fuzzy: false, semantic: false })
    } else {
      setSearchOptions({
        lemma: key === 'lemma',
        root: key === 'root',
        fuzzy: key === 'fuzzy',
        semantic: key === 'semantic',
      })
    }
    setModeOpen(false)
  }

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (trimmed) {
      searchDiscovery(trimmed)
    }
  }, [inputValue, searchDiscovery])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (trimmed) {
        searchDiscovery(trimmed)
      }
    }
  }, [inputValue, searchDiscovery])

  if (!isOpen) return null

  return (
    <div dir="ltr" className="fixed top-12 bottom-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-semibold text-slate-800">{t('title')}</h2>
            <p className="text-xs text-slate-500">
              {discoveryLoading ? t('searching') : t('results_found', { count: results.length })}
            </p>
          </div>
          <button
            onClick={() => closePanel('discovery')}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Search input + mode selector row */}
        <div className="flex gap-2 items-center">
          <form onSubmit={handleSubmit} className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('search_placeholder')}
              className="w-full pl-9 pr-4 py-2 rounded-full border border-emerald-300 bg-white text-slate-700 text-sm font-arabic font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              dir="rtl"
            />
            {discoveryLoading ? (
              <Loader2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" />
            ) : (
              <button
                type="submit"
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <Search size={16} className="text-slate-400" />
              </button>
            )}
          </form>

          {/* Mode selector */}
          <div ref={modeRef} className="relative">
            <button
              onClick={() => setModeOpen(v => !v)}
              className="h-9 px-2.5 rounded-full shadow-sm border text-[11px] font-bold transition-all flex items-center gap-1.5 bg-white text-slate-700 border-slate-200 hover:border-slate-300 whitespace-nowrap"
              title="Search mode"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${activeModeOption.dot}`} />
              <span>{activeModeOption.label}</span>
              <ChevronDown size={11} className={`transition-transform ${modeOpen ? 'rotate-180' : ''}`} />
            </button>

            {modeOpen && (
              <div className="absolute top-11 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 min-w-[140px] z-50 flex flex-col gap-0.5">
                {MODE_OPTIONS.map(({ key, label, dot }) => {
                  const isActive = key === activeKey
                  return (
                    <button
                      key={key}
                      onClick={() => selectMode(key)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all text-left ${
                        isActive ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? dot : 'bg-slate-300'}`} />
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Info badge: which mode was used for current results */}
        {discoverySearchMode && results.length > 0 && !discoveryLoading && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${MODE_OPTIONS.find(o => o.label === discoverySearchMode)?.dot ?? 'bg-slate-400'}`} />
            {t('results_from')} <span className="font-semibold text-slate-700">{discoverySearchMode}</span> {t('search_suffix')}
            {currentSearchTerm && (
              <>
                {' '}{t('for_term')} "<span className="font-semibold text-slate-700 font-arabic" dir="rtl">{currentSearchTerm}</span>"
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {discoveryLoading ? (
          <div className="text-center py-10 text-slate-400">
            <Loader2 size={24} className="mx-auto mb-2 animate-spin text-emerald-500" />
            <p>{t('searching')}</p>
          </div>
        ) : (
          <>
            {results.map(result => (
              <DiscoveryItem key={result.verse_key} result={result} />
            ))}

            {results.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <p>{t('no_results')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
