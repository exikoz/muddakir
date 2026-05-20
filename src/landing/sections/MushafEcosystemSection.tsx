/**
 * Mushaf · sign-in · mobile companion.
 * Three companion surfaces — each with its own subtle accent.
 */

import { BookOpen, LogIn, Smartphone, ArrowUpRight } from 'lucide-react'
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
      <BentoCard accented className="h-full">
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

        <div className="space-y-2.5">
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
                <div className="flex items-center justify-between mb-1.5">
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
      <BentoCard accented className="h-full">
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
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--lp-emerald)' }} />
            Bookmarks synced both ways
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--lp-emerald)' }} />
            Translation + reciter preferences
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--lp-emerald)' }} />
            Optional — Muddakir works without signing in too
          </li>
        </ul>
      </BentoCard>
    </div>
  )
}

function MobileCompanionCard() {
  return (
    <div className="lp-accent-slate">
      <BentoCard accented className="h-full">
        <Eyebrow icon={Smartphone}>Mobile companion</Eyebrow>
        <h3
          className="lp-font-display text-lg md:text-xl font-semibold mt-3 mb-2"
          style={{ color: 'var(--lp-text)' }}
        >
          Desktop for exploring. Phone for carrying it around.
        </h3>
        <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: 'var(--lp-text-dim)' }}>
          On phones the canvas flows vertically as a readable thread — same verses, same AI, no pan and zoom.
        </p>

        {/* Miniature phone */}
        <div className="flex justify-center">
          <div
            className="relative w-[150px] h-[280px] rounded-[26px] p-1.5"
            style={{
              background: 'var(--lp-surface-3)',
              border: '1px solid var(--lp-hairline-strong)',
              boxShadow: '0 6px 24px rgba(15,23,42,0.08)',
            }}
          >
            <div
              className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-3 rounded-full"
              style={{ background: 'var(--lp-surface-3)' }}
            />
            <div
              className="h-full rounded-[20px] overflow-hidden p-2 flex flex-col gap-1.5"
              style={{ background: 'var(--lp-surface)', border: '1px solid var(--lp-hairline)' }}
            >
              {[
                { k: '2:255', t: 'ٱللَّهُ لَآ إِلَـٰهَ' },
                { k: '3:2', t: 'ٱلْحَىُّ ٱلْقَيُّومُ' },
                { k: '20:111', t: 'وَعَنَتِ ٱلْوُجُوهُ' },
              ].map(v => (
                <div
                  key={v.k}
                  className="p-2 rounded-lg"
                  style={{ background: 'var(--lp-surface-2)', border: '1px solid var(--lp-hairline)' }}
                >
                  <p className="text-[8px] font-semibold tracking-wide" style={{ color: 'var(--lp-text-faint)' }}>
                    {v.k}
                  </p>
                  <p
                    className="lp-font-arabic text-[11px] text-right truncate"
                    style={{ color: 'var(--lp-text)', lineHeight: 1.6 }}
                    dir="rtl"
                  >
                    {v.t}
                  </p>
                </div>
              ))}
              <div
                className="mt-auto h-7 rounded-lg flex items-center justify-around px-2"
                style={{ background: 'var(--lp-surface-2)', border: '1px solid var(--lp-hairline)' }}
              >
                {[0, 1, 2, 3].map(i => (
                  <span
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: i === 0 ? 'var(--lp-emerald)' : 'var(--lp-hairline-strong)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </BentoCard>
    </div>
  )
}

export default function MushafEcosystemSection() {
  return (
    <Section id="mushaf" accent="sepia" pad="xl" width="6xl">
      <ScrollReveal className="max-w-2xl mb-14">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <ScrollReveal className="lg:col-span-2">
          <MushafCard />
        </ScrollReveal>
        <div className="flex flex-col gap-4 md:gap-5">
          <ScrollReveal delay={100}>
            <SignInCard />
          </ScrollReveal>
          <ScrollReveal delay={180}>
            <MobileCompanionCard />
          </ScrollReveal>
        </div>
      </div>
    </Section>
  )
}
