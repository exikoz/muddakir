/**
 * OAuth Token Refresh — Vercel Serverless Function
 * Route: /api/auth/refresh
 *
 * Exchanges a refresh_token for a new access_token.
 * Client secret stays server-side.
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
  const authEndpoint = isProd
    ? 'https://oauth2.quran.foundation'
    : 'https://prelive-oauth2.quran.foundation'

  const { refreshToken } = req.body ?? {}

  if (!refreshToken) {
    return res.status(400).json({ error: 'Missing refreshToken' })
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const upstream = await fetch(`${authEndpoint}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const json = await upstream.json()

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: json.error ?? 'Token refresh failed' })
    }

    return res.status(200).json({
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return res.status(502).json({ error: `Token refresh failed: ${msg}` })
  }
}
