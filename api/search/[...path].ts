/**
 * Search API Proxy — Vercel Serverless Function
 * Route: /api/search/*
 *
 * Proxies authenticated requests to the Quran Foundation Search API.
 * Uses a separate 'search' scope token (different from the 'content' scope).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getSearchToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken

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
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'search' }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Search token failed: ${res.status} ${JSON.stringify(err)}`)
  }

  const json = await res.json()
  cachedToken = json.access_token
  tokenExpiresAt = Date.now() + (json.expires_in ?? 3600) * 1000
  return cachedToken!
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const isProd = (process.env.APP_ENV ?? 'prod') === 'prod'
  const prefix = isProd ? 'PROD' : 'TEST'
  const clientId = process.env[`${prefix}_CLIENT_ID`] ?? ''
  const contentEndpoint = process.env[`${prefix}_CONTENT_ENDPOINT`] ?? ''

  if (!contentEndpoint) {
    return res.status(500).json({ error: 'Content endpoint not configured' })
  }

  const pathSegments = req.query.path
  const apiPath = Array.isArray(pathSegments) ? pathSegments.join('/') : (pathSegments ?? '')

  const queryParams = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    if (Array.isArray(value)) value.forEach(v => queryParams.append(key, v))
    else if (value !== undefined) queryParams.append(key, value as string)
  }
  const qs = queryParams.toString()
  const targetUrl = `${contentEndpoint}/search/${apiPath}${qs ? `?${qs}` : ''}`

  try {
    const token = await getSearchToken()
    const upstream = await fetch(targetUrl, {
      headers: { 'x-auth-token': token, 'x-client-id': clientId },
    })
    const json = await upstream.json()
    return res.status(upstream.status).json(json)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return res.status(502).json({ error: `Search proxy failed: ${msg}` })
  }
}
