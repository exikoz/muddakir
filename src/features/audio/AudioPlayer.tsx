/**
 * Full audio player — used in the Verse Detail panel.
 * Play/pause, progress bar with seek, time display, reciter selector.
 */

import { Play, Pause, Loader2 } from 'lucide-react'
import { useAudioStore } from './audioStore'
import { RECITERS } from './audioConfig'

interface Props {
  verseKey: string
}

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function AudioPlayer({ verseKey }: Props) {
  const currentVerseKey = useAudioStore(s => s.currentVerseKey)
  const currentReciterId = useAudioStore(s => s.currentReciterId)
  const isPlaying = useAudioStore(s => s.isPlaying)
  const duration = useAudioStore(s => s.duration)
  const currentTime = useAudioStore(s => s.currentTime)
  const playVerse = useAudioStore(s => s.playVerse)
  const pause = useAudioStore(s => s.pause)
  const setReciter = useAudioStore(s => s.setReciter)
  const seek = useAudioStore(s => s.seek)

  const isThisVerse = currentVerseKey === verseKey
  const isThisPlaying = isThisVerse && isPlaying
  const progress = isThisVerse && duration > 0 ? (currentTime / duration) * 100 : 0

  function handlePlayPause() {
    if (isThisPlaying) {
      pause()
    } else {
      playVerse(verseKey, currentReciterId)
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!isThisVerse || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seek(ratio * duration)
  }

  function handleReciterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setReciter(Number(e.target.value))
  }

  return (
    <div className="flex flex-col gap-2 bg-slate-50 rounded-xl p-3">
      <div className="flex items-center gap-2.5">
        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shrink-0"
        >
          {isThisPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>

        {/* Progress bar + time */}
        <div className="flex-1 min-w-0">
          <div
            className="h-1.5 bg-slate-200 rounded-full cursor-pointer relative"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[9px] text-slate-400">{isThisVerse ? formatTime(currentTime) : '0:00'}</span>
            <span className="text-[9px] text-slate-400">{isThisVerse ? formatTime(duration) : '0:00'}</span>
          </div>
        </div>
      </div>

      {/* Reciter selector */}
      <select
        value={currentReciterId}
        onChange={handleReciterChange}
        className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-emerald-400"
      >
        {RECITERS.map(r => (
          <option key={r.id} value={r.recitationId}>
            {r.name} · {r.style}
          </option>
        ))}
      </select>
    </div>
  )
}
