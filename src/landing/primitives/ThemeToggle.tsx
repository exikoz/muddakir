/**
 * ThemeToggle — landing-scoped light/dark switch.
 * Visually unobtrusive; lives in the navbar.
 */

import { Sun, Moon } from 'lucide-react'

interface Props {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
      style={{
        border: '1px solid var(--lp-hairline-strong)',
        color: 'var(--lp-text-muted)',
        background: 'transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--lp-text-faint)'
        e.currentTarget.style.color = 'var(--lp-text)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--lp-hairline-strong)'
        e.currentTarget.style.color = 'var(--lp-text-muted)'
      }}
    >
      {theme === 'light' ? <Moon size={14} strokeWidth={2.2} /> : <Sun size={14} strokeWidth={2.2} />}
    </button>
  )
}
