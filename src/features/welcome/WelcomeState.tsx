import { useState, useCallback } from 'react'
import { GitBranch, Sparkles, BookOpen, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'

const EXAMPLE_SEED = '2:255'
const EXAMPLE_BRANCHES = ['3:2', '20:111', '2:284']

export default function WelcomeState() {
  const { t } = useTranslation('welcome')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [exampleLoading, setExampleLoading] = useState(false)
  const addVerseNode = useStore(s => s.addVerseNode)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const verseKey = input.trim()
    if (!verseKey) return
    setLoading(true)
    try {
      await addVerseNode(verseKey)
      setInput('')
    } catch (err) {
      console.error('[WelcomeState] error:', err)
    } finally {
      setLoading(false)
    }
  }, [input, addVerseNode])

  const handleExample = useCallback(async () => {
    setExampleLoading(true)
    try {
      await addVerseNode(EXAMPLE_SEED)
      const nodes = useStore.getState().nodes
      const seedNode = nodes.find(
        (n: { type: string; data?: { verse?: { verse_key?: string } } }) =>
          n.type === 'verse' && n.data?.verse?.verse_key === EXAMPLE_SEED
      )
      const seedId = seedNode?.id as string | undefined
      for (const vk of EXAMPLE_BRANCHES) {
        await addVerseNode(vk, seedId)
      }
    } catch (err) {
      console.error('[WelcomeState] example error:', err)
    } finally {
      setExampleLoading(false)
    }
  }, [addVerseNode])

  const handleGuide = useCallback(() => {
    console.log('[WelcomeState] Open guide — not yet implemented')
  }, [])

  const isLoading = loading || exampleLoading

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none select-none">
      <div className="flex flex-col items-center gap-6 pointer-events-auto">
        {/* Watermark — Quranic verse */}
        <div className="flex flex-col items-center pointer-events-none select-none">
          <span
            className="text-[4.5rem] leading-tight text-slate-400/[0.12]"
            dir="rtl"
          >
            أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ
          </span>
        </div>

        {/* Tagline */}
        <p className="text-sm text-slate-400/60 text-center max-w-sm leading-relaxed pointer-events-none">
          {t('tagline')}
        </p>

        {/* Verse input — the only solid interactive element */}
        <form onSubmit={handleSubmit} className="flex items-center mt-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('input_placeholder')}
            disabled={isLoading}
            className="h-11 w-72 px-4 text-sm rounded-l-lg border border-slate-300/70 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100/60 dark:focus:ring-emerald-900/40 transition-all disabled:opacity-50"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-11 px-5 rounded-r-lg bg-emerald-600/90 text-white font-medium text-sm hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : t('go')}
          </button>
        </form>

        {/* Try example */}
        <button
          onClick={handleExample}
          disabled={isLoading}
          className="text-xs font-medium text-emerald-600/70 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          {exampleLoading && <Loader2 size={12} className="animate-spin" />}
          {t('try_example')}
        </button>

        {/* Feature hints — just muted text with inline icons */}
        <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-400/60">
          <span className="flex items-center gap-1">
            <GitBranch size={12} />
            {t('card_connections_text')}
          </span>
          <span className="text-slate-300/40">·</span>
          <span className="flex items-center gap-1">
            <Sparkles size={12} />
            {t('card_ai_text')}
          </span>
          <span className="text-slate-300/40">·</span>
          <span className="flex items-center gap-1">
            <BookOpen size={12} />
            {t('card_study_text')}
          </span>
        </div>

        {/* Footer */}
        <button
          onClick={handleGuide}
          className="text-[11px] text-slate-400/40 hover:text-slate-500/60 transition-colors mt-2"
        >
          {t('need_help')}
        </button>
      </div>
    </div>
  )
}
