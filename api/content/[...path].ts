/**
 * Content API Proxy — Vercel Serverless Function
 * Route: /api/content/*
 *
 * Proxies authenticated requests to the Quran Foundation Content API.
 * Uses a server-side client_credentials token (cached in memory across
 * warm invocations) so the client never needs to handle content auth.
 *
 * For user-authenticated requests (e.g. bookmarks), the x-auth-token
 * header from the client is forwarded instead.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

// ── In-memory token cache (survives across warm invocations) ────────────────

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getContentToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const isProd = (process.env.APP_ENV ?? 'prod') === 'prod'
  const prefix = isProd ? 'PROD' : 'TEST'

  const clientId = process.env[`${prefix}_CLIENT_ID`] ?? ''
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`] ?? ''
  const authEndpoint = process.env[`${prefix}_AUTH_ENDPOINT`] ?? ''

  if (!authEndpoint || !clientId || !clientSecret) {
    throw new Error('OAuth credentials not configured')
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(authEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'content',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Content token request failed: ${res.status} ${JSON.stringify(err)}`)
  }

  const json = await res.json()
  cachedToken = json.access_token
  tokenExpiresAt = Date.now() + (json.expires_in ?? 3600) * 1000
  return cachedToken!
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const isProd = (process.env.APP_ENV ?? 'prod') === 'prod'
  const prefix = isProd ? 'PROD' : 'TEST'

  const clientId = process.env[`${prefix}_CLIENT_ID`] ?? ''
  const contentEndpoint = process.env[`${prefix}_CONTENT_ENDPOINT`] ?? ''

  if (!contentEndpoint) {
    return res.status(500).json({ error: 'Content endpoint not configured' })
  }

  // Reconstruct the path after /api/content/
  const pathSegments = req.query.path
  const apiPath = Array.isArray(pathSegments) ? pathSegments.join('/') : (pathSegments ?? '')

  // Forward query params (exclude the catch-all 'path' param)
  const queryParams = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    if (Array.isArray(value)) {
      value.forEach(v => queryParams.append(key, v))
    } else if (value !== undefined) {
      queryParams.append(key, value as string)
    }
  }
  const qs = queryParams.toString()
  const targetUrl = `${contentEndpoint}/${apiPath}${qs ? `?${qs}` : ''}`

  try {
    const headers: Record<string, string> = {
      'x-client-id': clientId,
    }

    // If the client sent a user auth token, forward it (for user-specific content)
    const userAuthToken = req.headers['x-auth-token']
    if (userAuthToken && typeof userAuthToken === 'string') {
      headers['x-auth-token'] = userAuthToken
    } else {
      // Use server-side client_credentials token for public content
      try {
        const contentToken = await getContentToken()
        headers['Authorization'] = `Bearer ${contentToken}`
      } catch (err) {
        console.error('[content proxy] Failed to get content token:', err)
        // Fall through — request may still work for some endpoints
      }
    }

    const upstream = await fetch(targetUrl, { headers })
    const json = await upstream.json()

    return res.status(upstream.status).json(json)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return res.status(502).json({ error: `Content proxy failed: ${msg}` })
  }
}
