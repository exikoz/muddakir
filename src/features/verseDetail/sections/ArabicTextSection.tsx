import { useVerseDetailStore } from '../../../store/verseDetailStore'
import AudioPlayer from '../../audio/AudioPlayer'

export default function ArabicTextSection() {
  const verse = useVerseDetailStore(s => s.verse)
  if (!verse) return null

  return (
    <div className="px-4 py-4 border-b border-slate-100">
      <p
        className="font-arabic text-right text-2xl leading-loose text-slate-800 mb-4"
        dir="rtl"
      >
        {verse.words
          .filter(w => w.char_type_name !== 'end')
          .map(w => w.text)
          .join(' ')}
      </p>

      {verse.translation && (
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          {verse.translation}
        </p>
      )}

      <AudioPlayer verseKey={verse.verse_key} />
    </div>
  )
}
