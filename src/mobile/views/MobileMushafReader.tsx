/**
 * Mobile mushaf reader — full-screen chapter reader.
 * Reuses the same store state and VerseRow component from desktop.
 */

import { useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { getSurahName } from '../../features/mushaf/surahNames'
import { VerseRow } from '../../features/mushaf/VerseRow'
import SurahSelector from '../../features/mushaf/SurahSelector'

interface Props {
  chapter?: number
  highlightVerse?: string
}

export default function MobileMushafReader({ chapter, highlightVerse }: Props) {
  const { t, i18n } = useTranslation('mushaf')
  const mushafChapter = useStore(s => s.mushafChapter)
  const mushafVerses = useStore(s => s.mushafVerses)
  const mushafLoading = useStore(s => s.mushafLoading)
  const mushafHasPrev = useStore(s => s.mushafHasPrev)
  const mushafHasMore = useStore(s => s.mushafHasMore)
  const mushafHighlightVerse = useStore(s => s.mushafHighlightVerse)
  const loadMushafChapter = useStore(s => s.loadMushafChapter)
  const loadMushafMore = useStore(s => s.loadMushafMore)
  const loadMushafPrev = useStore(s => s.loadMushafPrev)
  const openMushafToVerse = useStore(s => s.openMushafToVerse)
  const addVerseNode = useStore(s => s.addVerseNode)

  // Load chapter on mount if specified
  useEffect(() => {
    if (highlightVerse) {
      openMushafToVerse(highlightVerse)
    } else if (chapter && chapter !== mushafChapter) {
      loadMushafChapter(chapter)
    }
  }, [chapter, highlightVerse, mushafChapter, loadMushafChapter, openMushafToVerse])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && mushafHasMore && !mushafLoading) {
      loadMushafMore()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Navigation header */}
      <div className="px-3 py-3 border-b border-slate-100 bg-slate-50 space-y-2 shrink-0">
        <h2 className="font-semibold text-slate-800 text-center">
          {getSurahName(mushafChapter, i18n.language)}
        </h2>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => mushafChapter > 1 && loadMushafChapter(mushafChapter - 1)}
            disabled={mushafChapter <= 1}
            className="p-1.5 rounded-full hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>

          <SurahSelector value={mushafChapter} onChange={loadMushafChapter} />

          <button
            onClick={() => mushafChapter < 114 && loadMushafChapter(mushafChapter + 1)}
            disabled={mushafChapter >= 114}
            className="p-1.5 rounded-full hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Verse list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" onScroll={handleScroll}>
        {mushafLoading && mushafVerses.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {mushafHasPrev && (
              <button
                onClick={loadMushafPrev}
                disabled={mushafLoading}
                className="w-full py-2 text-xs text-slate-400 hover:text-emerald-600 border border-dashed border-slate-200 rounded-xl"
              >
                {mushafLoading ? t('loading') : t('load_earlier')}
              </button>
            )}
            {mushafVerses.map(verse => (
              <VerseRow
                key={verse.verse_key}
                verse={verse}
                isHighlighted={verse.verse_key === (mushafHighlightVerse || highlightVerse)}
                onOpenInExplorer={(vk) => addVerseNode(vk)}
              />
            ))}
            {mushafLoading && mushafVerses.length > 0 && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!mushafHasMore && mushafVerses.length > 0 && (
              <p className="text-center text-xs text-slate-300 py-4">{t('end_of_surah')}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
