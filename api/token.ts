/**
 * OAuth Token Endpoint — Vercel Serverless Function
 * Route: /api/token
 *
 * Proxies client_credentials token requests to the Quran Foundation
 * OAuth endpoint, injecting the client secret server-side so it
 * never reaches the browser.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const isProd = (process.env.APP_ENV ?? 'prod') === 'prod'
  const prefix = isProd ? 'PROD' : 'TEST'

  const clientId = process.env[`${prefix}_CLIENT_ID`] ?? ''
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`] ?? ''
  const authEndpoint = process.env[`${prefix}_AUTH_ENDPOINT`] ?? ''

  if (!authEndpoint || !clientId || !clientSecret) {
    return res.status(500).json({ error: 'OAuth credentials not configured' })
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const upstream = await fetch(authEndpoint, {
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

    const json = await upstream.json()

    if (!upstream.ok) {
      return res.status(upstream.status).json(json)
    }

    return res.status(200).json(json)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return res.status(502).json({ error: `Token exchange failed: ${msg}` })
  }
}
