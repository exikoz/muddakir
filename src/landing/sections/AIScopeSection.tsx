/**
 * AI Scope — grounded, not guesswork.
 * Palette: amber/gold (verification, scholarly).
 * Chat demo uses real verse-card chrome so visitors see the interaction is
 * richer than a generic chat window — not just text, but node-ready cards.
 */

import { useEffect, useRef, useState } from 'react'
import { Sparkles, ShieldCheck, Plus, BookOpen, SendHorizonal, Link2 } from 'lucide-react'
import ScrollReveal from '../components/ScrollReveal'
import { Section, Eyebrow, WindowFrame } from '../primitives'

const QUESTIONS = [
  { id: 'q1', q: 'What is the significance of "Al-Ḥayy Al-Qayyūm"?' },
  { id: 'q2', q: 'How does Surah Al-Ikhlāṣ define Tawḥīd?' },
  { id: 'q3', q: 'Compare patience in Sūrah Yūsuf and Sūrah Al-Kahf.' },
]

type VerseCard = { key: string; surah: string; text: string }

const RESPONSE: {
  paragraphs: string[]
  verses: VerseCard[]
  nonce: string
  sources: string[]
} = {
  paragraphs: [
    'The divine names Al-Ḥayy ("the Ever-Living") and Al-Qayyūm ("the Self-Sustaining") appear together in three places in the Quran. Classical scholars including Ibn Kathīr consider their pairing to convey "al-ism al-aʿẓam" — the Greatest Name of Allah.',
    'Al-Ṭabarī notes that Al-Ḥayy denotes the One who neither dies nor tires, while Al-Qayyūm denotes the One upon whom all of creation depends. Together they express absolute, self-sufficient sustaining power.',
  ],
  verses: [
    { key: '2:255', surah: 'Al-Baqarah', text: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ' },
    { key: '3:2', surah: 'Āl-ʿImrān', text: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ' },
    { key: '20:111', surah: 'Ṭā-Hā', text: 'وَعَنَتِ ٱلْوُجُوهُ لِلْحَىِّ ٱلْقَيُّومِ' },
  ],
  nonce: 'a7f3c9e2…d41b',
  sources: ['Tafsīr Ibn Kathīr', 'Tafsīr al-Ṭabarī', 'Quran.com canonical text'],
}

/* Typewriter reveal for the prose, staggered cards afterward.
 * The parent remounts ChatDemo via `key={activeId}` so there's no
 * need to reset state synchronously inside the effect. */
function useTypewriter(text: string, start: boolean, speed = 18) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    if (!start) return
    let i = 0
    const id = setInterval(() => {
      i += 2
      setShown(text.slice(0, Math.min(i, text.length)))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, start, speed])
  return shown
}

function VerseResultCard({ v, delay }: { v: VerseCard; delay: number }) {
  return (
    <div
      className="rounded-xl p-3.5 lp-animate-fade-up"
      style={{
        background: 'var(--lp-surface)',
        border: '1px solid var(--lp-hairline-strong)',
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10.5px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--lp-text-dim)' }}
        >
          {v.surah} · {v.key}
        </span>
        <div className="flex gap-1">
          <button
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold rounded-md px-1.5 py-0.5"
            style={{
              color: 'var(--lp-amber-strong)',
              background: 'var(--lp-amber-soft)',
            }}
          >
            <Plus size={10} strokeWidth={2.4} /> Canvas
          </button>
          <button
            className="inline-flex items-center gap-1 text-[10.5px] font-medium rounded-md px-1.5 py-0.5"
            style={{
              color: 'var(--lp-text-dim)',
              border: '1px solid var(--lp-hairline)',
            }}
          >
            <BookOpen size={10} /> Mushaf
          </button>
        </div>
      </div>
      <p
        className="lp-font-arabic text-[18px] text-right"
        style={{ color: 'var(--lp-text)' }}
        dir="rtl"
      >
        {v.text}
      </p>
    </div>
  )
}

function ChatDemo({ activeId, onPick }: { activeId: string | null; onPick: (id: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const showResponse = activeId !== null
  const body = useTypewriter(RESPONSE.paragraphs.join('\n\n'), showResponse)
  const bodyDone = body.length === RESPONSE.paragraphs.join('\n\n').length

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [body, showResponse])

  const selectedQ = QUESTIONS.find(q => q.id === activeId)?.q

  return (
    <WindowFrame
      title="AI Scope · Gemini · Quran.com MCP"
      right={
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: 'var(--lp-amber-soft)',
            color: 'var(--lp-amber-strong)',
            border: '1px solid var(--lp-amber-border)',
          }}
        >
          <ShieldCheck size={10} strokeWidth={2.4} /> grounded
        </span>
      }
    >
      <div
        ref={scrollRef}
        className="lp-scroll max-h-[520px] overflow-y-auto"
        style={{ background: 'var(--lp-surface)' }}
      >
        {/* Question chips (always visible) */}
        <div
          className="px-5 pt-4 pb-3"
          style={{ borderBottom: showResponse ? '1px solid var(--lp-hairline)' : 'none' }}
        >
          <p
            className="text-[10.5px] uppercase tracking-wider font-semibold mb-2"
            style={{ color: 'var(--lp-text-faint)' }}
          >
            Try a question
          </p>
          <div className="flex flex-col gap-1.5">
            {QUESTIONS.map(q => {
              const active = activeId === q.id
              return (
                <button
                  key={q.id}
                  onClick={() => onPick(q.id)}
                  className="text-left text-[12.5px] px-3 py-2 rounded-lg transition-colors"
                  style={
                    active
                      ? {
                          border: '1px solid var(--lp-amber-border)',
                          background: 'var(--lp-amber-soft)',
                          color: 'var(--lp-amber-strong)',
                        }
                      : {
                          border: '1px solid var(--lp-hairline)',
                          color: 'var(--lp-text-muted)',
                          background: 'var(--lp-surface)',
                        }
                  }
                >
                  {q.q}
                </button>
              )
            })}
          </div>
        </div>

        {/* Response */}
        {showResponse && (
          <div className="px-5 py-4 space-y-3.5">
            {/* User message */}
            <div className="flex justify-end">
              <div
                className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-tr-md text-[13px]"
                style={{
                  background: 'var(--lp-surface-2)',
                  color: 'var(--lp-text)',
                  border: '1px solid var(--lp-hairline)',
                }}
              >
                {selectedQ}
              </div>
            </div>

            {/* Assistant response */}
            <div className="flex items-start gap-2.5">
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                style={{
                  background: 'var(--lp-amber-soft)',
                  border: '1px solid var(--lp-amber-border)',
                  color: 'var(--lp-amber-strong)',
                }}
              >
                <Sparkles size={11} strokeWidth={2.4} />
              </span>
              <div className="flex-1 space-y-3">
                <div
                  className="text-[13.5px] leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--lp-text-muted)' }}
                >
                  {body}
                  {!bodyDone && (
                    <span
                      className="inline-block w-1.5 h-4 ml-0.5 align-middle"
                      style={{ background: 'var(--lp-amber-strong)', animation: 'lp-blink 1s infinite' }}
                    />
                  )}
                </div>

                {/* Verse cards reveal after prose */}
                {bodyDone && (
                  <div className="space-y-2">
                    {RESPONSE.verses.map((v, i) => (
                      <VerseResultCard key={v.key} v={v} delay={i * 120} />
                    ))}
                  </div>
                )}

                {/* Grounding footer */}
                {bodyDone && (
                  <div
                    className="pt-3 mt-3 flex flex-wrap items-center gap-2 lp-animate-fade-up"
                    style={{
                      borderTop: '1px solid var(--lp-hairline)',
                      animationDelay: `${RESPONSE.verses.length * 120 + 100}ms`,
                    }}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 text-[10.5px] font-mono px-2 py-1 rounded-full"
                      style={{
                        background: 'var(--lp-amber-soft)',
                        color: 'var(--lp-amber-strong)',
                        border: '1px solid var(--lp-amber-border)',
                      }}
                    >
                      <ShieldCheck size={11} strokeWidth={2.4} />
                      nonce: {RESPONSE.nonce}
                    </span>
                    {RESPONSE.sources.map(s => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-full"
                        style={{
                          background: 'var(--lp-surface)',
                          color: 'var(--lp-text-dim)',
                          border: '1px solid var(--lp-hairline)',
                        }}
                      >
                        <Link2 size={9} />
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fake input bar */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--lp-hairline)', background: 'var(--lp-surface-2)' }}
        >
          <div
            className="flex-1 h-8 px-3 rounded-lg flex items-center text-[12px]"
            style={{ background: 'var(--lp-surface)', border: '1px solid var(--lp-hairline)', color: 'var(--lp-text-faint)' }}
          >
            Ask Muddakir a question…
          </div>
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--lp-amber-strong)', color: 'var(--lp-bg)' }}
          >
            <SendHorizonal size={13} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes lp-blink { 50% { opacity: 0; } }
      `}</style>
    </WindowFrame>
  )
}

export default function AIScopeSection() {
  const [activeQ, setActiveQ] = useState<string | null>(null)

  return (
    <Section id="ai-scope" accent="amber" pad="xl" width="6xl">
      <div
        aria-hidden
        className="absolute -z-10 top-1/4 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'var(--lp-amber-soft)' }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        {/* Left: narrative */}
        <div className="lg:col-span-5">
          <ScrollReveal>
            <Eyebrow icon={ShieldCheck}>AI Scope · grounded in Quran.com</Eyebrow>
            <h2
              className="lp-font-display text-3xl md:text-4xl font-semibold mt-4 mb-5 leading-[1.1]"
              style={{ color: 'var(--lp-text)' }}
            >
              Answers you can verify,
              <br />
              <span style={{ color: 'var(--lp-amber-strong)' }}>down to the nonce.</span>
            </h2>
            <p
              className="text-[15px] leading-relaxed mb-5"
              style={{ color: 'var(--lp-text-muted)' }}
            >
              Muddakir's AI doesn't invent answers. Every response is built on canonical Arabic text,
              classical tafsīr, and translations retrieved live through the Quran.com MCP server.
              The model is instructed to stay inside the retrieved sources — not around them.
            </p>

            <ol className="space-y-3">
              {[
                { n: 1, t: 'You ask', d: 'A verse lookup, a thematic study, a deep tafsīr question — anything.' },
                { n: 2, t: 'Muddakir retrieves through MCP', d: 'Canonical text, classical tafsīr, and translations from Quran.com.' },
                { n: 3, t: 'Grounded, verifiable answer', d: 'Every reply ships with a verification nonce and the full source chain.' },
              ].map(s => (
                <li
                  key={s.n}
                  className="flex gap-3 p-3.5 rounded-xl"
                  style={{
                    background: 'var(--lp-surface)',
                    border: '1px solid var(--lp-hairline)',
                  }}
                >
                  <span
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-semibold lp-font-display"
                    style={{
                      background: 'var(--lp-amber-soft)',
                      color: 'var(--lp-amber-strong)',
                      border: '1px solid var(--lp-amber-border)',
                    }}
                  >
                    {s.n}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-semibold" style={{ color: 'var(--lp-text)' }}>
                      {s.t}
                    </p>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--lp-text-dim)' }}>
                      {s.d}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </ScrollReveal>
        </div>

        {/* Right: chat demo */}
        <div className="lg:col-span-7">
          <ScrollReveal delay={150}>
            <ChatDemo
              key={activeQ ?? 'none'}
              activeId={activeQ}
              onPick={id => setActiveQ(activeQ === id ? null : id)}
            />
          </ScrollReveal>
          <p
            className="mt-3 text-[11.5px] text-center"
            style={{ color: 'var(--lp-text-faint)' }}
          >
            Verse cards inside the chat are the same component you'll use on the canvas.
            Add them to your workspace, open them in the Mushaf, or explore them further.
          </p>
        </div>
      </div>
    </Section>
  )
}
