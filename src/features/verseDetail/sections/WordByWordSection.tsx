import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import { useAIScopeStore } from '../../../store/aiScopeStore'

export default function WordByWordSection() {
  const verse = useVerseDetailStore(s => s.verse)
  const closeDetail = useVerseDetailStore(s => s.close)
  const addContextItem = useAIScopeStore(s => s.addContextItem)
  const setAIScopeOpen = useAIScopeStore(s => s.setOpen)
  const sendQuery = useAIScopeStore(s => s.sendQuery)
  const [expanded, setExpanded] = useState(true)

  if (!verse) return null

  const words = verse.words.filter(w => w.char_type_name !== 'end')

  function handleWordTap(word: typeof words[0]) {
    // 1. Add verse to AI Scope context
    addContextItem({
      verseKey: verse!.verse_key,
      text: verse!.text_arabic,
      translation: verse!.translation,
      addedAt: Date.now(),
    })

    // 2. Switch to AI Scope
    closeDetail()
    setAIScopeOpen(true)

    // 3. Auto-query about this word
    const query = `Explain the word "${word.text}" (${word.transliteration ?? ''}, meaning: ${word.translation ?? ''}) in verse ${verse!.verse_key}. Cover its morphology, root, and significance in this context.`
    sendQuery(query)
  }

  return (
    <div className="border-b border-slate-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Word by Word
        </span>
        {expanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-0.5">
          {words.map((word, i) => (
            <button
              key={i}
              onClick={() => handleWordTap(word)}
              className="w-full flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-emerald-50 transition-colors text-left group"
              title="Tap to explore this word with AI Scope"
            >
              <span className="font-arabic text-lg text-slate-800 w-28 text-right shrink-0 group-hover:text-emerald-700" dir="rtl">
                {word.text}
              </span>
              <span className="text-[11px] text-slate-400 w-24 shrink-0 truncate">
                {word.transliteration ?? ''}
              </span>
              <span className="text-[11px] text-slate-500 flex-1 truncate">
                {word.translation ?? ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
