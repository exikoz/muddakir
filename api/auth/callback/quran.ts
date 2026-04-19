/**
 * Quran Foundation OAuth 2.0 Callback Handler
 * Route: /api/auth/callback/quran
 *
 * This is the registered redirect_uri with the Quran Foundation.
 * It receives the authorization code from QF after the user grants access,
 * then redirects the browser to the SPA callback page (/auth/callback)
 * which handles the token exchange via the frontend store.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  const code  = req.query.code  as string | undefined
  const state = req.query.state as string | undefined
  const error = req.query.error as string | undefined
  const errorDescription = req.query.error_description as string | undefined

  // Build the SPA callback URL, forwarding all relevant params
  const spaCallback = new URL('/auth/callback', `https://${req.headers.host ?? 'localhost'}`)

  if (error) {
    spaCallback.searchParams.set('error', error)
    if (errorDescription) spaCallback.searchParams.set('error_description', errorDescription)
  } else {
    if (code)  spaCallback.searchParams.set('code', code)
    if (state) spaCallback.searchParams.set('state', state)
  }

  // 302 redirect to the SPA page which handles token exchange
  res.redirect(302, spaCallback.toString())
}
