/**
 * The explorer — a 6-cell bento showcasing the real feature surface.
 * Each cell borrows a subtle accent color that matches its in-app counterpart.
 */

import { useEffect, useState, useRef } from 'react'
import {
  Search,
  Info,
  Play,
  Pause,
  Layers,
  StickyNote,
  Undo2,
  Redo2,
  Save,
  Share2,
  Bookmark,
  Type,
  PlusCircle,
} from 'lucide-react'
import ScrollReveal from '../components/ScrollReveal'
import { Section, Eyebrow, BentoCard } from '../primitives'

/* ───────────────────────── Filter chip demo ───────────────────────── */

type FilterId = 'exact' | 'lemma' | 'root' | 'fuzzy' | 'semantic' | 'regex' | 'boolean' | 'range' | 'phonetic'

const FILTERS: { id: FilterId; label: string; colorVar: string; softVar: string; borderVar: string }[] = [
  { id: 'exact', label: 'Exact', colorVar: '--lp-emerald', softVar: '--lp-emerald-soft', borderVar: '--lp-emerald-border' },
  { id: 'lemma', label: 'Lemma', colorVar: '--lp-blue', softVar: '--lp-blue-soft', borderVar: '--lp-blue-border' },
  { id: 'root', label: 'Root', colorVar: '--lp-violet', softVar: '--lp-violet-soft', borderVar: '--lp-violet-border' },
  { id: 'fuzzy', label: 'Fuzzy', colorVar: '--lp-amber', softVar: '--lp-amber-soft', borderVar: '--lp-amber-border' },
  { id: 'semantic', label: 'Semantic', colorVar: '--lp-cyan', softVar: '--lp-cyan-soft', borderVar: '--lp-cyan-border' },
  { id: 'regex', label: 'Regex', colorVar: '--lp-rose', softVar: '--lp-rose-soft', borderVar: '--lp-rose-border' },
  { id: 'boolean', label: 'Boolean', colorVar: '--lp-text-muted', softVar: '--lp-hairline', borderVar: '--lp-hairline-strong' },
  { id: 'range', label: 'Range', colorVar: '--lp-text-muted', softVar: '--lp-hairline', borderVar: '--lp-hairline-strong' },
  { id: 'phonetic', label: 'Phonetic', colorVar: '--lp-sepia', softVar: '--lp-sepia-soft', borderVar: '--lp-sepia-border' },
]

type FilterResult = { key: string; surah: string; text: string; score: number }

const FILTER_RESULTS: Record<FilterId, FilterResult[]> = {
  exact: [
    { key: '2:255', surah: 'Al-Baqarah', text: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ', score: 100 },
    { key: '3:2', surah: 'Āl-ʿImrān', text: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ', score: 100 },
  ],
  lemma: [
    { key: '20:111', surah: 'Ṭā-Hā', text: 'وَعَنَتِ ٱلْوُجُوهُ لِلْحَىِّ ٱلْقَيُّومِ', score: 96 },
    { key: '40:65', surah: 'Ghāfir', text: 'هُوَ ٱلْحَىُّ لَآ إِلَـٰهَ إِلَّا هُوَ', score: 92 },
    { key: '2:255', surah: 'Al-Baqarah', text: 'ٱلْحَىُّ ٱلْقَيُّومُ', score: 90 },
  ],
  root: [
    { key: '25:58', surah: 'Al-Furqān', text: 'وَتَوَكَّلْ عَلَى ٱلْحَىِّ ٱلَّذِى لَا يَمُوتُ', score: 88 },
    { key: '3:169', surah: 'Āl-ʿImrān', text: 'بَلْ أَحْيَآءٌ عِندَ رَبِّهِمْ يُرْزَقُونَ', score: 81 },
    { key: '67:2', surah: 'Al-Mulk', text: 'ٱلَّذِى خَلَقَ ٱلْمَوْتَ وَٱلْحَيَوٰةَ', score: 78 },
  ],
  fuzzy: [
    { key: '2:258', surah: 'Al-Baqarah', text: 'رَبِّىَ ٱلَّذِى يُحْىِۦ وَيُمِيتُ', score: 74 },
    { key: '7:158', surah: 'Al-Aʿrāf', text: 'لَآ إِلَـٰهَ إِلَّا هُوَ يُحْىِۦ وَيُمِيتُ', score: 70 },
  ],
  semantic: [
    { key: '112:2', surah: 'Al-Ikhlāṣ', text: 'ٱللَّهُ ٱلصَّمَدُ', score: 84 },
    { key: '59:22', surah: 'Al-Ḥashr', text: 'هُوَ ٱللَّهُ ٱلَّذِى لَآ إِلَـٰهَ إِلَّا هُوَ', score: 82 },
    { key: '2:163', surah: 'Al-Baqarah', text: 'وَإِلَـٰهُكُمْ إِلَـٰهٌ وَاحِدٌ', score: 77 },
  ],
  regex: [
    { key: '/ٱلْحَىُّ|ٱلْحَيّ/', surah: 'Pattern', text: '2 occurrences matched · 0.3 ms', score: 100 },
  ],
  boolean: [
    { key: 'ٱلْحَىُّ AND ٱلْقَيُّومُ', surah: 'Boolean', text: '3 verses · Al-Baqarah 2:255 · Āl-ʿImrān 3:2 · Ṭā-Hā 20:111', score: 100 },
  ],
  range: [
    { key: '2:255-257', surah: 'Al-Baqarah', text: 'Ayat al-Kursi and the verses that follow', score: 100 },
  ],
  phonetic: [
    { key: '2:255', surah: 'Al-Baqarah', text: '"al-hayy al-qayyūm" → ٱلْحَىُّ ٱلْقَيُّومُ', score: 94 },
  ],
}

function SearchFiltersCell() {
  const [active, setActive] = useState<FilterId>('lemma')
  const filter = FILTERS.find(f => f.id === active)!
  const results = FILTER_RESULTS[active]

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Eyebrow icon={Search}>Search</Eyebrow>
      </div>
      <h3 className="lp-font-display text-xl md:text-2xl font-semibold mb-2" style={{ color: 'var(--lp-text)' }}>
        Nine ways to ask the Quran the same question.
      </h3>
      <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--lp-text-dim)' }}>
        Click any filter — see the same canvas re-indexed through a different lens. Every chip matches
        the color it has inside the app.
      </p>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map(f => {
          const isActive = active === f.id
          return (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
              style={
                isActive
                  ? {
                      background: `var(${f.softVar})`,
                      color: `var(${f.colorVar})`,
                      border: `1px solid var(${f.borderVar})`,
                    }
                  : {
                      color: 'var(--lp-text-dim)',
                      border: '1px solid var(--lp-hairline)',
                      background: 'transparent',
                    }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: `var(${f.colorVar})` }}
              />
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {results.map((r, i) => (
          <div
            key={`${active}-${i}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg lp-animate-fade-up"
            style={{
              background: 'var(--lp-surface-2)',
              border: '1px solid var(--lp-hairline)',
              animationDelay: `${i * 50}ms`,
            }}
          >
            <span
              className="text-[10.5px] font-semibold shrink-0 truncate max-w-[100px]"
              style={{ color: `var(${filter.colorVar})` }}
            >
              {r.key}
            </span>
            <p
              className="lp-font-arabic text-[14.5px] flex-1 truncate text-right"
              style={{ color: 'var(--lp-text-muted)' }}
              dir="rtl"
            >
              {r.text}
            </p>
            <span
              className="text-[10px] font-mono shrink-0"
              style={{ color: `var(${filter.colorVar})`, opacity: 0.8 }}
            >
              {r.score}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── Verse detail tabs demo ───────────────────────── */

type DetailTab = 'words' | 'translations' | 'tafsir' | 'similar' | 'explain'

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: 'words', label: 'Words' },
  { id: 'translations', label: 'Translations' },
  { id: 'tafsir', label: 'Tafsīr' },
  { id: 'similar', label: 'Similar' },
  { id: 'explain', label: 'Explain' },
]

function VerseDetailCell() {
  const [tab, setTab] = useState<DetailTab>('words')
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Eyebrow icon={Info}>Verse detail</Eyebrow>
      </div>
      <h3 className="lp-font-display text-xl md:text-2xl font-semibold mb-2" style={{ color: 'var(--lp-text)' }}>
        Every verse has a five-layer story.
      </h3>
      <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--lp-text-dim)' }}>
        Open the side panel on any node to read the word-by-word morphology, translations, classical tafsīr,
        similar phrases across the Quran, and an AI explanation grounded in the same sources.
      </p>

      {/* Mini panel frame */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--lp-surface-2)',
          border: '1px solid var(--lp-hairline)',
        }}
      >
        {/* Tabs */}
        <div
          className="flex items-center gap-0 px-3 overflow-x-auto lp-scroll"
          style={{ borderBottom: '1px solid var(--lp-hairline)' }}
        >
          {DETAIL_TABS.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative px-3 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors"
                style={{ color: active ? 'var(--lp-cyan)' : 'var(--lp-text-dim)' }}
              >
                {t.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute -bottom-px left-2 right-2 h-0.5 rounded-t"
                    style={{ background: 'var(--lp-cyan)' }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="p-4 min-h-[180px] text-[13px]" style={{ color: 'var(--lp-text-muted)' }}>
          {tab === 'words' && (
            <div className="space-y-1">
              {[
                { ar: 'ٱللَّهُ', tr: 'Allāh', m: 'the proper name of God' },
                { ar: 'لَآ', tr: 'lā', m: 'no / not' },
                { ar: 'إِلَـٰهَ', tr: 'ilāha', m: 'deity, god' },
                { ar: 'إِلَّا', tr: 'illā', m: 'except' },
                { ar: 'هُوَ', tr: 'huwa', m: 'He / Him' },
              ].map((w, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[64px_1fr_auto] items-center gap-3 px-2 py-1.5 rounded-md"
                  style={{ background: i === 0 ? 'var(--lp-cyan-soft)' : 'transparent' }}
                >
                  <span
                    className="lp-font-arabic text-[17px] text-right"
                    style={{ color: i === 0 ? 'var(--lp-cyan)' : 'var(--lp-text)' }}
                    dir="rtl"
                  >
                    {w.ar}
                  </span>
                  <span className="text-[11.5px]" style={{ color: 'var(--lp-text-dim)' }}>
                    {w.m}
                  </span>
                  <span className="text-[10.5px] font-mono" style={{ color: 'var(--lp-text-faint)' }}>
                    {w.tr}
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === 'translations' && (
            <div className="space-y-2.5">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--lp-text-faint)' }}>
                  Sahih International
                </p>
                <p>Allah — there is no deity except Him, the Ever-Living, the Sustainer of [all] existence.</p>
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--lp-text-faint)' }}>
                  Pickthall
                </p>
                <p>Allah! There is no god save Him, the Alive, the Eternal.</p>
              </div>
            </div>
          )}

          {tab === 'tafsir' && (
            <p className="leading-relaxed">
              Ibn Kathīr notes that this verse — Ayat al-Kursi — is the greatest verse in the Quran,
              for it establishes the oneness of Allah and His attributes of life, sustenance, knowledge,
              and sovereignty over all creation, without slumber or fatigue.
            </p>
          )}

          {tab === 'similar' && (
            <div className="space-y-1.5">
              {[
                { k: '3:2', t: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ' },
                { k: '20:111', t: 'وَعَنَتِ ٱلْوُجُوهُ لِلْحَىِّ ٱلْقَيُّومِ' },
                { k: '40:65', t: 'هُوَ ٱلْحَىُّ لَآ إِلَـٰهَ إِلَّا هُوَ' },
              ].map(s => (
                <div
                  key={s.k}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-md"
                  style={{ border: '1px solid var(--lp-hairline)', background: 'var(--lp-surface)' }}
                >
                  <span className="text-[10.5px] font-semibold shrink-0" style={{ color: 'var(--lp-cyan)' }}>
                    {s.k}
                  </span>
                  <p className="lp-font-arabic text-[14px] flex-1 truncate text-right" style={{ color: 'var(--lp-text)' }} dir="rtl">
                    {s.t}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === 'explain' && (
            <div
              className="p-3 rounded-lg border-l-2 text-[13px] leading-relaxed"
              style={{
                background: 'var(--lp-cyan-soft)',
                borderColor: 'var(--lp-cyan)',
                color: 'var(--lp-text-muted)',
              }}
            >
              <p className="font-semibold mb-1" style={{ color: 'var(--lp-cyan)' }}>
                Grounded summary
              </p>
              Al-Ḥayy (the Ever-Living) and Al-Qayyūm (the Self-Sustaining) together form what classical
              scholars call the Greatest Name of Allah. They appear together only in three places in the
              Quran.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Word builder cell ───────────────────────── */

function WordBuilderCell() {
  const [picked, setPicked] = useState<number[]>([0, 1, 2])
  const words = ['لَآ', 'إِلَـٰهَ', 'إِلَّا', 'هُوَ']
  const toggle = (i: number) =>
    setPicked(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i].sort()))

  const phrase = picked
    .sort()
    .map(i => words[i])
    .join(' ')

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Eyebrow icon={Type}>Word builder</Eyebrow>
      </div>
      <h3 className="lp-font-display text-lg md:text-xl font-semibold mb-2" style={{ color: 'var(--lp-text)' }}>
        Compose phrase searches from adjacent words.
      </h3>
      <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: 'var(--lp-text-dim)' }}>
        Pick the words as they appear in the verse and run them as a lemma or root phrase query.
      </p>

      <div
        className="p-3 rounded-xl mb-3"
        style={{ border: '1px solid var(--lp-hairline)', background: 'var(--lp-surface-2)' }}
      >
        <div className="flex flex-wrap gap-1.5 justify-end" dir="rtl">
          {words.map((w, i) => {
            const active = picked.includes(i)
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className="lp-font-arabic text-[18px] px-2 py-0.5 rounded-md transition-colors"
                style={
                  active
                    ? {
                        background: 'var(--lp-violet-soft)',
                        color: 'var(--lp-violet)',
                        border: '1px solid var(--lp-violet-border)',
                      }
                    : {
                        color: 'var(--lp-text)',
                        border: '1px solid transparent',
                      }
                }
              >
                {w}
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: 'var(--lp-surface)', border: '1px solid var(--lp-hairline)' }}
      >
        <PlusCircle size={13} style={{ color: 'var(--lp-violet)' }} />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--lp-text-faint)' }}>
          Phrase
        </span>
        <p className="lp-font-arabic text-[15px] flex-1 text-right truncate" style={{ color: 'var(--lp-text)' }} dir="rtl">
          {phrase || '—'}
        </p>
      </div>
    </div>
  )
}

/* ───────────────────────── Audio cell (real audio playback) ───────────────────────── */

const RECITERS = [
  { name: 'Abdul Basit', url: 'https://audio.qurancdn.com/AbdulBaset/Mujawwad/mp3/001001.mp3' },
  { name: 'Al-Minshāwī', url: 'https://audio.qurancdn.com/Minshawi/Murattal/mp3/001001.mp3' },
  { name: 'Al-Ḥuṣarī',   url: 'https://mirrors.quranicaudio.com/everyayah/Husary_64kbps/001001.mp3' },
]
const FATIHA_WORDS = ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَـٰنِ', 'ٱلرَّحِيمِ']

const WORD_TIMINGS = [
  { start: 0,    end: 900 },
  { start: 900,  end: 1900 },
  { start: 1900, end: 3100 },
  { start: 3100, end: 4600 },
]

function runSimulation(
  setActive: (i: number) => void,
  setPlaying: (v: boolean) => void,
) {
  let i = 0
  setActive(0)
  const id = setInterval(() => {
    i++
    if (i >= FATIHA_WORDS.length) {
      clearInterval(id)
      setTimeout(() => { setPlaying(false); setActive(-1) }, 800)
      return
    }
    setActive(i)
  }, 800)
  return id
}

function AudioCell() {
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(-1)
  const [reciter, setReciter] = useState(0)
  const [audioEl] = useState(() => typeof Audio !== 'undefined' ? new Audio() : null)
  const animFrameRef = useRef<number>(0)
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!audioEl) return
    const handleEnded = () => { setPlaying(false); setActive(-1) }
    audioEl.addEventListener('ended', handleEnded)
    return () => {
      audioEl.removeEventListener('ended', handleEnded)
      audioEl.pause()
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [audioEl])

  function startHighlightLoop(el: HTMLAudioElement) {
    cancelAnimationFrame(animFrameRef.current)
    function loop() {
      if (el.paused) return
      const t = el.currentTime * 1000
      const idx = WORD_TIMINGS.findIndex(w => t >= w.start && t < w.end)
      setActive(idx >= 0 ? idx : -1)
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
  }

  function handlePlay() {
    if (!audioEl) {
      setPlaying(true)
      simRef.current = runSimulation(setActive, setPlaying)
      return
    }

    if (playing) {
      audioEl.pause()
      cancelAnimationFrame(animFrameRef.current)
      if (simRef.current) { clearInterval(simRef.current); simRef.current = null }
      setPlaying(false)
      setActive(-1)
      return
    }

    const url = RECITERS[reciter].url
    if (audioEl.src !== url) audioEl.src = url
    audioEl.currentTime = 0
    setPlaying(true)
    audioEl.play()
      .then(() => startHighlightLoop(audioEl))
      .catch(() => {
        simRef.current = runSimulation(setActive, setPlaying)
      })
  }

  function handleReciterChange(i: number) {
    if (audioEl) { audioEl.pause(); cancelAnimationFrame(animFrameRef.current) }
    if (simRef.current) { clearInterval(simRef.current); simRef.current = null }
    setPlaying(false)
    setActive(-1)
    setReciter(i)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Eyebrow icon={Play}>Audio · 3 reciters</Eyebrow>
      </div>
      <h3 className="lp-font-display text-lg md:text-xl font-semibold mb-2" style={{ color: 'var(--lp-text)' }}>
        Read with your ears.
      </h3>
      <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: 'var(--lp-text-dim)' }}>
        Every node has an inline player with word-by-word highlighting. Press play — this is real audio from Quran.com CDN.
      </p>

      {/* Reciter tabs */}
      <div className="flex gap-1 mb-3">
        {RECITERS.map((r, i) => {
          const isActive = reciter === i
          return (
            <button
              key={r.name}
              onClick={() => handleReciterChange(i)}
              className="flex-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
              style={
                isActive
                  ? {
                      background: 'var(--lp-blue-soft)',
                      color: 'var(--lp-blue)',
                      border: '1px solid var(--lp-blue-border)',
                    }
                  : {
                      color: 'var(--lp-text-dim)',
                      border: '1px solid var(--lp-hairline)',
                    }
              }
            >
              {r.name}
            </button>
          )
        })}
      </div>

      <div
        className="p-3 rounded-xl"
        style={{ background: 'var(--lp-surface-2)', border: '1px solid var(--lp-hairline)' }}
      >
        <div className="flex flex-wrap gap-1.5 justify-end mb-3" dir="rtl">
          {FATIHA_WORDS.map((w, i) => {
            const isActive = active === i
            return (
              <span
                key={i}
                className="lp-font-arabic text-[20px] px-2 py-0.5 rounded-md transition-all"
                style={
                  isActive
                    ? {
                        background: 'var(--lp-blue-soft)',
                        color: 'var(--lp-blue)',
                        boxShadow: '0 0 0 1.5px var(--lp-blue-border) inset',
                      }
                    : { color: 'var(--lp-text)' }
                }
              >
                {w}
              </span>
            )
          })}
        </div>
        <button
          onClick={handlePlay}
          className="w-full flex items-center justify-center gap-2 h-8 rounded-lg text-[12px] font-semibold transition-colors"
          style={{
            background: playing ? 'var(--lp-blue-soft)' : 'var(--lp-blue)',
            color: playing ? 'var(--lp-blue)' : 'var(--lp-bg)',
            border: playing ? '1px solid var(--lp-blue-border)' : '1px solid var(--lp-blue)',
          }}
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
          {playing ? 'Playing Al-Fātiḥa 1:1' : 'Play Al-Fātiḥa 1:1'}
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────── Workspace cell ───────────────────────── */

function WorkspaceCell() {
  const rows = [
    { icon: StickyNote, label: 'Notes with auto-timestamps (created & updated)' },
    { icon: Bookmark, label: 'Bookmark any verse — synced to your Quran.com account' },
    { icon: Share2, label: 'Share a workspace by URL, export / import as JSON' },
    { icon: Save, label: 'Multiple named workspaces — switch anytime' },
    { icon: Undo2, label: 'Full undo · redo across nodes, edges, and notes' },
  ]
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Eyebrow icon={Layers}>Workspace</Eyebrow>
      </div>
      <h3 className="lp-font-display text-lg md:text-xl font-semibold mb-2" style={{ color: 'var(--lp-text)' }}>
        Your study, saved and shareable.
      </h3>
      <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: 'var(--lp-text-dim)' }}>
        Every canvas persists. Open it next week, share it with a study partner, hand it to a scholar.
      </p>

      <div className="space-y-2">
        {rows.map(({ icon: Icon, label }, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2 rounded-lg"
            style={{ background: 'var(--lp-surface-2)', border: '1px solid var(--lp-hairline)' }}
          >
            <Icon size={13} style={{ color: 'var(--lp-violet)' }} />
            <span className="text-[12px]" style={{ color: 'var(--lp-text-muted)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <div
        className="mt-3 flex items-center gap-1 px-2 py-1 rounded-md w-fit"
        style={{ border: '1px solid var(--lp-hairline)' }}
      >
        <Undo2 size={11} style={{ color: 'var(--lp-text-dim)' }} />
        <Redo2 size={11} style={{ color: 'var(--lp-text-dim)' }} />
        <span className="text-[10px] font-mono" style={{ color: 'var(--lp-text-faint)' }}>
          ⌘Z · ⌘⇧Z
        </span>
      </div>
    </div>
  )
}

/* ───────────────────────── Main section ───────────────────────── */

export default function ExplorerBentoSection() {
  return (
    <Section id="explore" accent="slate" pad="xl" width="7xl">
      <ScrollReveal className="max-w-2xl mb-8">
        <Eyebrow>The explorer</Eyebrow>
        <h2
          className="lp-font-display text-3xl md:text-5xl font-semibold mt-4 mb-4 leading-[1.05]"
          style={{ color: 'var(--lp-text)' }}
        >
          A canvas for how the Quran <span style={{ color: 'var(--lp-text-dim)' }}>actually connects.</span>
        </h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--lp-text-muted)' }}>
          Six real features, each one a click away. Every demo below is the same component you will use in the app.
        </p>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5">
        <ScrollReveal className="md:col-span-4 flex flex-col">
          <BentoCard accent="emerald" accented className="flex-1">
            <SearchFiltersCell />
          </BentoCard>
        </ScrollReveal>

        <ScrollReveal delay={80} className="md:col-span-2 flex flex-col">
          <BentoCard accent="violet" accented className="flex-1">
            <WordBuilderCell />
          </BentoCard>
        </ScrollReveal>

        <ScrollReveal delay={120} className="md:col-span-3 flex flex-col">
          <BentoCard accent="cyan" accented className="flex-1">
            <VerseDetailCell />
          </BentoCard>
        </ScrollReveal>

        <ScrollReveal delay={160} className="md:col-span-3 flex flex-col">
          <BentoCard accent="blue" accented className="flex-1">
            <AudioCell />
          </BentoCard>
        </ScrollReveal>

        <ScrollReveal delay={200} className="md:col-span-6">
          <BentoCard accent="violet" accented>
            <WorkspaceCell />
          </BentoCard>
        </ScrollReveal>
      </div>
    </Section>
  )
}
