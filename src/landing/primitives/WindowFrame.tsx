/**
 * WindowFrame — reusable "app window" chrome with traffic-light dots.
 * Used for interactive mini-demos so they read as real app windows.
 */

import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  title?: string
  right?: ReactNode
  className?: string
  bodyClassName?: string
}

export default function WindowFrame({
  children,
  title,
  right,
  className = '',
  bodyClassName = '',
}: Props) {
  return (
    <div
      className={`rounded-2xl overflow-hidden border shadow-sm ${className}`}
      style={{
        background: 'var(--lp-surface)',
        borderColor: 'var(--lp-hairline-strong)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 10px 30px rgba(15,23,42,0.06)',
      }}
    >
      <div
        className="flex items-center gap-2 px-4 h-9"
        style={{
          background: 'var(--lp-surface-2)',
          borderBottom: '1px solid var(--lp-hairline)',
        }}
      >
        <div className="flex gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: 'var(--lp-hairline-strong)' }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: 'var(--lp-hairline-strong)' }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: 'var(--lp-hairline-strong)' }}
          />
        </div>
        {title && (
          <span
            className="ml-3 text-[10.5px] font-medium tracking-tight"
            style={{ color: 'var(--lp-text-faint)' }}
          >
            {title}
          </span>
        )}
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}
