/**
 * Upgraded compact player for verse nodes on the canvas.
 * Idle: just a play icon. Playing: play/pause + progress bar + time + reciter gear.
 */

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Settings } from 'lucide-react'
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

export default function MiniPlayer({ verseKey }: Props) {
  const currentVerseKey = useAudioStore(s => s.currentVerseKey)
  const currentReciterId = useAudioStore(s => s.currentReciterId)
  const isPlaying = useAudioStore(s => s.isPlaying)
  const duration = useAudioStore(s => s.duration)
  const currentTime = useAudioStore(s => s.currentTime)
  const playVerse = useAudioStore(s => s.playVerse)
  const pause = useAudioStore(s => s.pause)
  const setReciter = useAudioStore(s => s.setReciter)
  const seek = useAudioStore(s => s.seek)

  const [showReciterMenu, setShowReciterMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isThisVerse = currentVerseKey === verseKey
  const isThisPlaying = isThisVerse && isPlaying
  const isThisActive = isThisVerse && (isPlaying || currentTime > 0)
  const progress = isThisVerse && duration > 0 ? (currentTime / duration) * 100 : 0

  // Close reciter menu on outside click
  useEffect(() => {
    if (!showReciterMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowReciterMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showReciterMenu])

  function handlePlayPause(e: React.MouseEvent) {
    e.stopPropagation()
    if (isThisPlaying) pause()
    else playVerse(verseKey, currentReciterId)
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    if (!isThisVerse || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seek(ratio * duration)
  }

  // Idle state — just a play button
  if (!isThisActive) {
    return (
      <button
        onClick={handlePlayPause}
        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all px-2 py-1 rounded-full"
        title="Play verse"
      >
        <Play size={11} className="ml-0.5" />
        <span>Play</span>
      </button>
    )
  }

  // Active state — full compact player
  return (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shrink-0"
      >
        {isThisPlaying ? <Pause size={8} /> : <Play size={8} className="ml-px" />}
      </button>

      {/* Progress bar */}
      <div
        className="w-16 h-1 bg-slate-200 rounded-full cursor-pointer relative shrink-0"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time */}
      <span className="text-[8px] text-slate-400 tabular-nums shrink-0">
        {formatTime(currentTime)}
      </span>

      {/* Reciter gear */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowReciterMenu(!showReciterMenu) }}
          className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
          title="Change reciter"
        >
          <Settings size={10} />
        </button>

        {showReciterMenu && (
          <div className="absolute bottom-6 right-0 bg-white rounded-lg shadow-lg border border-slate-100 p-1 min-w-[120px] z-50">
            {RECITERS.map(r => (
              <button
                key={r.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setReciter(r.recitationId)
                  setShowReciterMenu(false)
                }}
                className={`w-full text-left px-2 py-1 rounded text-[10px] transition-colors ${
                  currentReciterId === r.recitationId
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
