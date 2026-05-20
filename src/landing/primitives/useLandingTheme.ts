/**
 * useLandingTheme — landing-scoped light/dark toggle.
 * Stored in localStorage under `muddakir:landing-theme`.
 * Default: light.
 */

import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'muddakir:landing-theme'

function read(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    if (v === 'dark' || v === 'light') return v
  } catch { /* ignore */ }
  return 'light'
}

export default function useLandingTheme() {
  const [theme, setTheme] = useState<Theme>(() => read())

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, theme) } catch { /* ignore */ }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme(t => (t === 'light' ? 'dark' : 'light'))
  }, [])

  return { theme, toggle, setTheme }
}
