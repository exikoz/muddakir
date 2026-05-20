/**
 * Mobile top toolbar — search input with mode selector.
 * Compact version of the desktop UnifiedSearch + toolbar.
 */

import { useState, useCallback } from 'react'
import { Search, Loader2, Undo2, Redo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { MODE_COLORS } from '../../lib/modeColors'
import type { SearchOptions } from '../../types/quran'

const MODES: { key: keyof SearchOptions | 'exact'; dot: string }[] = [
  { key: 'exact', dot: MODE_COLORS.exact.dot },
  { key: 'lemma', dot: MODE_COLORS.lemma.dot },
  { key: 'root', dot: MODE_COLORS.root.dot },
]

export default function MobileToolbar() {
  const { t } = useTranslation('toolbar')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const addVerseNode = useStore(s => s.addVerseNode)
  const searchOptions = useStore(s => s.searchOptions)
  const setSearchOptions = useStore(s => s.setSearchOptions)
  const undo = useStore(s => s.undo)
  const redo = useStore(s => s.redo)
  const canUndo = useStore(s => s.canUndo)
  const canRedo = useStore(s => s.canRedo)

  const activeMode = searchOptions.lemma ? 'lemma'
    : searchOptions.root ? 'root'
    : searchOptions.fuzzy ? 'fuzzy'
    : searchOptions.semantic ? 'semantic'
    : 'exact'

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const val = input.trim()
    if (!val) return
    setLoading(true)
    try {
      // If it looks like a verse key (e.g. 2:255), seed it
      if (/^\d+:\d+$/.test(val)) {
        await addVerseNode(val)
      } else {
        // Text search via discovery
        const store = useStore.getState()
        await store.searchDiscovery(val)
      }
      setInput('')
    } finally {
      setLoading(false)
    }
  }, [input, addVerseNode])

  const cycleMode = useCallback(() => {
    const idx = MODES.findIndex(m => m.key === activeMode)
    const next = MODES[(idx + 1) % MODES.length]
    if (next.key === 'exact') {
      setSearchOptions({ lemma: false, root: false, fuzzy: false, semantic: false })
    } else {
      setSearchOptions({
        lemma: next.key === 'lemma',
        root: next.key === 'root',
        fuzzy: next.key === 'fuzzy',
        semantic: next.key === 'semantic',
      })
    }
  }, [activeMode, setSearchOptions])

  return (
    <div className="sticky top-0 z-50 flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80">
      {/* Undo / Redo */}
      <button onClick={undo} disabled={!canUndo} className="p-1.5 rounded-lg text-slate-400 disabled:opacity-30">
        <Undo2 size={16} />
      </button>
      <button onClick={redo} disabled={!canRedo} className="p-1.5 rounded-lg text-slate-400 disabled:opacity-30">
        <Redo2 size={16} />
      </button>

      {/* Search */}
      <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-1.5">
        <button
          type="button"
          onClick={cycleMode}
          className="shrink-0 w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center"
          title={activeMode}
        >
          <span className={`w-3 h-3 rounded-full ${MODE_COLORS[activeMode]?.dot || 'bg-slate-400'}`} />
        </button>

        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('search_placeholder', '2:255 or Arabic text…')}
          className="flex-1 h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-400"
          dir="auto"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 h-9 w-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center disabled:opacity-40"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </button>
      </form>
    </div>
  )
}
