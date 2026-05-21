/**
 * OAuth 2.0 PKCE helpers for Quran Foundation User APIs.
 *
 * The browser generates PKCE (code_verifier + code_challenge) and redirects
 * to the QF hosted login page. After login, the callback page captures the
 * authorization code and sends it (with code_verifier) to our backend
 * `/api/auth/exchange` which holds the client_secret and performs the
 * token exchange server-side.
 */

const PKCE_STORAGE_KEY = 'muddakir_pkce'

// ── Environment config ──────────────────────────────────────────────────────

function getEnvConfig() {
  const isProd = (import.meta.env.VITE_APP_ENV ?? 'prod') === 'prod'
  return isProd
    ? {
        authBase: 'https://oauth2.quran.foundation',
        apiBase: 'https://apis.quran.foundation',
        clientId: import.meta.env.VITE_USER_CLIENT_ID as string,
      }
    : {
        authBase: 'https://prelive-oauth2.quran.foundation',
        apiBase: 'https://apis-prelive.quran.foundation',
        clientId: import.meta.env.VITE_USER_CLIENT_ID as string,
      }
}

// ── PKCE utilities ──────────────────────────────────────────────────────────

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)).buffer)
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain))
}

export interface PkceParams {
  codeVerifier: string
  state: string
  nonce: string
  redirectUri: string
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Build the authorization URL and persist PKCE params in sessionStorage.
 * Returns the full URL to redirect the user to.
 */
export async function buildLoginUrl(): Promise<string> {
  const { authBase, clientId } = getEnvConfig()
  if (!clientId) throw new Error('VITE_USER_CLIENT_ID not configured')

  const codeVerifier = randomString(32)
  const codeChallenge = base64url(await sha256(codeVerifier))
  const state = randomString(16)
  const redirectUri = `${window.location.origin}/api/auth/callback/quran`

  // Persist for the callback page (nonce only needed with openid scope)
  const pkce: PkceParams = { codeVerifier, state, nonce: '', redirectUri }
  sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(pkce))

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'offline_access user collection',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `${authBase}/oauth2/auth?${params.toString()}`
}

/**
 * Retrieve stored PKCE params (used by the callback handler).
 * Returns null if nothing stored (e.g. user navigated directly).
 */
export function getStoredPkce(): PkceParams | null {
  const raw = sessionStorage.getItem(PKCE_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PkceParams
  } catch {
    return null
  }
}

/** Clear stored PKCE params after use. */
export function clearStoredPkce(): void {
  sessionStorage.removeItem(PKCE_STORAGE_KEY)
}

/** Get the API base URL for User API calls. */
export function getUserApiBase(): string {
  return getEnvConfig().apiBase
}

/** Get the client ID for User API headers. */
export function getUserClientId(): string {
  return getEnvConfig().clientId
}
