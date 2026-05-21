/**
 * User store — manages authentication state, bookmarks, and streaks.
 *
 * Follows the same Zustand pattern as aiScopeStore / verseDetailStore.
 * Auth tokens are kept in memory (access) and localStorage (refresh).
 * Bookmarks and streaks are synced from the Quran Foundation User API on login.
 */

import { create } from 'zustand'
import { buildLoginUrl, getStoredPkce, clearStoredPkce } from '../lib/userAuth'
import {
  fetchBookmarks,
  addBookmark as apiAddBookmark,
  removeBookmark as apiRemoveBookmark,
} from '../services/userApi'
import {
  fetchCurrentStreakDays,
  fetchStreaks,
  fetchActivityDays,
  logActivityDay,
} from '../services/streakApi'
import type { Bookmark } from '../services/userApi'
import type { Streak, ActivityDay } from '../services/streakApi'

const REFRESH_TOKEN_KEY = 'muddakir_refresh_token'
const USER_PROFILE_KEY = 'muddakir_user_profile'

/** Decode JWT payload (no verification — debug only) */
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
}

function logTokenScopes(label: string, token: string | null | undefined) {
  if (!token) { console.warn(`[Auth] ${label}: no token`); return }
  const decoded = decodeJwt(token)
  if (!decoded) { console.warn(`[Auth] ${label}: could not decode token`); return }
  console.group(`[Auth] ${label}`)
  console.log('scope   :', decoded.scope ?? decoded.scp ?? '(none)')
  console.log('sub     :', decoded.sub ?? '(none)')
  console.log('client  :', decoded.client_id ?? decoded.aud ?? '(none)')
  console.log('exp     :', decoded.exp ? new Date((decoded.exp as number) * 1000).toISOString() : '(none)')
  console.groupEnd()
}

interface UserProfile {
  sub: string
  firstName?: string
  lastName?: string
  email?: string
}

interface UserState {
  // Auth
  isLoggedIn: boolean
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number
  user: UserProfile | null
  loginLoading: boolean
  loginError: string | null

  // Bookmarks
  bookmarks: Bookmark[]
  bookmarkedVerseKeys: Set<string>
  bookmarksLoading: boolean

  // Streaks
  currentStreakDays: number
  streaks: Streak[]
  activityDays: ActivityDay[]
  streakLoading: boolean
  lastActivityLoggedAt: number | null

  // Actions
  login: () => Promise<void>
  handleCallback: (code: string, state: string) => Promise<void>
  logout: () => void
  restoreSession: () => Promise<void>

  // Bookmark actions
  toggleBookmark: (verseKey: string) => Promise<void>
  isBookmarked: (verseKey: string) => boolean

  // Streak actions
  logReading: (seconds: number, ranges?: string[]) => Promise<void>
  refreshStreak: () => Promise<void>

  // Internal
  _fetchBookmarks: (token: string) => Promise<void>
  _fetchStreakData: (token: string) => Promise<void>
}

/** Convert API bookmark to verse key string */
function bookmarkToVerseKey(b: Bookmark): string {
  return `${b.key}:${b.verseNumber}`
}

export const useUserStore = create<UserState>((set, get) => ({
  isLoggedIn: false,
  accessToken: null,
  refreshToken: null,
  expiresAt: 0,
  user: null,
  loginLoading: false,
  loginError: null,

  bookmarks: [],
  bookmarkedVerseKeys: new Set(),
  bookmarksLoading: false,

  currentStreakDays: 0,
  streaks: [],
  activityDays: [],
  streakLoading: false,
  lastActivityLoggedAt: null,

  // ── Auth actions ────────────────────────────────────────────────────────

  login: async () => {
    set({ loginLoading: true, loginError: null })
    try {
      const url = await buildLoginUrl()
      window.location.href = url
    } catch (err) {
      set({
        loginLoading: false,
        loginError: err instanceof Error ? err.message : 'Login failed',
      })
    }
  },

  handleCallback: async (code, state) => {
    const pkce = getStoredPkce()
    if (!pkce) throw new Error('No PKCE params found — login flow was not initiated from this tab')

    // Validate state (CSRF protection)
    if (pkce.state !== state) throw new Error('OAuth state mismatch')

    // Exchange code for tokens via our backend proxy
    const res = await fetch('/api/auth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        codeVerifier: pkce.codeVerifier,
        redirectUri: pkce.redirectUri,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Token exchange failed' }))
      throw new Error(err.error ?? 'Token exchange failed')
    }

    const data = await res.json()
    clearStoredPkce()
    logTokenScopes('fresh login — access token', data.accessToken)

    const user: UserProfile | null = data.user
      ? {
          sub: data.user.sub,
          firstName: data.user.first_name,
          lastName: data.user.last_name,
          email: data.user.email,
        }
      : null

    // Persist refresh token and user profile
    if (data.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
    }
    if (user) {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user))
    }

    set({
      isLoggedIn: true,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      expiresAt: Date.now() + (data.expiresIn ?? 3600) * 1000,
      user,
      loginLoading: false,
      loginError: null,
    })

    // Fetch bookmarks and streak data after login
    if (data.accessToken) {
      get()._fetchBookmarks(data.accessToken)
      get()._fetchStreakData(data.accessToken)
    }
  },

  logout: () => {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_PROFILE_KEY)
    set({
      isLoggedIn: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: 0,
      user: null,
      bookmarks: [],
      bookmarkedVerseKeys: new Set(),
      currentStreakDays: 0,
      streaks: [],
      activityDays: [],
      lastActivityLoggedAt: null,
    })
  },

  restoreSession: async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) return

    // Restore user profile from localStorage immediately (for UI)
    const savedProfile = localStorage.getItem(USER_PROFILE_KEY)
    if (savedProfile) {
      try {
        set({ user: JSON.parse(savedProfile) })
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) {
        // Refresh failed — clear stale tokens
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        return
      }

      const data = await res.json()
      logTokenScopes('restore session — refreshed access token', data.accessToken)

      if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      }

      set({
        isLoggedIn: true,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? refreshToken,
        expiresAt: Date.now() + (data.expiresIn ?? 3600) * 1000,
      })

      // Fetch bookmarks and streak data
      if (data.accessToken) {
        get()._fetchBookmarks(data.accessToken)
        get()._fetchStreakData(data.accessToken)
      }
    } catch {
      // Silent fail — user just won't be logged in
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  },

  // ── Bookmark actions ──────────────────────────────────────────────────

  toggleBookmark: async (verseKey) => {
    const { accessToken, bookmarkedVerseKeys, bookmarks } = get()
    if (!accessToken) return

    const isCurrentlyBookmarked = bookmarkedVerseKeys.has(verseKey)

    // Optimistic update
    const newSet = new Set(bookmarkedVerseKeys)
    if (isCurrentlyBookmarked) {
      newSet.delete(verseKey)
      set({
        bookmarkedVerseKeys: newSet,
        bookmarks: bookmarks.filter(b => bookmarkToVerseKey(b) !== verseKey),
      })
    } else {
      const [surahStr, ayahStr] = verseKey.split(':')
      const optimistic: Bookmark = {
        id: `optimistic-${verseKey}`,
        type: 'ayah',
        key: Number(surahStr),
        verseNumber: Number(ayahStr),
        createdAt: new Date().toISOString(),
      }
      newSet.add(verseKey)
      set({ bookmarkedVerseKeys: newSet, bookmarks: [...bookmarks, optimistic] })
    }

    try {
      if (isCurrentlyBookmarked) {
        const existing = get().bookmarks.find(b => bookmarkToVerseKey(b) === verseKey)
        if (!existing) { get()._fetchBookmarks(accessToken); return }
        await apiRemoveBookmark(accessToken, existing.id)
      } else {
        const newBookmark = await apiAddBookmark(accessToken, verseKey)
        // Replace optimistic entry with real bookmark from API
        set({
          bookmarks: [
            ...get().bookmarks.filter(b => b.id !== `optimistic-${verseKey}`),
            newBookmark,
          ],
        })
      }
    } catch (err) {
      console.error('[UserStore] Bookmark toggle failed:', err)
      // Revert optimistic update
      get()._fetchBookmarks(accessToken)
    }
  },

  isBookmarked: (verseKey) => get().bookmarkedVerseKeys.has(verseKey),

  // ── Streak actions ────────────────────────────────────────────────────

  logReading: async (seconds, ranges) => {
    const { accessToken } = get()
    if (!accessToken) return

    const result = await logActivityDay(accessToken, { seconds, ranges })
    if (result) {
      set({ lastActivityLoggedAt: Date.now() })
      // Refresh streak count after logging
      get().refreshStreak()
    }
  },

  refreshStreak: async () => {
    const { accessToken } = get()
    if (!accessToken) return
    await get()._fetchStreakData(accessToken)
  },

  // ── Internal ──────────────────────────────────────────────────────────

  _fetchBookmarks: async (token: string) => {
    set({ bookmarksLoading: true })
    try {
      const bookmarks = await fetchBookmarks(token)
      const verseKeys = new Set(
        bookmarks
          .filter(b => b.type === 'ayah' && b.verseNumber != null)
          .map(bookmarkToVerseKey),
      )
      set({ bookmarks, bookmarkedVerseKeys: verseKeys, bookmarksLoading: false })
    } catch (err) {
      console.error('[UserStore] Fetch bookmarks failed:', err)
      set({ bookmarksLoading: false })
    }
  },

  _fetchStreakData: async (token: string) => {
    set({ streakLoading: true })
    try {
      // Fetch current streak days and recent activity in parallel
      const [days, streaks, activityDays] = await Promise.all([
        fetchCurrentStreakDays(token),
        fetchStreaks(token, { status: 'ACTIVE', first: 5 }),
        fetchActivityDays(
          token,
          // Last 30 days
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          new Date().toISOString().split('T')[0],
        ),
      ])

      set({
        currentStreakDays: days,
        streaks,
        activityDays,
        streakLoading: false,
      })
    } catch (err) {
      console.error('[UserStore] Fetch streak data failed:', err)
      set({ streakLoading: false })
    }
  },
}))
