/**
 * User store — manages authentication state and bookmarks.
 *
 * Follows the same Zustand pattern as aiScopeStore / verseDetailStore.
 * Auth tokens are kept in memory (access) and localStorage (refresh).
 * Bookmarks are synced from the Quran Foundation User API on login.
 */

import { create } from 'zustand'
import { buildLoginUrl, getStoredPkce, clearStoredPkce } from '../lib/userAuth'
import {
  fetchBookmarks,
  addBookmark as apiAddBookmark,
  removeBookmark as apiRemoveBookmark,
} from '../services/userApi'
import type { Bookmark } from '../services/userApi'

const REFRESH_TOKEN_KEY = 'muddakir_refresh_token'
const USER_PROFILE_KEY = 'muddakir_user_profile'

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

  // Actions
  login: () => Promise<void>
  handleCallback: (code: string, state: string) => Promise<void>
  logout: () => void
  restoreSession: () => Promise<void>

  // Bookmark actions
  toggleBookmark: (verseKey: string) => Promise<void>
  isBookmarked: (verseKey: string) => boolean

  // Internal
  _fetchBookmarks: (token: string) => Promise<void>
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

    // Fetch bookmarks after login
    if (data.accessToken) {
      get()._fetchBookmarks(data.accessToken)
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

      if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      }

      set({
        isLoggedIn: true,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? refreshToken,
        expiresAt: Date.now() + (data.expiresIn ?? 3600) * 1000,
      })

      // Fetch bookmarks
      if (data.accessToken) {
        get()._fetchBookmarks(data.accessToken)
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
      newSet.add(verseKey)
      set({ bookmarkedVerseKeys: newSet })
    }

    try {
      if (isCurrentlyBookmarked) {
        await apiRemoveBookmark(accessToken, verseKey)
      } else {
        const newBookmark = await apiAddBookmark(accessToken, verseKey)
        set({ bookmarks: [...get().bookmarks, newBookmark] })
      }
    } catch (err) {
      console.error('[UserStore] Bookmark toggle failed:', err)
      // Revert optimistic update
      get()._fetchBookmarks(accessToken)
    }
  },

  isBookmarked: (verseKey) => get().bookmarkedVerseKeys.has(verseKey),

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
}))
