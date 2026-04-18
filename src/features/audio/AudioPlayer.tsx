/**
 * Linear grid audio player for the Verse Detail panel.
 * All cells flush, separated by 1px borders.
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
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Progress bar — flush top cell */}
      <div
        className="h-1.5 bg-slate-100 cursor-pointer relative"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-emerald-500 transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-stretch h-8 border-t border-slate-200">
        {/* Play / Pause */}
        <button
          onClick={handlePlayPause}
          className="w-9 flex items-center justify-center border-r border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
        >
          {isThisPlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>

        {/* Time */}
        <div className="flex items-center justify-center px-2 border-r border-slate-200 text-[9px] text-slate-400 tabular-nums whitespace-nowrap select-none">
          {isThisVerse ? `${formatTime(currentTime)} / ${formatTime(duration)}` : '0:00'}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Reciter selector */}
        <select
          value={currentReciterId}
          onChange={e => setReciter(Number(e.target.value))}
          className="text-[9px] text-slate-500 bg-transparent border-l border-slate-200 px-2 outline-none hover:bg-slate-50 transition-colors cursor-pointer"
        >
          {RECITERS.map(r => (
            <option key={r.id} value={r.recitationId}>{r.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
