import { useState, useRef, useEffect } from 'react'
import { Search, Loader2, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { useSidePanelStore } from '../../store/sidePanelStore'
import { MODE_COLORS } from '../../lib/modeColors'
import type { SearchOptions } from '../../types/quran'

/** Matches verse key patterns like "2:255", "114:3" */
const VERSE_KEY_RE = /^\d{1,3}:\d{1,3}$/

const MODE_OPTIONS: {
  key: keyof SearchOptions | 'exact'
  label: string
  dot: string
  active: string
}[] = [
  { key: 'exact',    label: MODE_COLORS.exact.name,    dot: MODE_COLORS.exact.dot,    active: MODE_COLORS.exact.active },
  { key: 'lemma',    label: MODE_COLORS.lemma.name,    dot: MODE_COLORS.lemma.dot,    active: MODE_COLORS.lemma.active },
  { key: 'root',     label: MODE_COLORS.root.name,     dot: MODE_COLORS.root.dot,     active: MODE_COLORS.root.active },
  { key: 'fuzzy',    label: MODE_COLORS.fuzzy.name,    dot: MODE_COLORS.fuzzy.dot,    active: MODE_COLORS.fuzzy.active },
  { key: 'semantic', label: MODE_COLORS.semantic.name, dot: MODE_COLORS.semantic.dot, active: MODE_COLORS.semantic.active },
]

export default function UnifiedSearch() {
  const { t } = useTranslation('toolbar')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [modeOpen, setModeOpen] = useState(false)
  const modeRef = useRef<HTMLDivElement>(null)

  const addVerseNode = useStore(s => s.addVerseNode)
  const discoveryLoading = useStore(s => s.discoveryLoading)
  const searchDiscovery = useStore(s => s.searchDiscovery)
  const searchOptions = useStore(s => s.searchOptions)
  const setSearchOptions = useStore(s => s.setSearchOptions)
  const openPanel = useSidePanelStore(s => s.open)

  const trimmed = input.trim()
  const isVerseKey = VERSE_KEY_RE.test(trimmed)
  const busy = loading || discoveryLoading

  // Derive active mode label & dot
  const activeMode = MODE_OPTIONS.find(
    o => o.key !== 'exact' && searchOptions[o.key as keyof SearchOptions]
  ) ?? MODE_OPTIONS[0]

  // Close dropdown on outside click
  useEffect(() => {
    if (!modeOpen) return
    const handler = (e: MouseEvent) => {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) setModeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [modeOpen])

  function selectMode(key: string) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trimmed) return

    if (isVerseKey) {
      setLoading(true)
      try {
        await addVerseNode(trimmed)
        setInput('')
      } catch (err) {
        console.error('[UnifiedSearch] verse error:', err)
        alert(t('failed_to_fetch_verse'))
      } finally {
        setLoading(false)
      }
    } else {
      openPanel('discovery')
      await searchDiscovery(trimmed)
    }
  }

  return (
    <div ref={modeRef} className="relative flex items-center">
      <form
        onSubmit={handleSubmit}
        className="flex items-center h-8 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 transition-all focus-within:border-emerald-400 dark:focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-700"
      >
        {/* Search icon */}
        <div className="pl-2.5 text-slate-400">
          {busy
            ? <Loader2 size={13} className="animate-spin text-emerald-500" />
            : <Search size={13} />}
        </div>

        {/* Text input */}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('search_placeholder')}
          className="bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 w-36 text-xs px-1.5"
        />

        {/* Mode filter pill — only relevant for text search */}
        {!isVerseKey && (
          <button
            type="button"
            onClick={() => setModeOpen(v => !v)}
            className="flex items-center gap-1 h-6 px-2 mr-1 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[10px] font-semibold text-slate-500 dark:text-slate-400 transition-colors shrink-0"
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeMode.dot}`} />
            <span>{t('by_mode', { mode: activeMode.label })}</span>
            <ChevronDown size={10} className={`text-slate-400 transition-transform ${modeOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={busy || !trimmed}
          className="h-full px-2.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-l border-slate-200 dark:border-slate-600"
        >
          {busy ? '…' : isVerseKey ? t('go') : t('find')}
        </button>
      </form>

      {/* Mode dropdown */}
      {modeOpen && (
        <div className="absolute top-10 left-0 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-600 p-1.5 min-w-[150px] z-50 flex flex-col gap-0.5">
          {MODE_OPTIONS.map(({ key, label, dot, active }) => {
            const isOn = key === 'exact'
              ? !searchOptions.lemma && !searchOptions.root && !searchOptions.fuzzy && !searchOptions.semantic
              : !!searchOptions[key as keyof SearchOptions]
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectMode(key)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all text-left ${
                  isOn ? active + ' border' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOn ? dot : 'bg-slate-300'}`} />
                {label}
                {isOn && <span className="ml-auto text-[9px] opacity-60">✓</span>}
              </button>
            )
          })}

          <div className="border-t border-slate-100 mt-0.5 pt-0.5">
            <p className="text-[9px] text-slate-400 px-2.5 py-0.5 leading-tight">
              {t('one_mode_at_a_time')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
