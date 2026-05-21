/**
 * Content API Proxy — Vercel Serverless Function
 * Route: /api/content/*
 *
 * Proxies authenticated requests to the Quran Foundation Content API.
 * The full content base URL (including path prefix) comes from the
 * PROD_CONTENT_ENDPOINT / TEST_CONTENT_ENDPOINT env var so nothing
 * is hardcoded here.
 *
 * Expected env var value: https://apis.quran.foundation/content
 * (or https://apis-prelive.quran.foundation/content for test)
 *
 * Auth: the browser always sends x-auth-token via contentFetch → auth.ts.
 * The proxy forwards that token. The server-side fallback (client_credentials)
 * is only used if the browser request arrives without a token.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

// ── In-memory token cache (survives warm invocations) ───────────────────────

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getContentToken(
  clientId: string,
  clientSecret: string,
  authEndpoint: string,
): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken

  if (!authEndpoint || !clientId || !clientSecret) {
    throw new Error('OAuth credentials not configured')
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(authEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'content' }),
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

  const clientId      = process.env[`${prefix}_CLIENT_ID`]       ?? ''
  const clientSecret  = process.env[`${prefix}_CLIENT_SECRET`]   ?? ''
  const authEndpoint  = process.env[`${prefix}_AUTH_ENDPOINT`]   ?? ''
  // Full base URL including path prefix, e.g. https://apis.quran.foundation/content
  const contentBase   = process.env[`${prefix}_CONTENT_ENDPOINT`] ?? ''

  if (!contentBase) {
    console.error(`[content proxy] ${prefix}_CONTENT_ENDPOINT is not set`)
    return res.status(500).json({ error: 'Content endpoint not configured' })
  }

  // Reconstruct the path after /api/content/
  const pathSegments = req.query.path
  const apiPath = Array.isArray(pathSegments) ? pathSegments.join('/') : (pathSegments ?? '')

  // Rebuild query string (exclude the catch-all 'path' param)
  const queryParams = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    if (Array.isArray(value)) value.forEach(v => queryParams.append(key, v))
    else if (value !== undefined) queryParams.append(key, value as string)
  }
  const qs = queryParams.toString()
  const targetUrl = `${contentBase}/${apiPath}${qs ? `?${qs}` : ''}`

  console.log(`[content proxy] → ${targetUrl}`)

  try {
    const headers: Record<string, string> = { 'x-client-id': clientId }

    // Browser always sends x-auth-token via contentFetch — forward it.
    // Fallback: obtain a server-side client_credentials token.
    const userAuthToken = req.headers['x-auth-token']
    if (userAuthToken && typeof userAuthToken === 'string') {
      headers['x-auth-token'] = userAuthToken
    } else {
      try {
        const token = await getContentToken(clientId, clientSecret, authEndpoint)
        // API uses x-auth-token, not Authorization: Bearer
        headers['x-auth-token'] = token
      } catch (err) {
        console.error('[content proxy] Failed to get server-side token:', err)
        // Continue without auth — will likely 404 but log will show why
      }
    }

    const upstream = await fetch(targetUrl, { headers })

    if (!upstream.ok) {
      const body = await upstream.text()
      console.error(`[content proxy] upstream ${upstream.status}: ${body.slice(0, 200)}`)
      return res.status(upstream.status).json({ error: body })
    }

    const json = await upstream.json()
    return res.status(200).json(json)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[content proxy] fetch error:', msg)
    return res.status(502).json({ error: `Content proxy failed: ${msg}` })
  }
}
