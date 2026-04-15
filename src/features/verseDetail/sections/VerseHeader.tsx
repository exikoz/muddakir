import { ArrowLeft, X } from 'lucide-react'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import { useAIScopeStore } from '../../../store/aiScopeStore'
import { useStore } from '../../../store'
import { SURAH_NAMES } from '../../mushaf/surahNames'

export default function VerseHeader() {
  const verse = useVerseDetailStore(s => s.verse)
  const previousPanel = useVerseDetailStore(s => s.previousPanel)
  const close = useVerseDetailStore(s => s.close)
  const setAIScopeOpen = useAIScopeStore(s => s.setOpen)
  const setDiscoveryOpen = useStore(s => s.setDiscoveryOpen)

  if (!verse) return null

  const [chapterStr] = verse.verse_key.split(':')
  const chapter = parseInt(chapterStr, 10)
  const surahName = SURAH_NAMES[chapter] ?? `Surah ${chapter}`

  function handleBack() {
    close()
    if (previousPanel === 'aiScope') setAIScopeOpen(true)
    else if (previousPanel === 'discovery') setDiscoveryOpen(true)
  }

  return (
    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 font-medium transition-colors"
        >
          <ArrowLeft size={12} />
          {previousPanel === 'aiScope' ? 'Back to AI Scope' : previousPanel === 'discovery' ? 'Back to Discovery' : 'Close'}
        </button>
        <button
          onClick={() => close()}
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
