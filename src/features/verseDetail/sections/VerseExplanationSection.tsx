/**
 * Verse Explanation tab content — fetches AI explanation when the user
 * switches to the Explain tab. Cached per verse_key.
 */

import { useState, useEffect } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useVerseDetailStore } from '../../../store/verseDetailStore'

export default function VerseExplanationSection() {
  const verse = useVerseDetailStore(s => s.verse)
  const explanations = useVerseDetailStore(s => s.verseExplanations)
  const loading = useVerseDetailStore(s => s.verseExplanationLoading)
  const fetchExplanation = useVerseDetailStore(s => s.fetchVerseExplanation)
  const askMore = useVerseDetailStore(s => s.askMoreAboutVerse)
  const [input, setInput] = useState('')

  const explanation = verse ? explanations[verse.verse_key] : undefined

  // Fetch when this tab mounts and no cached explanation exists
  useEffect(() => {
    if (verse && !explanation && !loading) {
      fetchExplanation()
    }
  }, [verse?.verse_key])

  if (!verse) return null

  function handleAskMore(e: React.FormEvent) {
    e.preventDefault()
    askMore(input.trim() || undefined)
    setInput('')
  }

  return (
    <div className="px-4 pt-3 pb-4">
      {loading && !explanation && (
        <div className="space-y-2 py-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
            <Loader2 size={12} className="animate-spin" />
            Generating explanation…
          </div>
          <div className="space-y-1.5 animate-pulse">
            <div className="h-2.5 bg-slate-200 rounded w-full" />
            <div className="h-2.5 bg-slate-200 rounded w-11/12" />
            <div className="h-2.5 bg-slate-200 rounded w-9/12" />
          </div>
        </div>
      )}

      {explanation && (
        <>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={10} className="text-emerald-500" />
            <span className="text-[10px] font-semibold text-slate-400">AI Explanation</span>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed space-y-2">
            {explanation.split(/\n{2,}|\n/).filter(Boolean).map((para, i) => {
              const trimmed = para.trim()
              if (trimmed.startsWith('✅') && /Verification Token/i.test(trimmed)) {
                return (
                  <p key={i} className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 leading-relaxed">
                    {trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}
                  </p>
                )
              }
              return <p key={i}>{trimmed}</p>
            })}
          </div>

          {/* Ask more */}
          <form onSubmit={handleAskMore} className="mt-3 pt-2.5 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask more about this verse..."
                className="flex-1 text-xs text-slate-600 placeholder:text-slate-400 bg-transparent outline-none"
              />
              <button
                type="submit"
                className="text-emerald-500 hover:text-emerald-700 hover:underline transition-colors shrink-0 text-[10px] font-medium"
              >
                Ask more →
              </button>
            </div>
          </form>

          {/* Attribution */}
          <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
            Grounded in quran.com — tafsir, translations, and verified text
          </p>
        </>
      )}
    </div>
  )
}
