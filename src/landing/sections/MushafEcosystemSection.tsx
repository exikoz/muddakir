/**
 * Mushaf · sign-in · mobile companion.
 * Three companion surfaces — each with its own subtle accent.
 */

import { BookOpen, LogIn, Smartphone, ArrowUpRight, Clock } from 'lucide-react'
import ScrollReveal from '../components/ScrollReveal'
import { Section, Eyebrow, BentoCard } from '../primitives'

const MOCK_VERSES = [
  { key: '2:255', text: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ' },
  { key: '2:256', text: 'لَآ إِكْرَاهَ فِى ٱلدِّينِ ۖ قَد تَّبَيَّنَ ٱلرُّشْدُ مِنَ ٱلْغَىِّ' },
  { key: '2:257', text: 'ٱللَّهُ وَلِىُّ ٱلَّذِينَ ءَامَنُوا۟ يُخْرِجُهُم مِّنَ ٱلظُّلُمَـٰتِ إِلَى ٱلنُّورِ' },
]

function MushafCard() {
  return (
    <div className="lp-accent-sepia">
      <BentoCard accented>
        <div className="flex items-center justify-between mb-4">
          <Eyebrow icon={BookOpen}>Mushaf reader</Eyebrow>
          <span className="text-[10.5px] font-semibold" style={{ color: 'var(--lp-text-faint)' }}>
            Sūrah al-Baqarah · pp. 42–43
          </span>
        </div>

        <h3 className="lp-font-display text-xl md:text-2xl font-semibold mb-2" style={{ color: 'var(--lp-text)' }}>
          Jump between the canvas and the traditional page.
        </h3>
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--lp-text-dim)' }}>
          Open any verse node straight to its page in the Mushaf. Read a verse in context, then drop it back onto your canvas in one click.
        </p>

        <div className="space-y-2">
          {MOCK_VERSES.map((v, i) => {
            const highlight = i === 0
            return (
              <div
                key={v.key}
                className="p-3 rounded-xl transition-colors"
                style={{
                  background: highlight ? 'var(--lp-sepia-soft)' : 'var(--lp-surface-2)',
                  border: highlight
                    ? '1px solid var(--lp-sepia-border)'
                    : '1px solid var(--lp-hairline)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: highlight ? 'var(--lp-sepia)' : 'var(--lp-text-faint)' }}
                  >
                    {v.key}
                  </span>
                  {highlight && (
                    <span
                      className="text-[10px] font-semibold inline-flex items-center gap-1"
                      style={{ color: 'var(--lp-sepia)' }}
                    >
                      <ArrowUpRight size={10} /> opened from canvas
                    </span>
                  )}
                </div>
                <p
                  className="lp-font-arabic text-[17px] text-right"
                  style={{ color: 'var(--lp-text)' }}
                  dir="rtl"
                >
                  {v.text}
                </p>
              </div>
            )
          })}
        </div>
      </BentoCard>
    </div>
  )
}

function SignInCard() {
  return (
    <div className="lp-accent-emerald">
      <BentoCard accented>
        <Eyebrow icon={LogIn}>Quran.com sign-in</Eyebrow>
        <h3
          className="lp-font-display text-lg md:text-xl font-semibold mt-3 mb-2"
          style={{ color: 'var(--lp-text)' }}
        >
          Keep one library, across apps.
        </h3>
        <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: 'var(--lp-text-dim)' }}>
          Sign in with your Quran.com account and Muddakir picks up your bookmarks, reading progress,
          and translation preferences. Everything stays in sync with where you already read.
        </p>

        <button
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-colors"
          style={{
            background: 'var(--lp-emerald-soft)',
            color: 'var(--lp-emerald-strong)',
            border: '1px solid var(--lp-emerald-border)',
          }}
        >
          <LogIn size={12} />
          Sign in with Quran.com
        </button>

        <ul className="mt-4 space-y-1.5 text-[11.5px]" style={{ color: 'var(--lp-text-dim)' }}>
          {[
            'Bookmarks synced both ways',
            'Translation + reciter preferences',
            'Optional — Muddakir works without signing in too',
          ].map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--lp-emerald)' }} />
              {item}
            </li>
          ))}
        </ul>
      </BentoCard>
    </div>
  )
}

function ComingSoonCard() {
  return (
    <div className="lp-accent-slate">
      <BentoCard accented>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--lp-surface-2)', border: '1px solid var(--lp-hairline-strong)' }}
          >
            <Smartphone size={18} style={{ color: 'var(--lp-text-dim)' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Eyebrow icon={Smartphone}>Mobile companion</Eyebrow>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--lp-amber-soft)',
                  color: 'var(--lp-amber)',
                  border: '1px solid var(--lp-amber-border)',
                }}
              >
                <Clock size={9} strokeWidth={2.5} />
                Coming soon
              </span>
            </div>
            <p className="text-[12.5px]" style={{ color: 'var(--lp-text-dim)' }}>
              Native iOS &amp; Android app — take your canvas on the go, read offline, and get verse reminders. Same workspace, same AI.
            </p>
          </div>
        </div>
      </BentoCard>
    </div>
  )
}

export default function MushafEcosystemSection() {
  return (
    <Section id="mushaf" accent="sepia" pad="xl" width="6xl">
      <ScrollReveal className="max-w-2xl mb-8">
        <Eyebrow icon={BookOpen}>Ecosystem</Eyebrow>
        <h2
          className="lp-font-display text-3xl md:text-5xl font-semibold mt-4 mb-4 leading-[1.05]"
          style={{ color: 'var(--lp-text)' }}
        >
          One canvas,{' '}
          <span style={{ color: 'var(--lp-text-dim)' }}>three surfaces.</span>
        </h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--lp-text-muted)' }}>
          The Mushaf page, your Quran.com account, and your phone — all pulling from the same source of truth.
        </p>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5 items-start">
        <ScrollReveal className="md:col-span-4">
          <MushafCard />
        </ScrollReveal>

        <ScrollReveal delay={100} className="md:col-span-2">
          <SignInCard />
        </ScrollReveal>

        <ScrollReveal delay={180} className="md:col-span-6">
          <ComingSoonCard />
        </ScrollReveal>
      </div>
    </Section>
  )
}
