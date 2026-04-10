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

  const authUrl    = new URL(authEndpoint)
  const authTarget = authUrl.origin   // e.g. https://oauth2.quran.foundation
  const authPath   = authUrl.pathname // e.g. /oauth2/token

  console.log(`[vite] APP_ENV=${env.APP_ENV ?? 'prod'} → using ${prefix} credentials`)

  return {
    define: {
      'import.meta.env.VITE_CLIENT_ID': JSON.stringify(clientId),
    },
    plugins: [
      react(),
      tailwindcss(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    server: {
      proxy: {
        // Token endpoint — injects Basic auth server-side, secret never hits the browser
        '/api-proxy/token': {
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
        // Content API — strips the /api-proxy prefix and forwards the auth token
        '/api-proxy/content': {
          target: contentTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-proxy/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('x-client-id', clientId)
            })
          },
        },
      },
    },
  }
})
