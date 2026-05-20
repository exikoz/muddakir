/**
 * Footer CTA + attributions.
 * Soft section, two-button CTA, credits to the providers that power Muddakir.
 */

import { LogIn, ArrowUpRight } from 'lucide-react'
import { Section, Logo } from '../primitives'

export default function FooterCTA() {
  return (
    <>
      <Section accent="emerald" pad="xl" width="5xl">
        <div className="relative text-center">
          <p
            className="lp-font-arabic text-3xl md:text-4xl select-none mb-6"
            style={{ color: 'var(--lp-text-faint)', opacity: 0.45 }}
            dir="rtl"
          >
            فَبِأَىِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ
          </p>

          <h2
            className="lp-font-display text-3xl md:text-5xl font-semibold mb-3 leading-[1.05]"
            style={{ color: 'var(--lp-text)' }}
          >
            Start exploring.
          </h2>
          <p
            className="text-[15px] max-w-md mx-auto mb-8 leading-relaxed"
            style={{ color: 'var(--lp-text-muted)' }}
          >
            Your first click is your first search. Everything else follows.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/app"
              className="inline-flex items-center gap-2 px-6 h-11 rounded-lg text-[13.5px] font-semibold transition-colors"
              style={{
                background: 'var(--lp-emerald-strong)',
                color: 'var(--lp-bg)',
              }}
            >
              Open workspace
              <ArrowUpRight size={14} />
            </a>
            <button
              className="inline-flex items-center gap-2 px-5 h-11 rounded-lg text-[13px] font-semibold transition-colors"
              style={{
                border: '1px solid var(--lp-hairline-strong)',
                color: 'var(--lp-text-muted)',
                background: 'transparent',
              }}
            >
              <LogIn size={13} />
              Sign in with Quran.com
            </button>
          </div>
        </div>
      </Section>

      {/* Site footer */}
      <footer
        className="px-5 md:px-8 py-10"
        style={{ borderTop: '1px solid var(--lp-hairline)' }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <Logo size="sm" />
              <p className="mt-2 text-[11.5px] max-w-sm" style={{ color: 'var(--lp-text-faint)' }}>
                A visual Quran exploration tool. Not affiliated with Quran.com, the Quran Foundation, or
                Google. All Quranic content and bookmarks are powered by Quran.com.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-[12px]">
              <a href="#explore" style={{ color: 'var(--lp-text-dim)' }}>Explore</a>
              <a href="#ai-scope" style={{ color: 'var(--lp-text-dim)' }}>AI Scope</a>
              <a href="#mushaf" style={{ color: 'var(--lp-text-dim)' }}>Mushaf</a>
              <a href="#roadmap" style={{ color: 'var(--lp-text-dim)' }}>Roadmap</a>
              <a href="/app" style={{ color: 'var(--lp-text-dim)' }}>Open app</a>
              <a
                href="https://github.com/adelpro/quran-search-engine"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--lp-text-dim)' }}
              >
                Search engine ↗
              </a>
            </div>
          </div>

          <div
            className="mt-8 pt-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px]"
            style={{ borderTop: '1px solid var(--lp-hairline)', color: 'var(--lp-text-faint)' }}
          >
            <span>Built on Quran.com API · quran-search-engine · Quran.com MCP · Gemini.</span>
            <span>
              Made with reflection.{' '}
              <span className="lp-font-arabic" style={{ color: 'var(--lp-text-dim)' }} dir="rtl">
                اللَّهُمَّ ٱجْعَلْنَا مِنَ ٱلْمُذَّكِّرِينَ
              </span>
            </span>
          </div>
        </div>
      </footer>
    </>
  )
}
