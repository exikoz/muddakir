/**
 * Navbar — sticky, translucent, appears with hairline after scroll.
 * Dual-script logo + section anchors (md+) + theme toggle + Open app.
 */

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

interface Props {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

const ANCHORS = [
  { href: '#explore', label: 'Explore' },
  { href: '#ai-scope', label: 'AI Scope' },
  { href: '#mushaf', label: 'Mushaf' },
  { href: '#roadmap', label: 'Roadmap' },
]

export default function Navbar({ theme, onToggleTheme }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-colors"
        style={{
          background: scrolled ? 'color-mix(in srgb, var(--lp-bg) 78%, transparent)' : 'transparent',
          backdropFilter: scrolled ? 'saturate(1.2) blur(10px)' : undefined,
          WebkitBackdropFilter: scrolled ? 'saturate(1.2) blur(10px)' : undefined,
          borderBottom: scrolled ? '1px solid var(--lp-hairline)' : '1px solid transparent',
        }}
      >
        <div className="mx-auto max-w-7xl px-5 md:px-8 h-14 flex items-center justify-between">
          <a href="#top" className="flex items-center">
            <Logo size="md" />
          </a>

          {/* Anchors (md+) */}
          <div className="hidden md:flex items-center gap-1">
            {ANCHORS.map(a => (
              <a
                key={a.href}
                href={a.href}
                className="px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors"
                style={{ color: 'var(--lp-text-dim)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--lp-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--lp-text-dim)')}
              >
                {a.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <a
              href="/app"
              className="hidden sm:inline-flex items-center gap-1 h-8 px-3.5 rounded-lg text-[12.5px] font-semibold transition-colors"
              style={{
                background: 'var(--lp-text)',
                color: 'var(--lp-bg)',
              }}
            >
              Open app
              <span aria-hidden>→</span>
            </a>
            <button
              type="button"
              className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center"
              aria-label="Menu"
              onClick={() => setMenuOpen(v => !v)}
              style={{ border: '1px solid var(--lp-hairline-strong)', color: 'var(--lp-text-muted)' }}
            >
              {menuOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="md:hidden mx-5 mb-3 rounded-xl p-2 lp-animate-fade-up"
            style={{
              background: 'var(--lp-surface)',
              border: '1px solid var(--lp-hairline-strong)',
            }}
          >
            <div className="flex flex-col">
              {ANCHORS.map(a => (
                <a
                  key={a.href}
                  href={a.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 text-sm rounded-lg"
                  style={{ color: 'var(--lp-text-muted)' }}
                >
                  {a.label}
                </a>
              ))}
              <a
                href="/app"
                className="mt-1 px-3 py-2.5 text-sm font-semibold rounded-lg text-center"
                style={{ background: 'var(--lp-text)', color: 'var(--lp-bg)' }}
              >
                Open app →
              </a>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
