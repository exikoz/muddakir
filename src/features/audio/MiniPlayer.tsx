/**
 * Compact play/pause button for verse nodes on the canvas.
 * No reciter selector — uses the default. Singleton behavior via audioStore.
 */

import { Play, Pause } from 'lucide-react'
import { useAudioStore } from './audioStore'

interface Props {
  verseKey: string
}

export default function MiniPlayer({ verseKey }: Props) {
  const currentVerseKey = useAudioStore(s => s.currentVerseKey)
  const isPlaying = useAudioStore(s => s.isPlaying)
  const playVerse = useAudioStore(s => s.playVerse)
  const pause = useAudioStore(s => s.pause)

  const isThisPlaying = currentVerseKey === verseKey && isPlaying

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (isThisPlaying) {
      pause()
    } else {
      playVerse(verseKey)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 text-[11px] font-medium transition-all px-2 py-1 rounded-full ${
        isThisPlaying
          ? 'text-emerald-600 bg-emerald-50'
          : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
      }`}
      title={isThisPlaying ? 'Pause' : 'Play verse'}
    >
      {isThisPlaying ? <Pause size={11} /> : <Play size={11} className="ml-0.5" />}
      <span>{isThisPlaying ? 'Pause' : 'Play'}</span>
    </button>
  )
}
