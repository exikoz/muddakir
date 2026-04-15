import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Verse, Word } from '../../types/quran'

interface VerseRowProps {
  verse: Verse
  isHighlighted: boolean
  onOpenInExplorer: (verseKey: string) => void
}

export function VerseRow({ verse, isHighlighted, onOpenInExplorer }: VerseRowProps) {
  const { t } = useTranslation('mushaf')
  const ref = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  // Auto-scroll to highlighted verse
  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isHighlighted])

  const displayWords = verse.words.filter((w: Word) => w.char_type_name !== 'end')
  const endMarker = verse.words.find((w: Word) => w.char_type_name === 'end')

  const handleCopy = () => {
    const text = displayWords.map((w: Word) => w.text).join(' ')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div
      ref={ref}
      className={`group relative p-4 rounded-2xl border transition-all duration-300 ${
        isHighlighted
          ? 'border-emerald-300 bg-emerald-50 shadow-md'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      {/* Verse key */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {verse.verse_key}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-600 font-medium transition-all px-2 py-0.5 rounded-full hover:bg-emerald-50 border border-transparent hover:border-emerald-200"
            title={t('copy')}
          >
            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            {copied ? t('copied') : t('copy')}
          </button>
          <button
            onClick={() => onOpenInExplorer(verse.verse_key)}
            className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-medium transition-all px-2 py-0.5 rounded-full hover:bg-emerald-50 border border-transparent hover:border-emerald-200"
            title={t('open_in_explorer')}
          >
            <ExternalLink size={11} />
            {t('explorer')}
          </button>
        </div>
      </div>

      {/* Arabic text */}
      <p className="font-arabic text-right text-2xl leading-loose text-slate-800 mb-2" dir="rtl">
        {displayWords.map((w: Word) => w.text).join(' ')}
        {endMarker && <span className="text-slate-400 mx-1">{endMarker.text}</span>}
      </p>

      {/* Translation */}
      {verse.translation && (
        <p className="text-sm text-slate-500 leading-relaxed">{verse.translation}</p>
      )}
    </div>
  )
}
