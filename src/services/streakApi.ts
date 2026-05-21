/**
 * Streak & Activity API service — Quran Foundation User APIs.
 *
 * Endpoints:
 *   GET  /auth/v1/streaks                    — list user streaks
 *   GET  /auth/v1/streaks/current-streak-days — current active streak count
 *   POST /auth/v1/activity-days              — log reading activity
 *   GET  /auth/v1/activity-days              — fetch activity calendar
 */

import { getUserApiBase, getUserClientId } from '../lib/userAuth'

// ── Types ───────────────────────────────────────────────────────────────────

export interface Streak {
  id: string
  type: 'QURAN'
  days: number
  startDate: string
  endDate: string | null
  status: 'ACTIVE' | 'BROKEN'
}

export interface CurrentStreakDays {
  days: number
  type: 'QURAN'
}

export interface ActivityDay {
  id: string
  date: string
  type: 'QURAN'
  seconds: number
  ranges?: string[]
  progress?: number
}

// ── Internal helpers ────────────────────────────────────────────────────────

async function userFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const base = getUserApiBase()
  const clientId = getUserClientId()

  const headers: Record<string, string> = {
    'x-auth-token': token,
    'x-client-id': clientId,
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  }

  const res = await fetch(`${base}${path}`, { ...init, headers })

  if (!res.ok) {
    const body = await res.clone().text().catch(() => '')
    console.error(`[streakApi] ${init?.method ?? 'GET'} ${path} → ${res.status}:`, body)
  }

  return res
}

// ── Streak endpoints ────────────────────────────────────────────────────────

/**
 * Get the user's current active streak day count.
 */
export async function fetchCurrentStreakDays(token: string): Promise<number> {
  const res = await userFetch('/auth/v1/streaks/current-streak-days?type=QURAN', token)
  if (!res.ok) {
    console.warn('[streakApi] fetchCurrentStreakDays failed:', res.status)
    return 0
  }
  const json = await res.json()
  return json.data?.days ?? json.days ?? 0
}

/**
 * Get user streaks (active and broken).
 */
export async function fetchStreaks(
  token: string,
  options?: { status?: 'ACTIVE' | 'BROKEN'; first?: number },
): Promise<Streak[]> {
  const params = new URLSearchParams({ type: 'QURAN' })
  if (options?.status) params.set('status', options.status)
  if (options?.first) params.set('first', String(options.first))

  const res = await userFetch(`/auth/v1/streaks?${params}`, token)
  if (!res.ok) {
    console.warn('[streakApi] fetchStreaks failed:', res.status)
    return []
  }
  const json = await res.json()
  return (json.data ?? []) as Streak[]
}

// ── Activity Day endpoints ──────────────────────────────────────────────────

/**
 * Log a reading activity for today (or a specific date).
 * This updates the user's streak automatically on the backend.
 */
export async function logActivityDay(
  token: string,
  options: {
    seconds: number
    mushafId?: number
    ranges?: string[]
    date?: string // YYYY-MM-DD, defaults to today
  },
): Promise<ActivityDay | null> {
  const body: Record<string, unknown> = {
    type: 'QURAN',
    seconds: options.seconds,
    mushafId: options.mushafId ?? 2, // QCFV1
  }
  if (options.ranges?.length) body.ranges = options.ranges
  if (options.date) body.date = options.date

  const res = await userFetch('/auth/v1/activity-days', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.warn('[streakApi] logActivityDay failed:', res.status)
    return null
  }
  const json = await res.json()
  return json.data as ActivityDay
}

/**
 * Fetch activity days for a date range (for calendar display).
 */
export async function fetchActivityDays(
  token: string,
  from: string,
  to: string,
): Promise<ActivityDay[]> {
  const params = new URLSearchParams({ from, to, type: 'QURAN' })
  const res = await userFetch(`/auth/v1/activity-days?${params}`, token)
  if (!res.ok) {
    console.warn('[streakApi] fetchActivityDays failed:', res.status)
    return []
  }
  const json = await res.json()
  return (json.data ?? []) as ActivityDay[]
}
