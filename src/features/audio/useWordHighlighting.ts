/**
 * Hook for word-by-word highlighting during Quran recitation.
 *
 * Now uses absolute timestamps (ms within chapter audio) since we play
 * the chapter audio file and seek to the verse position.
 * audio.currentTime is in seconds (absolute within chapter audio).
 * Word timestamps are in ms (absolute within chapter audio).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAudioStore } from './audioStore'
import { getChapterReciterId } from './audioConfig'
import { fetchWordTimestamps, type WordTimestamp } from '../../services/verseDetailApi'

export function useWordHighlighting(
  verseKey: string,
  totalWords: number
): number | null {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const timingsRef = useRef<WordTimestamp[]>([])
  const rafRef = useRef<number | null>(null)
  const prevIndexRef = useRef<number | null>(null)

  const currentVerseKey = useAudioStore(s => s.currentVerseKey)
  const currentReciterId = useAudioStore(s => s.currentReciterId)
  const isPlaying = useAudioStore(s => s.isPlaying)
  const currentTime = useAudioStore(s => s.currentTime)

  const isThisVerse = currentVerseKey === verseKey
  const isThisPlaying = isThisVerse && isPlaying

  // Fetch timestamps when this verse starts playing or reciter changes
  useEffect(() => {
    if (!isThisVerse || totalWords === 0) {
      timingsRef.current = []
      return
    }

    const chapterReciterId = getChapterReciterId(currentReciterId)
    if (!chapterReciterId) {
      timingsRef.current = []
      return
    }

    let cancelled = false
    fetchWordTimestamps(verseKey, chapterReciterId, totalWords).then(timings => {
      if (!cancelled) {
        timingsRef.current = timings
      }
    })

    return () => { cancelled = true }
  }, [verseKey, currentReciterId, isThisVerse, totalWords])

  // Find active word: currentTime is in seconds, timestamps are in ms
  const findActiveWord = useCallback((timeSec: number): number | null => {
    const timings = timingsRef.current
    if (timings.length === 0) return null

    const timeMs = timeSec * 1000

    for (const t of timings) {
      if (timeMs >= t.timestampFrom && timeMs < t.timestampTo) {
        return t.wordIndex
      }
    }
    return null
  }, [])

  // Use rAF for smooth tracking while playing
  useEffect(() => {
    if (!isThisPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const animate = () => {
      const timeSec = useAudioStore.getState().currentTime
      const idx = findActiveWord(timeSec)

      if (idx !== prevIndexRef.current) {
        prevIndexRef.current = idx
        setActiveIndex(idx)
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isThisPlaying, findActiveWord])

  // Clear when verse stops being active
  useEffect(() => {
    if (!isThisVerse) {
      setActiveIndex(null)
      prevIndexRef.current = null
      timingsRef.current = []
    }
  }, [isThisVerse])

  // Update on seek while paused
  useEffect(() => {
    if (isThisVerse && !isPlaying && timingsRef.current.length > 0) {
      const idx = findActiveWord(currentTime)
      if (idx !== prevIndexRef.current) {
        prevIndexRef.current = idx
        setActiveIndex(idx)
      }
    }
  }, [currentTime, isThisVerse, isPlaying, findActiveWord])

  return activeIndex
}
