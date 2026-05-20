/**
 * Eyebrow — small uppercase label above section headlines.
 * Uses the current accent color via CSS vars.
 */

import type { LucideIcon } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}

export default function Eyebrow({ icon: Icon, children, className = '' }: Props) {
  return (
    <span className={`lp-eyebrow ${className}`}>
      {Icon && <Icon size={11} strokeWidth={2.2} />}
      {children}
    </span>
  )
}
