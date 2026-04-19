/**
 * Collapsible result group — shows search results from a word click.
 * On mobile we show ALL results (not just top 3), initially collapsed.
 */

import { memo, useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, Plus, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import type { SearchResult, MatchType } from '../../types/quran'
import { MODE_COLORS } from '../../lib/modeColors'

interface Props {
  sourceNodeId: string
  results: SearchResult[]
  matchType: MatchType
  searchTerm: string
}

const INITIAL_SHOW = 5

function MobileResultGroup({ sourceNodeId, results, matchType, searchTerm }: Props) {
  const { t } = useTranslation('discovery')
  const addVerseNode = useStore(s => s.addVerseNode)
  const [expanded, setExpanded] = useState(false)
  const [addingKey, setAddingKey] = useState<string | null>(null)

  const visibleResults = expanded ? results : results.slice(0, INITIAL_SHOW)
  const hasMore = results.length > INITIAL_SHOW

  const handleAdd = useCallback(async (result: SearchResult) => {
    setAddingKey(result.verse_key)
    try {
      await addVerseNode(result.verse_key, sourceNodeId, {
        matchedTokens: result.matchedTokens,
        tokenTypes: result.tokenTypes,
        matchType: result.matchType,
      })
    } finally {
      setAddingKey(null)
    }
  }, [addVerseNode, sourceNodeId])

  if (results.length === 0) return null

  const borderColor = MODE_COLORS[matchType]?.edge || '#94a3b8'

  return (
    <div
      className="ml-7 rounded-lg border bg-slate-50/50 overflow-hidden"
      style={{ borderColor: `${borderColor}40` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/60">
        <span className="text-[11px] text-slate-500">
          {results.length} {t('results', 'results')}
        </span>
      </div>

      {/* Result rows */}
      <div className="divide-y divide-slate-100">
        {visibleResults.map(result => (
          <div key={result.verse_key} className="flex items-center gap-2 px-3 py-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-600">{result.verse_key}</span>
              <p className="text-xs text-slate-400 truncate" dir="rtl">{result.text}</p>
            </div>
            <button
              onClick={() => handleAdd(result)}
              disabled={addingKey === result.verse_key}
              className="shrink-0 p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40"
            >
              {addingKey === result.verse_key
                ? <Loader2 size={14} className="animate-spin" />
                : <Plus size={14} />}
            </button>
          </div>
        ))}
      </div>

      {/* Show more / less */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2 text-[11px] text-slate-400 hover:text-slate-600 border-t border-slate-100"
        >
          {expanded ? (
            <><ChevronUp size={12} /> {t('show_less', 'Show less')}</>
          ) : (
            <><ChevronDown size={12} /> {t('show_more', `Show ${results.length - INITIAL_SHOW} more`)}</>
          )}
        </button>
      )}
    </div>
  )
}

export default memo(MobileResultGroup)
