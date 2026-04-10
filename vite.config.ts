import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import type { Connect } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    {
      // Dev-server middleware for the Quran Foundation OAuth 2.0 callback
      name: 'quran-oauth-callback',
      configureServer(server) {
        server.middlewares.use(
          '/api/auth/callback/quran',
          (req: Connect.IncomingMessage, res, _next) => {
            const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
            const code  = url.searchParams.get('code')
            const state = url.searchParams.get('state')
            const error = url.searchParams.get('error')

            console.log('[Muddakir] Quran Foundation OAuth callback received')
            console.log('  code :', code  ?? '(none)')
            console.log('  state:', state ?? '(none)')
            if (error) console.warn('  error:', error)

            // TODO: exchange `code` for access token via Quran Foundation token endpoint
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              ok: true,
              message: 'OAuth callback received — token exchange pending implementation.',
              code,
              state,
            }))
          }
        )
      },
    },
  ],
})
