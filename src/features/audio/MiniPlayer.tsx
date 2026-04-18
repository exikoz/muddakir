/**
 * Inline linear audio controls for the center cell of the verse node bottom bar.
 *
 * Sits inside a flex-1 cell. All sub-elements are flush grid cells
 * separated by 1px borders. Progress bar is flush at the top.
 */

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Square, Settings, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('graph')
  const currentVerseKey = useAudioStore(s => s.currentVerseKey)
  const currentReciterId = useAudioStore(s => s.currentReciterId)
  const isPlaying = useAudioStore(s => s.isPlaying)
  const isLoading = useAudioStore(s => s.isLoading)
  const duration = useAudioStore(s => s.duration)
  const currentTime = useAudioStore(s => s.currentTime)
  const verseStartTime = useAudioStore(s => s.verseStartTime)
  const playVerse = useAudioStore(s => s.playVerse)
  const pause = useAudioStore(s => s.pause)
  const stop = useAudioStore(s => s.stop)
  const setReciter = useAudioStore(s => s.setReciter)
  const seek = useAudioStore(s => s.seek)

  const [showReciterMenu, setShowReciterMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isThisVerse = currentVerseKey === verseKey
  const isThisPlaying = isThisVerse && isPlaying
  // currentTime is absolute in chapter audio; compute verse-relative progress
  const verseElapsed = isThisVerse ? Math.max(0, currentTime - verseStartTime) : 0
  const progress = isThisVerse && duration > 0 ? (verseElapsed / duration) * 100 : 0

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

  function handleStop(e: React.MouseEvent) {
    e.stopPropagation()
    stop()
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    if (!isThisVerse || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seek(ratio * duration)
  }

  return (
    <div className="flex flex-col flex-1 min-w-0" onClick={e => e.stopPropagation()}>
      {/* Progress bar — flush top edge of the cell */}
      <div
        className="h-1 bg-slate-100 cursor-pointer relative shrink-0"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-emerald-500 transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-stretch flex-1 min-w-0">
        {/* Play / Pause */}
        <button
          onClick={handlePlayPause}
          className="w-8 flex items-center justify-center border-r border-gray-200/60 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors shrink-0"
          title={isThisPlaying ? t('play') : t('play_verse')}
        >
          {isLoading && isThisVerse ? (
            <Loader2 size={11} className="animate-spin text-emerald-500" />
          ) : isThisPlaying ? (
            <Pause size={11} />
          ) : (
            <Play size={11} />
          )}
        </button>

        {/* Stop */}
        <button
          onClick={handleStop}
          className="w-8 flex items-center justify-center border-r border-gray-200/60 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
          title={t('stop')}
        >
          <Square size={9} />
        </button>

        {/* Time */}
        <div className="flex items-center justify-center px-2 text-[9px] text-gray-400 tabular-nums whitespace-nowrap select-none flex-1 min-w-0">
          {formatTime(verseElapsed)} / {formatTime(duration)}
        </div>

        {/* Reciter */}
        <div className="relative border-l border-gray-200/60 shrink-0" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowReciterMenu(!showReciterMenu) }}
            className="h-full px-2 flex items-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            title={t('change_reciter')}
          >
            <Settings size={11} />
          </button>

          {showReciterMenu && (
            <div className="absolute bottom-full right-0 mb-px bg-white border border-gray-200/60 min-w-[130px] z-50">
              {RECITERS.map(r => (
                <button
                  key={r.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setReciter(r.recitationId)
                    setShowReciterMenu(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors border-b border-slate-100 last:border-b-0 ${
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
    </div>
  )
}
