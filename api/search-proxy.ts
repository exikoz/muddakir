/**
 * Search API Proxy — Vercel Serverless Function
 * Route: /api/search-proxy/*
 *
 * Flat file (not a subdirectory catch-all) so Vercel routes it correctly
 * for Vite projects. Handles all /api/search-proxy/... requests.
 *
 * Proxies authenticated requests to the Quran Foundation Search API
 * using a 'search' scope OAuth token.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getSearchToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken

  const isProd = (process.env.APP_ENV ?? 'prod') === 'prod'
  const prefix = isProd ? 'PROD' : 'TEST'

  const clientId     = process.env[`${prefix}_CLIENT_ID`]     ?? ''
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`] ?? ''
  const authEndpoint = process.env[`${prefix}_AUTH_ENDPOINT`] ?? ''

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

  const clientId    = process.env[`${prefix}_CLIENT_ID`]       ?? ''
  // PROD_SEARCH_ENDPOINT e.g. https://apis.quran.foundation/search
  const searchBase  = process.env[`${prefix}_SEARCH_ENDPOINT`]
    ?? (process.env[`${prefix}_CONTENT_ENDPOINT`]?.replace('/content', '/search') ?? '')

  if (!searchBase) {
    console.error(`[search proxy] ${prefix}_SEARCH_ENDPOINT is not set`)
    return res.status(500).json({ error: 'Search endpoint not configured' })
  }

  // Extract everything after /api/search-proxy from the raw URL
  const rawUrl = req.url ?? ''
  const afterPrefix = rawUrl.replace(/^\/api\/search-proxy\/?/, '')
  const qmark = afterPrefix.indexOf('?')
  const apiPath = qmark === -1 ? afterPrefix : afterPrefix.slice(0, qmark)
  const qs      = qmark === -1 ? ''          : afterPrefix.slice(qmark + 1)

  const targetUrl = `${searchBase}/${apiPath}${qs ? `?${qs}` : ''}`
  console.log(`[search proxy] → ${targetUrl}`)

  try {
    const token = await getSearchToken()
    const upstream = await fetch(targetUrl, {
      headers: { 'x-auth-token': token, 'x-client-id': clientId },
    })

    if (!upstream.ok) {
      const body = await upstream.text()
      console.error(`[search proxy] upstream ${upstream.status}: ${body.slice(0, 200)}`)
      return res.status(upstream.status).json({ error: body })
    }

    const json = await upstream.json()
    return res.status(200).json(json)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[search proxy] fetch error:', msg)
    return res.status(502).json({ error: `Search proxy failed: ${msg}` })
  }
}
