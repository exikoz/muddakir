/**
 * Token cache + authenticated fetch against the Content API proxy.
 * Mirrors the working pattern from the sirat prototype.
 */

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID as string | undefined

let cachedToken: string | null = null
let expiresAt = 0
let inflightPromise: Promise<string> | null = null
let tokenFailedUntil = 0
const TOKEN_BACKOFF_MS = 60_000

async function fetchToken(): Promise<string> {
  const res = await fetch('/api-proxy/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'content' }),
  })
  if (!res.ok) {
    tokenFailedUntil = Date.now() + TOKEN_BACKOFF_MS
    throw new Error(`Token request failed: ${res.status}`)
  }
  tokenFailedUntil = 0
  const json = await res.json()
  cachedToken = json.access_token as string
  expiresAt = Date.now() + (json.expires_in as number) * 1000
  return cachedToken
}

export async function getAccessToken(): Promise<string> {
  if (Date.now() < tokenFailedUntil) throw new Error('Token endpoint unavailable — backing off')
  if (cachedToken && Date.now() < expiresAt - 30_000) return cachedToken
  if (!inflightPromise) {
    inflightPromise = fetchToken().finally(() => { inflightPromise = null })
  }
  return inflightPromise
}

export function clearToken(): void {
  cachedToken = null
  expiresAt = 0
}

/** Authenticated fetch against the Content API proxy. Retries once on 401. */
export async function contentFetch(path: string): Promise<Response> {
  const token = await getAccessToken()
  const headers: Record<string, string> = {
    'x-auth-token': token,
    'x-client-id': CLIENT_ID ?? '',
  }

  let res = await fetch(`/api-proxy/content${path}`, { headers })

  if (res.status === 401) {
    clearToken()
    headers['x-auth-token'] = await getAccessToken()
    res = await fetch(`/api-proxy/content${path}`, { headers })
  }

  return res
}
