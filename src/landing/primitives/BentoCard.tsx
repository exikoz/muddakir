/**
 * BentoCard — standard bento cell.
 * - Uses `lp-card` base so the light/dark surface & hairlines come from theme.
 * - Optional local accent (overrides section accent) via the `accent` prop.
 * - `accented` adds a small corner stripe in the accent color.
 * - `interactive` tightens the hover feedback.
 */

import type { ReactNode } from 'react'

type Accent = 'emerald' | 'amber' | 'blue' | 'violet' | 'cyan' | 'sepia' | 'slate'

interface Props {
  children: ReactNode
  className?: string
  accent?: Accent
  accented?: boolean
  padded?: boolean
  interactive?: boolean
}

export default function BentoCard({
  children,
  className = '',
  accent,
  accented = false,
  padded = true,
  interactive = false,
}: Props) {
  const accentCls = accent ? `lp-accent-${accent}` : ''
  return (
    <div
      className={`lp-card ${accentCls} ${accented ? 'lp-card-accented' : ''} ${
        padded ? 'p-5 md:p-6' : ''
      } ${interactive ? 'hover:-translate-y-0.5' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
