/**
 * Quran Foundation OAuth 2.0 Callback Handler
 * Route: /api/auth/callback/quran
 *
 * This endpoint receives the authorization code from the Quran Foundation
 * after the user grants access. Exchange the `code` for an access token
 * using the Quran Foundation token endpoint.
 *
 * Compatible with Vercel Serverless Functions.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const rawUrl = req.url ?? '/'
  const url = new URL(rawUrl, `http://${req.headers.host ?? 'localhost'}`)

  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  console.log('[Muddakir] /api/auth/callback/quran — OAuth callback received')
  console.log('  method:', req.method)
  console.log('  code  :', code  ?? '(none)')
  console.log('  state :', state ?? '(none)')
  if (error) {
    console.warn('  error :', error)
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error }))
    return
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'missing_code' }))
    return
  }

  // TODO: Exchange `code` for an access token
  // POST to Quran Foundation token endpoint with:
  //   grant_type=authorization_code, code, redirect_uri, client_id, client_secret
  // Store the resulting token securely (e.g. encrypted session / DB).

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    ok: true,
    message: 'OAuth callback received. Token exchange not yet implemented.',
    code,
    state,
  }))
}
