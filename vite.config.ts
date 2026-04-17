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
        // Content API — strips the /api prefix and forwards the auth token
        '/api/content': {
          target: contentTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('x-client-id', clientId)
            })
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
