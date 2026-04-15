import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import AudioPlayer from '../../audio/AudioPlayer'

/** Max height in px before collapsing (~3 lines of Arabic at text-2xl leading-loose) */
const COLLAPSE_THRESHOLD = 120

export default function ArabicTextSection() {
  const verse = useVerseDetailStore(s => s.verse)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [isLong, setIsLong] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (textRef.current) {
      setIsLong(textRef.current.scrollHeight > COLLAPSE_THRESHOLD)
      setExpanded(false)
    }
  }, [verse?.verse_key])

  if (!verse) return null

  const arabicText = verse.words
    .filter(w => w.char_type_name !== 'end')
    .map(w => w.text)
    .join(' ')

  return (
    <div className="px-4 py-3 border-b border-slate-100">
      {/* Arabic text — collapsible for long verses */}
      <div className="relative">
        <p
          ref={textRef}
          className={`font-arabic text-right text-2xl leading-loose text-slate-800 overflow-hidden transition-all duration-300 ${
            isLong && !expanded ? 'max-h-[120px]' : ''
          }`}
          dir="rtl"
        >
          {arabicText}
        </p>

        {/* Gradient fade when collapsed */}
        {isLong && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 font-medium mt-1"
        >
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {expanded ? 'Show less' : 'Show full verse'}
        </button>
      )}

      {/* Translation */}
      {verse.translation && (
        <p className="text-xs text-slate-500 leading-relaxed mt-2.5">
          {verse.translation}
        </p>
      )}

      {/* Audio player — compact single row */}
      <div className="mt-2.5">
        <AudioPlayer verseKey={verse.verse_key} />
      </div>
    </div>
  )
}
