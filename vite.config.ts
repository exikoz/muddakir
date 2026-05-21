import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = (env.APP_ENV ?? 'prod') === 'prod'
  const prefix = isProd ? 'PROD' : 'TEST'

  const clientId      = env[`${prefix}_CLIENT_ID`]        ?? ''
  const clientSecret  = env[`${prefix}_CLIENT_SECRET`]    ?? ''
  const authEndpoint  = env[`${prefix}_AUTH_ENDPOINT`]    ?? ''
  const contentTarget = env[`${prefix}_CONTENT_ENDPOINT`] ?? ''

  // Only parse URL if authEndpoint is provided
  let authTarget = ''
  let authPath = ''
  if (authEndpoint) {
    try {
      const authUrl = new URL(authEndpoint)
      authTarget = authUrl.origin   // e.g. https://oauth2.quran.foundation
      authPath = authUrl.pathname   // e.g. /oauth2/token
    } catch {
      console.warn(`[vite] Invalid AUTH_ENDPOINT: ${authEndpoint}`)
    }
  }

  console.log(`[vite] APP_ENV=${env.APP_ENV ?? 'prod'} → using ${prefix} credentials`)

  // User API OAuth base (same origin as content auth, used for code exchange)
  const userAuthBase = authTarget // e.g. https://oauth2.quran.foundation

  return {
    define: {
      'import.meta.env.VITE_CLIENT_ID': JSON.stringify(clientId),
      'import.meta.env.VITE_APP_ENV': JSON.stringify(env.APP_ENV ?? 'prod'),
      'import.meta.env.VITE_USER_CLIENT_ID': JSON.stringify(clientId),
    },
    plugins: [
      react(),
      tailwindcss(),
      babel({ presets: [reactCompilerPreset()] }),
      // Inline handler for /api/auth/exchange and /api/auth/refresh during dev
      {
        name: 'auth-exchange-proxy',
        configureServer(server) {
          // OAuth callback redirect — mirrors the Vercel serverless function
          // QF redirects here; we forward code+state to the SPA callback page
          server.middlewares.use('/api/auth/callback/quran', (req, res) => {
            const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
            const spaCallback = new URL('/auth/callback', `http://${req.headers.host}`)
            for (const [key, val] of url.searchParams) {
              spaCallback.searchParams.set(key, val)
            }
            res.writeHead(302, { Location: spaCallback.pathname + spaCallback.search })
            res.end()
          })

          // Token exchange (authorization code → access token)
          server.middlewares.use('/api/auth/exchange', async (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return }
            let body = ''
            for await (const chunk of req) body += chunk
            try {
              const { code, codeVerifier, redirectUri } = JSON.parse(body)
              const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
              })
              const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
              const upstream = await fetch(`${userAuthBase}/oauth2/token`, {
                method: 'POST',
                headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
              })
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const json = await upstream.json() as any
              if (!upstream.ok) { res.statusCode = upstream.status; res.end(JSON.stringify(json)); return }
              let user = null
              if (json.id_token) {
                try { user = JSON.parse(Buffer.from(json.id_token.split('.')[1], 'base64').toString()) } catch {}
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ accessToken: json.access_token, refreshToken: json.refresh_token, expiresIn: json.expires_in, scope: json.scope, user }))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(err) }))
            }
          })

          // Token refresh
          server.middlewares.use('/api/auth/refresh', async (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return }
            let body = ''
            for await (const chunk of req) body += chunk
            try {
              const { refreshToken } = JSON.parse(body)
              const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
              const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
              const upstream = await fetch(`${userAuthBase}/oauth2/token`, {
                method: 'POST',
                headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
              })
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const json = await upstream.json() as any
              if (!upstream.ok) { res.statusCode = upstream.status; res.end(JSON.stringify(json)); return }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ accessToken: json.access_token, refreshToken: json.refresh_token, expiresIn: json.expires_in }))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(err) }))
            }
          })
        },
      },
    ],
    server: {
      proxy: {
        // Token endpoint — injects Basic auth server-side, secret never hits the browser
        '/api/token': {
          target: authTarget,
          changeOrigin: true,
          rewrite: () => authPath,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
              proxyReq.setHeader('Authorization', `Basic ${basic}`)
              proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded')
            })
          },
        },
        // Content API — strips /api/content-proxy, forwards to contentTarget
        // contentTarget must include the full base path, e.g.
        //   https://apis.quran.foundation/content
        '/api/content-proxy': {
          target: contentTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/content-proxy/, ''),
          configure: (proxy) => {
            // Cache content token in memory for dev server
            let devContentToken = ''
            let devTokenExpiry = 0

            proxy.on('proxyReq', async (proxyReq, req) => {
              proxyReq.setHeader('x-client-id', clientId)

              // If the client sent a user auth token, forward it
              const userToken = req.headers['x-auth-token']
              if (userToken) {
                proxyReq.setHeader('x-auth-token', userToken as string)
              } else if (devContentToken && Date.now() < devTokenExpiry) {
                // Use cached client_credentials token
                proxyReq.setHeader('Authorization', `Bearer ${devContentToken}`)
              }
            })

            // Pre-fetch a content token on startup
            ;(async () => {
              try {
                const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
                const res = await fetch(authEndpoint, {
                  method: 'POST',
                  headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'content' }).toString(),
                })
                if (res.ok) {
                  const json = await res.json() as { access_token: string; expires_in: number }
                  devContentToken = json.access_token
                  devTokenExpiry = Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000
                  console.log('[vite] Content API token acquired')
                }
              } catch (err) {
                console.warn('[vite] Failed to get content token:', err)
              }
            })()
          },
        },
        // Search API — proxies to quran.com search endpoint with 'search' scope token
        '/api/search-proxy': {
          target: contentTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/search-proxy/, '/search'),
          configure: (proxy) => {
            let devSearchToken = ''
            let devSearchTokenExpiry = 0

            proxy.on('proxyReq', async (proxyReq) => {
              proxyReq.setHeader('x-client-id', clientId)
              if (devSearchToken && Date.now() < devSearchTokenExpiry) {
                proxyReq.setHeader('x-auth-token', devSearchToken)
              }
            })

            // Pre-fetch a search token on startup
            ;(async () => {
              try {
                const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
                const res = await fetch(authEndpoint, {
                  method: 'POST',
                  headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'search' }).toString(),
                })
                if (res.ok) {
                  const json = await res.json() as { access_token: string; expires_in: number }
                  devSearchToken = json.access_token
                  devSearchTokenExpiry = Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000
                  console.log('[vite] Search API token acquired')
                }
              } catch (err) {
                console.warn('[vite] Failed to get search token:', err)
              }
            })()
          },
        },
        // Muddakir backend — MCP + Gemini orchestration (local Express server)
        '/api/query': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/api/health': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
