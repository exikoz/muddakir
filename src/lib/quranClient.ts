import { QuranClient, Language } from '@quranjs/api'

const client = new QuranClient({
  clientId:     import.meta.env.QURAN_CLIENT_ID as string,
  clientSecret: import.meta.env.QURAN_CLIENT_SECRET as string,
  // Route the token request through the Vite dev-server proxy to avoid CORS.
  // In production this should point to your own backend token endpoint.
  authBaseUrl: `${window.location.origin}/api/auth`,
  defaults: {
    language: Language.ENGLISH,
  },
})

export default client
