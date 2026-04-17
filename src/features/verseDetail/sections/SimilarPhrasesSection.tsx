import { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronDown, ChevronUp, Plus, Check, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import { useStore } from '../../../store'
import { getPhrasesForVerse } from '../../../services/mutashabihatService'
import { fetchVerse } from '../../../services/quranApi'
import type { ResolvedPhrase, WordRange } from '../types'
import type { Verse, Word } from '../../../types/quran'

/** Subtle highlight colors for phrase backgrounds — cycled per phrase */
const PHRASE_COLORS = [
  'bg-amber-100',
  'bg-sky-100',
  'bg-rose-100',
  'bg-violet-100',
] as const

/** Initial number of verses shown in expanded view */
const INITIAL_VERSE_COUNT = 10

function getPhraseColor(index: number): string {
  return PHRASE_COLORS[index % PHRASE_COLORS.length]
}

/**
 * Check if a word position falls within any of the given word ranges.
 * Word positions in the data are 1-indexed.
 */
function isWordHighlighted(position: number, ranges: WordRange[]): boolean {
  return ranges.some(([from, to]) => position >= from && position <= to)
}

// ── Phrase Card ──────────────────────────────────────────────────────────────

/**
 * Build a position → color map for all phrases on the current verse.
 * First matching phrase wins (for overlapping ranges).
 */
function buildHighlightMap(phrases: ResolvedPhrase[]): Map<number, string> {
  const map = new Map<number, string>()
  phrases.forEach((phrase, i) => {
    const color = getPhraseColor(i)
    for (const [from, to] of phrase.wordRanges) {
      for (let pos = from; pos <= to; pos++) {
        if (!map.has(pos)) map.set(pos, color)
      }
    }
  })
  return map
}

interface PhraseCardProps {
  phrase: ResolvedPhrase
  allPhrases: ResolvedPhrase[]
  words: Word[]
  colorIndex: number
  currentVerseKey: string
  onNavigateToVerse: (verseKey: string) => void
}

function PhraseCard({ phrase, allPhrases, words, colorIndex, currentVerseKey, onNavigateToVerse }: PhraseCardProps) {
  const { t } = useTranslation('verseDetail')
  const [expanded, setExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const color = getPhraseColor(colorIndex)

  const otherVerseKeys = Object.keys(phrase.allVerses).filter(k => k !== currentVerseKey)
  const totalOtherVerses = otherVerseKeys.length
  const displayedKeys = showAll ? otherVerseKeys : otherVerseKeys.slice(0, INITIAL_VERSE_COUNT)
  const hasMore = totalOtherVerses > INITIAL_VERSE_COUNT && !showAll

  const filteredWords = words.filter(w => w.char_type_name !== 'end')
  const highlightMap = buildHighlightMap(allPhrases)

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Phrase preview — highlights ALL phrases, this card's phrase gets a left border accent */}
      <div className="px-3.5 py-3" style={{ borderLeft: `3px solid`, borderLeftColor: colorIndex === 0 ? '#fbbf24' : colorIndex === 1 ? '#38bdf8' : colorIndex === 2 ? '#fb7185' : '#a78bfa' }}>
        <p className="font-arabic text-right text-lg leading-loose text-slate-800 mb-2" dir="rtl">
          {filteredWords.map(w => {
            const wordColor = highlightMap.get(w.position)
            return (
              <span
                key={w.position}
                className={wordColor ? `${wordColor} rounded px-0.5 py-0.5` : ''}
              >
                {w.text}{' '}
              </span>
            )
          })}
        </p>

        {/* Stats line */}
        <p className="text-[11px] text-slate-400 mb-2">
          {t('phrase_stats', {
            count: phrase.count,
            ayahs: phrase.ayahs,
            surahs: phrase.surahs,
          })}
        </p>

        {/* View all toggle */}
        {totalOtherVerses > 0 && (
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? t('phrase_collapse') : t('phrase_view_all', { count: totalOtherVerses })}
          </button>
        )}
      </div>

      {/* Expanded verse list */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50">
          {displayedKeys.map(vk => (
            <VerseRow
              key={vk}
              verseKey={vk}
              wordRanges={phrase.allVerses[vk]}
              color={color}
              onNavigate={onNavigateToVerse}
            />
          ))}

          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
            >
              {t('phrase_show_more', { remaining: totalOtherVerses - INITIAL_VERSE_COUNT })}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Verse Row (inside expanded phrase card) ──────────────────────────────────

interface VerseRowProps {
  verseKey: string
  wordRanges: WordRange[]
  color: string
  onNavigate: (verseKey: string) => void
}

function VerseRow({ verseKey, wordRanges, color, onNavigate }: VerseRowProps) {
  const { t } = useTranslation('verseDetail')
  const addVerseNode = useStore(s => s.addVerseNode)
  const nodes = useStore(s => s.nodes)
  const [verse, setVerse] = useState<Verse | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const isOnCanvas = nodes.some(n => n.type === 'verse' && n.data.verse.verse_key === verseKey)

  useEffect(() => {
    let cancelled = false
    fetchVerse(verseKey).then(v => {
      if (!cancelled) {
        setVerse(v)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [verseKey])

  async function handleAdd() {
    setAdding(true)
    await addVerseNode(verseKey)
    setAdding(false)
  }

  const filteredWords = verse?.words.filter(w => w.char_type_name !== 'end') ?? []

  return (
    <div className="px-3.5 py-2.5 border-b border-slate-100 last:border-b-0">
      <div className="flex items-center justify-between mb-1.5">
        <button
          onClick={() => onNavigate(verseKey)}
          className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
        >
          {verseKey}
          <ExternalLink size={10} />
        </button>

        {isOnCanvas ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
            <Check size={11} />
            {t('phrase_added')}
          </span>
        ) : (
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-40"
          >
            {adding ? <Loader2 size={10} className="animate-spin" /> : <Plus size={11} />}
            {t('phrase_add_to_canvas')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-1.5 py-2 text-slate-300 text-[10px]">
          <Loader2 size={10} className="animate-spin" />
        </div>
      ) : (
        <p className="font-arabic text-right text-sm leading-relaxed text-slate-700" dir="rtl">
          {filteredWords.map(w => {
            const highlighted = isWordHighlighted(w.position, wordRanges)
            return (
              <span
                key={w.position}
                className={highlighted ? `${color} rounded px-0.5` : ''}
              >
                {w.text}{' '}
              </span>
            )
          })}
        </p>
      )}
    </div>
  )
}

// ── Main Section ─────────────────────────────────────────────────────────────

export default function SimilarPhrasesSection() {
  const { t } = useTranslation('verseDetail')
  const verse = useVerseDetailStore(s => s.verse)
  const openDetail = useVerseDetailStore(s => s.openDetail)
  const [phrases, setPhrases] = useState<ResolvedPhrase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!verse) return
    let cancelled = false

    getPhrasesForVerse(verse.verse_key).then(result => {
      if (!cancelled) {
        setPhrases(result)
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [verse])

  const handleNavigateToVerse = useCallback(async (verseKey: string) => {
    const v = await fetchVerse(verseKey)
    if (v) openDetail(v)
  }, [openDetail])

  if (!verse) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={18} className="animate-spin text-slate-300" />
      </div>
    )
  }

  if (phrases.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-xs text-slate-400">{t('no_similar_phrases')}</p>
      </div>
    )
  }

  return (
    <div className="px-3 py-3 space-y-3">
      {phrases.map((phrase, i) => (
        <PhraseCard
          key={phrase.phraseId}
          phrase={phrase}
          allPhrases={phrases}
          words={verse.words}
          colorIndex={i}
          currentVerseKey={verse.verse_key}
          onNavigateToVerse={handleNavigateToVerse}
        />
      ))}
    </div>
  )
}
