/**
 * Content API Proxy — Vercel Serverless Function
 * Route: /api/content/*
 *
 * Proxies authenticated requests to the Quran Foundation Content API.
 * The client sends the auth token; this proxy forwards it and injects
 * the x-client-id header server-side.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

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
  const targetUrl = `${contentEndpoint}/content/${apiPath}`

  try {
    const headers: Record<string, string> = {
      'x-client-id': clientId,
    }

    // Forward the auth token from the client
    const authToken = req.headers['x-auth-token']
    if (authToken && typeof authToken === 'string') {
      headers['x-auth-token'] = authToken
    }

    const upstream = await fetch(targetUrl, { headers })
    const json = await upstream.json()

    return res.status(upstream.status).json(json)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return res.status(502).json({ error: `Content proxy failed: ${msg}` })
  }
}
