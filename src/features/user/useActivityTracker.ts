/**
 * Activity tracker — logs reading time to the Quran Foundation Streak API.
 *
 * Tracks time spent actively using the app (verse exploration, reading, audio).
 * Logs activity every 5 minutes (or on page unload) to maintain the user's streak.
 *
 * Only tracks when:
 *   - User is logged in
 *   - There are verse nodes on the canvas (user is actively exploring)
 */

import { useEffect, useRef } from 'react'
import { useUserStore } from '../../store/userStore'
import { useStore } from '../../store'

const LOG_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const MIN_SECONDS_TO_LOG = 30 // Don't log less than 30 seconds

export function useActivityTracker() {
  const isLoggedIn = useUserStore(s => s.isLoggedIn)
  const logReading = useUserStore(s => s.logReading)
  const hasNodes = useStore(s => s.nodes.some((n: { type: string }) => n.type === 'verse'))

  const accumulatedSecondsRef = useRef(0)
  const lastTickRef = useRef(Date.now())
  const isActiveRef = useRef(false)

  // Track whether user is actively engaged
  useEffect(() => {
    isActiveRef.current = isLoggedIn && hasNodes
  }, [isLoggedIn, hasNodes])

  // Accumulate seconds while active
  useEffect(() => {
    if (!isLoggedIn) return

    const ticker = setInterval(() => {
      if (isActiveRef.current) {
        const now = Date.now()
        const elapsed = (now - lastTickRef.current) / 1000
        // Cap at 10 seconds per tick to avoid counting idle/background time
        accumulatedSecondsRef.current += Math.min(elapsed, 10)
        lastTickRef.current = now
      } else {
        lastTickRef.current = Date.now()
      }
    }, 5000) // Tick every 5 seconds

    return () => clearInterval(ticker)
  }, [isLoggedIn])

  // Log activity periodically
  useEffect(() => {
    if (!isLoggedIn) return

    const logger = setInterval(() => {
      const seconds = Math.floor(accumulatedSecondsRef.current)
      if (seconds >= MIN_SECONDS_TO_LOG) {
        logReading(seconds)
        accumulatedSecondsRef.current = 0
      }
    }, LOG_INTERVAL_MS)

    return () => clearInterval(logger)
  }, [isLoggedIn, logReading])

  // Log on page unload (best-effort)
  useEffect(() => {
    if (!isLoggedIn) return

    function handleUnload() {
      const seconds = Math.floor(accumulatedSecondsRef.current)
      if (seconds >= MIN_SECONDS_TO_LOG) {
        // Use sendBeacon for reliability on unload
        const { accessToken } = useUserStore.getState()
        if (!accessToken) return

        const base = import.meta.env.VITE_APP_ENV === 'prod'
          ? 'https://apis.quran.foundation'
          : 'https://apis-prelive.quran.foundation'
        const clientId = import.meta.env.VITE_USER_CLIENT_ID as string

        const body = JSON.stringify({
          type: 'QURAN',
          seconds,
          mushafId: 2,
        })

        // sendBeacon doesn't support custom headers, so fall back to fetch keepalive
        fetch(`${base}/auth/v1/activity-days`, {
          method: 'POST',
          headers: {
            'x-auth-token': accessToken,
            'x-client-id': clientId,
            'Content-Type': 'application/json',
          },
          body,
          keepalive: true,
        }).catch(() => { /* best effort */ })

        accumulatedSecondsRef.current = 0
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [isLoggedIn])
}
