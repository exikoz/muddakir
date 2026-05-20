import ScrollReveal from '../components/ScrollReveal'
import MiniCanvas from '../components/MiniCanvas'
import { Section } from '../primitives'

export default function HeroSection() {
  return (
    <Section id="top" accent="emerald" pad="xl" width="7xl">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute -z-10 top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'var(--lp-accent-soft)' }}
      />

      {/* Watermark — sits at top of section with breathing room below */}
      <div className="text-center mb-14 md:mb-18 pointer-events-none" aria-hidden>
        <p
          className="lp-font-arabic text-4xl md:text-5xl leading-tight select-none"
          style={{ color: 'var(--lp-text-muted)', opacity: 0.55 }}
          dir="rtl"
        >
          وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ
        </p>
      </div>

      <ScrollReveal className="text-center max-w-3xl mx-auto mb-10">
        <h1
          className="lp-font-display text-4xl md:text-6xl font-semibold leading-[1.05] mb-5"
          style={{ color: 'var(--lp-text)' }}
        >
          Explore the Quran.
          <br />
          <span style={{ color: 'var(--lp-emerald-strong)' }}>Visually.</span>{' '}
          <span style={{ color: 'var(--lp-text-muted)' }}>Intelligently.</span>{' '}
          <span style={{ color: 'var(--lp-amber-strong)' }}>Grounded.</span>
        </h1>

        <p
          className="text-[15px] md:text-[17px] max-w-xl mx-auto leading-relaxed"
          style={{ color: 'var(--lp-text-dim)' }}
        >
          Click a word to search. Connect verses on a canvas. Ask an AI grounded in verified sources — with a verification nonce on every answer.
        </p>
      </ScrollReveal>

      {/* Live interactive canvas */}
      <ScrollReveal delay={200} className="w-full">
        <MiniCanvas />
      </ScrollReveal>

      {/* Affordance chips */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px]">
        {[
          { k: '⌘K', v: 'search' },
          { k: '↩', v: 'word builder' },
          { k: '⇅', v: 'drag nodes' },
        ].map(h => (
          <span
            key={h.v}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: 'var(--lp-surface)',
              border: '1px solid var(--lp-hairline)',
              color: 'var(--lp-text-dim)',
            }}
          >
            <kbd
              className="text-[10px] font-mono px-1.5 py-px rounded"
              style={{ background: 'var(--lp-surface-2)', color: 'var(--lp-text-muted)' }}
            >
              {h.k}
            </kbd>
            {h.v}
          </span>
        ))}
      </div>
    </Section>
  )
}
