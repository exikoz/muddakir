/**
 * Hook that manages the singleton <audio> element.
 *
 * Plays the CHAPTER audio file and seeks to the verse's start position.
 * This ensures word-by-word highlighting timestamps match perfectly
 * since they come from the same audio file.
 *
 * Automatically stops when the verse's end timestamp is reached.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useAudioStore } from './audioStore'
import { getChapterReciterId } from './audioConfig'
import { fetchChapterAudio } from '../../services/verseDetailApi'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastSrcRef = useRef<string | null>(null)

  const currentVerseKey = useAudioStore(s => s.currentVerseKey)
  const currentReciterId = useAudioStore(s => s.currentReciterId)
  const isPlaying = useAudioStore(s => s.isPlaying)
  const setLoading = useAudioStore(s => s.setLoading)
  const setDuration = useAudioStore(s => s.setDuration)
  const setCurrentTime = useAudioStore(s => s.setCurrentTime)
  const setVerseRange = useAudioStore(s => s.setVerseRange)
  const stop = useAudioStore(s => s.stop)

  // Create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'auto'
    }

    const audio = audioRef.current

    const onTimeUpdate = () => {
      const { verseEndTime } = useAudioStore.getState()
      // Stop when we reach the verse end
      if (verseEndTime > 0 && audio.currentTime >= verseEndTime) {
        audio.pause()
        stop()
        return
      }
      setCurrentTime(audio.currentTime)
    }

    const onCanPlay = () => setLoading(false)
    const onEnded = () => stop()

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
    }
  }, [setCurrentTime, setLoading, stop])

  // React to store changes — load chapter audio + seek to verse
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Stop was called — reset
    if (!currentVerseKey) {
      audio.pause()
      audio.currentTime = 0
      audio.removeAttribute('src')
      lastSrcRef.current = null
      return
    }

    if (!isPlaying) {
      audio.pause()
      return
    }

    // Resolve chapter reciter ID
    const chapterReciterId = getChapterReciterId(currentReciterId)
    if (!chapterReciterId) {
      setLoading(false)
      return
    }

    const [chapterStr] = currentVerseKey.split(':')
    const chapter = parseInt(chapterStr, 10)

    let cancelled = false

    fetchChapterAudio(chapterReciterId, chapter).then(data => {
      if (cancelled || !data) {
        setLoading(false)
        return
      }

      const verseTiming = data.verseTimings.get(currentVerseKey)
      if (!verseTiming) {
        console.warn(`[AudioPlayer] No timing for ${currentVerseKey}`)
        setLoading(false)
        return
      }

      console.log(`[AudioPlayer] Playing ${currentVerseKey} from chapter audio: ${data.audioUrl.slice(-30)}  verse: ${verseTiming.timestampFrom}ms → ${verseTiming.timestampTo}ms`)

      const startSec = verseTiming.timestampFrom / 1000
      const endSec = verseTiming.timestampTo / 1000

      // Store verse range so timeupdate can stop at the right time
      setVerseRange(startSec, endSec)
      setDuration(endSec - startSec)

      const needsReload = lastSrcRef.current !== data.audioUrl

      if (needsReload) {
        audio.src = data.audioUrl
        audio.load()
        lastSrcRef.current = data.audioUrl

        // Wait for enough data to seek
        const onLoadedData = () => {
          audio.removeEventListener('loadeddata', onLoadedData)
          if (cancelled) return
          audio.currentTime = startSec
          setLoading(false)
          audio.play().catch(err => {
            console.warn('[AudioPlayer] play failed:', err)
            setLoading(false)
          })
        }
        audio.addEventListener('loadeddata', onLoadedData)
      } else {
        // Same chapter audio already loaded — just seek
        audio.currentTime = startSec
        setLoading(false)
        audio.play().catch(err => {
          console.warn('[AudioPlayer] play failed:', err)
          setLoading(false)
        })
      }
    })

    return () => { cancelled = true }
  }, [currentVerseKey, currentReciterId, isPlaying, setLoading, setDuration, setVerseRange])

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = time
      setCurrentTime(time)
    }
  }, [setCurrentTime])

  return { seekTo }
}
