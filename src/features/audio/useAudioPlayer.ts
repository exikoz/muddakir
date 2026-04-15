/**
 * Hook that manages the singleton <audio> element.
 * Syncs with audioStore — when store says "play verse X with reciter Y",
 * this hook fetches the URL and drives the audio element.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useAudioStore } from './audioStore'
import { fetchAudioUrl } from '../../services/verseDetailApi'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentVerseKey = useAudioStore(s => s.currentVerseKey)
  const currentReciterId = useAudioStore(s => s.currentReciterId)
  const isPlaying = useAudioStore(s => s.isPlaying)
  const setDuration = useAudioStore(s => s.setDuration)
  const setCurrentTime = useAudioStore(s => s.setCurrentTime)
  const stop = useAudioStore(s => s.stop)

  // Create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'metadata'
    }

    const audio = audioRef.current

    const onLoadedMetadata = () => setDuration(audio.duration)
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onEnded = () => stop()

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
    }
  }, [setDuration, setCurrentTime, stop])

  // React to store changes — load + play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!currentVerseKey || !isPlaying) {
      audio.pause()
      return
    }

    // Fetch audio URL and play
    let cancelled = false
    fetchAudioUrl(currentVerseKey, currentReciterId).then(url => {
      if (cancelled || !url) return

      // Only reload if URL changed
      if (audio.src !== url) {
        audio.src = url
        audio.load()
      }
      audio.play().catch(err => {
        console.warn('[AudioPlayer] play failed:', err)
      })
    })

    return () => { cancelled = true }
  }, [currentVerseKey, currentReciterId, isPlaying])

  // Expose seek
  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = time
      setCurrentTime(time)
    }
  }, [setCurrentTime])

  return { seekTo }
}
