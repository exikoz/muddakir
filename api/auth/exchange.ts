/**
 * OAuth Token Exchange — Vercel Serverless Function
 * Route: /api/auth/exchange
 *
 * Receives authorization code + PKCE code_verifier from the browser,
 * exchanges them for tokens using the client_secret (server-side only).
 * Returns access_token, refresh_token, and decoded id_token user info.
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

  const { code, codeVerifier, redirectUri } = req.body ?? {}

  if (!code || !codeVerifier || !redirectUri) {
    return res.status(400).json({ error: 'Missing code, codeVerifier, or redirectUri' })
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
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
      return res.status(upstream.status).json({ error: json.error ?? 'Token exchange failed' })
    }

    // Prefer id_token if present (openid scope). Otherwise fetch /userinfo
    // with the access token — same data, just one extra round-trip.
    let user = null

    if (json.id_token) {
      try {
        const payload = json.id_token.split('.')[1]
        user = JSON.parse(Buffer.from(payload, 'base64').toString())
      } catch { /* ignore decode errors */ }
    }

    if (!user && json.access_token) {
      try {
        const userRes = await fetch(`${authEndpoint}/userinfo`, {
          headers: { Authorization: `Bearer ${json.access_token}` },
        })
        if (userRes.ok) user = await userRes.json()
      } catch { /* ignore userinfo errors — user stays null */ }
    }

    return res.status(200).json({
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
      scope: json.scope,
      user,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return res.status(502).json({ error: `Token exchange failed: ${msg}` })
  }
}
