/**
 * Section — consistent vertical rhythm + optional accent class.
 * Accent class propagates CSS variables (--lp-accent, etc.) to children.
 */

import type { ReactNode } from 'react'

type Accent = 'emerald' | 'amber' | 'blue' | 'violet' | 'cyan' | 'sepia' | 'slate' | 'none'

interface Props {
  children: ReactNode
  className?: string
  id?: string
  accent?: Accent
  /** If true, section gets a subtle top/bottom background wash in the accent color. */
  washed?: boolean
  /** Width constraint. Defaults to 6xl. */
  width?: 'md' | 'lg' | 'xl' | '2xl' | '5xl' | '6xl' | '7xl' | 'full'
  /** Vertical padding. Defaults to 'lg'. */
  pad?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Section({
  children,
  className = '',
  id,
  accent = 'none',
  washed = false,
  width = '6xl',
  pad = 'lg',
}: Props) {
  const accentCls = accent === 'none' ? '' : `lp-accent-${accent}`

  const widthCls = {
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-none',
  }[width]

  const padCls = {
    sm: 'py-8 md:py-10',
    md: 'py-10 md:py-14',
    lg: 'py-12 md:py-16',
    xl: 'py-14 md:py-20',
  }[pad]

  return (
    <section
      id={id}
      className={`relative ${accentCls} ${padCls} px-5 md:px-8 ${className}`}
    >
      {washed && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{ background: 'var(--lp-hairline)' }}
        />
      )}
      {washed && (
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full blur-[120px] pointer-events-none opacity-70"
          style={{ background: 'var(--lp-accent-soft, transparent)' }}
        />
      )}
      <div className={`relative mx-auto ${widthCls}`}>
        {children}
      </div>
    </section>
  )
}
