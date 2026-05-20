/**
 * Logo — dual-script wordmark.
 * Arabic "مُذَّكِّر" in Tajawal Bold, English "Muddakir" in Cairo Light,
 * separated by a thin divider. Stays on a single baseline.
 */

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Logo({ size = 'md', className = '' }: Props) {
  const scale = {
    sm: { ar: 'text-[17px]', en: 'text-[14px]', gap: 'gap-2' },
    md: { ar: 'text-[22px]', en: 'text-[18px]', gap: 'gap-2.5' },
    lg: { ar: 'text-[34px]', en: 'text-[28px]', gap: 'gap-3' },
  }[size]

  return (
    <div className={`flex items-baseline ${scale.gap} ${className}`}>
      <span
        className={`lp-font-logo-ar ${scale.ar} leading-none`}
        style={{ color: 'var(--lp-text)' }}
        dir="rtl"
      >
        مُذَّكِّر
      </span>
      <span
        aria-hidden
        className="inline-block h-[0.9em] w-px self-center"
        style={{ background: 'var(--lp-hairline-strong)' }}
      />
      <span
        className={`lp-font-logo-en ${scale.en} leading-none`}
        style={{ color: 'var(--lp-text)' }}
      >
        Muddakir
      </span>
    </div>
  )
}
