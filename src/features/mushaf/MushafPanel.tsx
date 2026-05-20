import { X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { useSidePanelStore } from '../../store/sidePanelStore'
import { getSurahName } from './surahNames'
import { VerseRow } from './VerseRow'
import SurahSelector from './SurahSelector'

export function MushafPanel() {
  const { t, i18n } = useTranslation('mushaf')
  const isMushafOpen = useSidePanelStore(s => s.leftPanel === 'mushaf')
  const closePanel = useSidePanelStore(s => s.close)
  const mushafChapter = useStore(s => s.mushafChapter)
  const mushafVerses = useStore(s => s.mushafVerses)
  const mushafLoading = useStore(s => s.mushafLoading)
  const mushafHasPrev = useStore(s => s.mushafHasPrev)
  const mushafHasMore = useStore(s => s.mushafHasMore)
  const mushafHighlightVerse = useStore(s => s.mushafHighlightVerse)
  const loadMushafChapter = useStore(s => s.loadMushafChapter)
  const loadMushafMore = useStore(s => s.loadMushafMore)
  const loadMushafPrev = useStore(s => s.loadMushafPrev)
  const addVerseNode = useStore(s => s.addVerseNode)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    // Load more when near bottom
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && mushafHasMore && !mushafLoading) {
      loadMushafMore()
    }
  }

  const handleOpenInExplorer = (verseKey: string) => {
    addVerseNode(verseKey)
    // Optionally close the mushaf panel after adding
    // setMushafOpen(false)
  }

  return (
    <div
      dir="ltr"
      className={`fixed top-12 bottom-0 left-0 w-[480px] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isMushafOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-emerald-600" />
            <div>
              <h2 className="font-semibold text-slate-800 leading-tight">
                {getSurahName(mushafChapter, i18n.language)}
              </h2>
              <p className="text-xs text-slate-400">{t('surah_of_total', { number: mushafChapter })}</p>
            </div>
          </div>
          <button
            onClick={() => closePanel('mushaf')}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => mushafChapter > 1 && loadMushafChapter(mushafChapter - 1)}
            disabled={mushafChapter <= 1}
            className="p-1.5 rounded-full hover:bg-slate-200 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} className="text-slate-600" />
          </button>

          <SurahSelector value={mushafChapter} onChange={loadMushafChapter} />

          <button
            onClick={() => mushafChapter < 114 && loadMushafChapter(mushafChapter + 1)}
            disabled={mushafChapter >= 114}
            className="p-1.5 rounded-full hover:bg-slate-200 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Verse list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" onScroll={handleScroll}>
        {mushafLoading && mushafVerses.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="text-center space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm">{t('loading_verses')}</p>
            </div>
          </div>
        ) : (
          <>
            {mushafHasPrev && (
              <button
                onClick={loadMushafPrev}
                disabled={mushafLoading}
                className="w-full py-2 text-xs text-slate-400 hover:text-emerald-600 font-medium border border-dashed border-slate-200 rounded-xl hover:border-emerald-300 transition-colors disabled:opacity-40"
              >
                {mushafLoading ? t('loading') : t('load_earlier')}
              </button>
            )}
            {mushafVerses.map(verse => (
              <VerseRow
                key={verse.verse_key}
                verse={verse}
                isHighlighted={verse.verse_key === mushafHighlightVerse}
                onOpenInExplorer={handleOpenInExplorer}
              />
            ))}
            {mushafLoading && (
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
