/**
 * OAuth callback handler — renders at /auth/callback.
 *
 * Captures the authorization code from the URL, exchanges it for tokens
 * via the backend, then redirects back to the app root.
 */

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useUserStore } from '../../store/userStore'

export default function AuthCallback() {
  const handleCallback = useUserStore(s => s.handleCallback)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const oauthError = params.get('error')

    if (oauthError) {
      setStatus('error')
      setError(params.get('error_description') ?? oauthError)
      return
    }

    if (!code || !state) {
      setStatus('error')
      setError('Missing authorization code or state parameter')
      return
    }

    handleCallback(code, state)
      .then(() => {
        setStatus('success')
        // Redirect back to app after brief success message
        setTimeout(() => {
          window.location.href = '/app'
        }, 800)
      })
      .catch(err => {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Authentication failed')
      })
  }, [handleCallback])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto mb-4" />
            <p className="text-sm text-slate-600">Signing you in…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={32} className="text-emerald-500 mx-auto mb-4" />
            <p className="text-sm text-slate-600">Signed in! Redirecting…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle size={32} className="text-red-500 mx-auto mb-4" />
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <a
              href="/app"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Back to Muddakir
            </a>
          </>
        )}
      </div>
    </div>
  )
}
