import { memo, useState, useEffect } from 'react'
import { Plus, Check, Trophy, Tag, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SearchResult, Verse } from '../../types/quran'
import { useStore } from '../../store'
import { getBadgeClasses, getMatchHighlightClasses } from '../../lib/modeColors'
import { fetchVerse } from '../../services/quranApi'
import { getWordHighlights } from '../../lib/highlightWords'

interface Props {
  result: SearchResult
}

function DiscoveryItem({ result }: Props) {
  const { t } = useTranslation('discovery')
  const addVerseNode = useStore(s => s.addVerseNode)
  const explorer = useStore(s => s.explorer)
  const nodes = useStore(s => s.nodes)
  const currentSearchTerm = useStore(s => s.currentSearchTerm)

  const [verse, setVerse] = useState<Verse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchVerse(result.verse_key).then(v => {
      if (!cancelled) {
        setVerse(v)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [result.verse_key])

  const isAdded = nodes.some(n => n.type === 'verse' && n.data.verse.verse_key === result.verse_key)
  const frozenMatchType = result.matchType

  async function handleAdd() {
    const lastSearchSourceId = explorer.getLastSearchSourceId()
    await addVerseNode(result.verse_key, lastSearchSourceId || undefined, {
      matchedTokens: result.matchedTokens,
      tokenTypes: result.tokenTypes,
      matchType: result.matchType,
    })
  }

  const highlightClass = getMatchHighlightClasses(frozenMatchType)
  const wordHighlights = verse
    ? getWordHighlights(verse.words, result.matchedTokens, frozenMatchType, currentSearchTerm || undefined, result.verse_key)
    : null

  return (
    <div className="p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md transition-all group relative pr-12">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {result.verse_key}
        </span>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
            <Trophy size={10} className="text-amber-500" />
            {result.matchScore.toFixed(1)}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${getBadgeClasses(frozenMatchType)}`}>
            <Tag size={10} />
            {frozenMatchType.toUpperCase()}
          </span>
        </div>
      </div>

      <p className="font-arabic text-right text-2xl leading-loose text-slate-700 mb-2" dir="rtl">
        {loading ? (
          <span className="inline-flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 size={14} className="animate-spin" />
          </span>
        ) : verse ? (
          verse.words.map((word, index) => {
            if (word.char_type_name === 'end') return null
            const isHighlighted = wordHighlights?.has(index)
            return (
              <span
                key={index}
                className={isHighlighted ? `px-0.5 rounded ${highlightClass} font-medium` : undefined}
              >
                {word.text}{' '}
              </span>
            )
          })
        ) : (
          <span className="text-slate-400 text-sm">{t('failed_to_load')}</span>
        )}
      </p>

      <div className="absolute top-4 right-4">
        {isAdded ? (
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <Check size={16} />
          </div>
        ) : (
          <button
            onClick={handleAdd}
            className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors shadow-sm"
            title={t('add_to_map')}
          >
            <Plus size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

export default memo(DiscoveryItem)
