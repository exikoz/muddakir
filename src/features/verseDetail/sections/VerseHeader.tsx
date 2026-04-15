import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import { useSidePanelStore } from '../../../store/sidePanelStore'
import { getSurahName } from '../../mushaf/surahNames'

export default function VerseHeader() {
  const { t, i18n } = useTranslation('verseDetail')
  const isRtl = i18n.dir() === 'rtl'
  const verse = useVerseDetailStore(s => s.verse)
  const previousPanel = useVerseDetailStore(s => s.previousPanel)
  const clearDetail = useVerseDetailStore(s => s.close)
  const openPanel = useSidePanelStore(s => s.open)
  const closePanel = useSidePanelStore(s => s.close)

  if (!verse) return null

  const [chapterStr] = verse.verse_key.split(':')
  const chapter = parseInt(chapterStr, 10)
  const surahName = getSurahName(chapter, i18n.language)

  function handleBack() {
    clearDetail()
    if (previousPanel) {
      openPanel(previousPanel)
    } else {
      closePanel()
    }
  }

  function handleClose() {
    clearDetail()
    closePanel()
  }

  return (
    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 font-medium transition-colors"
        >
          {isRtl ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
          {previousPanel === 'aiScope' ? t('back_to_ai_scope') : previousPanel === 'discovery' ? t('back_to_discovery') : t('close')}
        </button>
        <button
          onClick={handleClose}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <h2 className="font-semibold text-slate-800 text-lg leading-tight">
        {verse.verse_key}
      </h2>
      <p className="text-[11px] text-slate-400 mt-0.5">
        {surahName}
      </p>
    </div>
  )
}
