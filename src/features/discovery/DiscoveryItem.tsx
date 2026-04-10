import { memo, useMemo } from 'react'
import { Plus, Check, Trophy, Tag } from 'lucide-react'
import type { SearchResult } from '../../types/quran'
import type { VerseEdge } from '../../types/graph'
import { getHighlightRanges } from '../../services/quranSearch'
import { fetchVerse } from '../../services/quranApi'
import { useStore } from '../../store'

interface Props {
  result: SearchResult
}

const MATCH_COLORS: Record<string, string> = {
  exact:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  lemma:    'bg-blue-100 text-blue-700 border-blue-200',
  root:     'bg-violet-100 text-violet-700 border-violet-200',
  fuzzy:    'bg-amber-100 text-amber-700 border-amber-200',
  semantic: 'bg-purple-100 text-purple-700 border-purple-200',
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  exact:    'bg-emerald-100 text-emerald-900',
  lemma:    'bg-blue-100 text-blue-900',
  root:     'bg-violet-100 text-violet-900',
  fuzzy:    'bg-amber-100 text-amber-900',
  semantic: 'bg-purple-100 text-purple-900',
}

function DiscoveryItem({ result }: Props) {
  const addNode = useStore(s => s.addNode)
  const addEdge = useStore(s => s.addEdge)
  const nodes = useStore(s => s.nodes)
  const lastSearchSourceId = useStore(s => s.lastSearchSourceId)

  const isAdded = nodes.some(n => n.data.verse.verse_key === result.verse_key)

  const highlightedText = useMemo(() => {
    if (!result.matchedTokens || result.matchedTokens.length === 0) {
      return <>{result.text}</>
    }

    const ranges = getHighlightRanges(result.text, result.matchedTokens, result.tokenTypes as any)
    ranges.sort((a, b) => a.start - b.start)

    const segments = []
    let lastIndex = 0

    ranges.forEach((range, i) => {
      if (range.start > lastIndex) {
        segments.push(<span key={`${i}-text`}>{result.text.substring(lastIndex, range.start)}</span>)
      }

      const matchType = (range as any).type || 'exact'
      const highlightClass = HIGHLIGHT_COLORS[matchType] || HIGHLIGHT_COLORS.exact

      segments.push(
        <span key={`${i}-match`} className={`px-0.5 rounded ${highlightClass} font-medium`}>
          {result.text.substring(range.start, range.end)}
        </span>
      )

      lastIndex = range.end
    })

    if (lastIndex < result.text.length) {
      segments.push(<span key="last">{result.text.substring(lastIndex)}</span>)
    }

    return <>{segments}</>
  }, [result])

  async function handleAdd() {
    const verse = await fetchVerse(result.verse_key)
    if (!verse) return

    // Find source node for positioning
    const sourceNode = nodes.find(n => n.id === lastSearchSourceId)
    const baseX = sourceNode?.position.x ?? 200
    const baseY = sourceNode?.position.y ?? 200

    const newNodeId = `verse-${result.verse_key}-${Date.now()}`
    const newNode = {
      id: newNodeId,
      type: 'verse' as const,
      position: { x: baseX + 400, y: baseY + (nodes.length * 30) },
      data: { 
        verse,
        activeWordMatchType: result.matchType,
        matchedTokens: result.matchedTokens,
        tokenTypes: result.tokenTypes,
      },
    }

    addNode(newNode)

    // Create edge if source exists
    if (lastSearchSourceId) {
      const newEdge: VerseEdge = {
        id: `${lastSearchSourceId}-${newNodeId}`,
        source: lastSearchSourceId,
        sourceHandle: 'right-src',
        target: newNodeId,
        targetHandle: 'left-tgt',
        type: 'verse',
        data: { matchType: result.matchType },
      }
      addEdge(newEdge)
    }
  }

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
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${MATCH_COLORS[result.matchType] || 'bg-gray-100 text-gray-700'}`}>
            <Tag size={10} />
            {result.matchType.toUpperCase()}
          </span>
        </div>
      </div>

      <p className="font-arabic text-right text-2xl leading-loose text-slate-700 mb-2" dir="rtl">
        {highlightedText}
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
            title="Add to Map"
          >
            <Plus size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

export default memo(DiscoveryItem)
