/**
 * Compact single-row audio player for the Verse Detail panel.
 * Play/pause, progress bar, time, and reciter selector — all on one line.
 */

import { Play, Pause } from 'lucide-react'
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
    if (isThisPlaying) pause()
    else playVerse(verseKey, currentReciterId)
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!isThisVerse || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seek(ratio * duration)
  }

  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5">
      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shrink-0"
      >
        {isThisPlaying ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
      </button>

      {/* Progress bar */}
      <div
        className="flex-1 h-1 bg-slate-200 rounded-full cursor-pointer relative min-w-0"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time */}
      <span className="text-[9px] text-slate-400 shrink-0 w-16 text-center tabular-nums">
        {isThisVerse ? `${formatTime(currentTime)}/${formatTime(duration)}` : '0:00'}
      </span>

      {/* Reciter selector */}
      <select
        value={currentReciterId}
        onChange={e => setReciter(Number(e.target.value))}
        className="text-[9px] text-slate-500 bg-white border border-slate-200 rounded px-1 py-0.5 outline-none focus:border-emerald-400 shrink-0 max-w-[90px]"
      >
        {RECITERS.map(r => (
          <option key={r.id} value={r.recitationId}>{r.name}</option>
        ))}
      </select>
    </div>
  )
}
