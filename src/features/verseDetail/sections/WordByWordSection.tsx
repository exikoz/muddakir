import { useState } from 'react'
import { ChevronRight, Sparkles, Loader2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useVerseDetailStore } from '../../../store/verseDetailStore'

export default function WordByWordSection() {
  const { t, i18n } = useTranslation('verseDetail')
  const contentDir = i18n.dir()
  const verse = useVerseDetailStore(s => s.verse)
  const wordExplanations = useVerseDetailStore(s => s.wordExplanations)
  const wordExplanationLoading = useVerseDetailStore(s => s.wordExplanationLoading)
  const fetchWordExplanation = useVerseDetailStore(s => s.fetchWordExplanation)
  const askMoreAboutWord = useVerseDetailStore(s => s.askMoreAboutWord)

  const [activeWordPos, setActiveWordPos] = useState<number | null>(null)
  const [askInput, setAskInput] = useState('')

  if (!verse) return null

  const words = verse.words.filter(w => w.char_type_name !== 'end')

  function handleWordTap(position: number) {
    if (activeWordPos === position) {
      setActiveWordPos(null)
      return
    }

    setActiveWordPos(position)
    setAskInput('')

    // Fetch if not cached
    const cacheKey = `${verse!.verse_key}:${position}`
    if (!wordExplanations[cacheKey]) {
      fetchWordExplanation(position)
    }
  }

  function handleAskMore(e: React.FormEvent, position: number) {
    e.preventDefault()
    askMoreAboutWord(position, askInput.trim() || undefined)
    setAskInput('')
  }

  return (
    <div>
      <div className="px-4 pt-3 pb-3">
          {/* Instructional hint — always visible in teal */}
          <p className="text-[11px] text-emerald-600 mb-2.5 flex items-center gap-1 font-medium">
            {t('tap_word_hint')}
          </p>

          <div className="space-y-0.5">
            {words.map((word) => {
              const isActive = activeWordPos === word.position
              const cacheKey = `${verse!.verse_key}:${word.position}`
              const explanation = wordExplanations[cacheKey]
              const isLoading = wordExplanationLoading === cacheKey

              return (
                <div key={word.position}>
                  {/* Word row */}
                  <button
                    onClick={() => handleWordTap(word.position)}
                    className={`w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-colors text-left group cursor-pointer ${
                      isActive ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`font-arabic text-lg w-28 text-right shrink-0 transition-colors ${
                        isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                      }`}
                      dir="rtl"
                    >
                      {word.text}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 w-24 shrink-0 truncate">
                      {word.transliteration ?? ''}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex-1 truncate">
                      {word.translation ?? ''}
                    </span>
                    <ChevronRight
                      size={10}
                      className={`text-slate-300 dark:text-slate-600 shrink-0 transition-transform ${
                        isActive ? 'rotate-90 text-emerald-500' : 'group-hover:text-slate-400 dark:group-hover:text-slate-500'
                      }`}
                    />
                  </button>

                  {/* Inline expansion */}
                  {isActive && (
                    <div className="ml-2 mb-2 border-l-2 border-emerald-400 bg-white dark:bg-slate-800 rounded-r-lg p-3 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles size={10} className="text-purple-400" />
                        <span className="font-arabic text-base text-slate-800 dark:text-slate-100" dir="rtl">{word.text}</span>
                      </div>

                      {isLoading && !explanation && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                          <Loader2 size={10} className="animate-spin" />
                          {t('analyzing')}
                        </div>
                      )}

                      {explanation && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1.5" dir={contentDir}>
                          {explanation.split(/\n{2,}|\n/).filter(Boolean).map((line, i) => {
                            const trimmed = line.trim()
                            if (trimmed.startsWith('✅') && /Verification Token/i.test(trimmed)) {
                              return (
                                <p key={i} className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700 leading-relaxed">
                                  {trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}
                                </p>
                              )
                            }
                            return <p key={i}>{trimmed}</p>
                          })}
                        </div>
                      )}

                      {/* Ask more about this word */}
                      <form onSubmit={(e) => handleAskMore(e, word.position)} className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={askInput}
                            onChange={e => setAskInput(e.target.value)}
                            placeholder={t('ask_more_about_word', { word: word.text })}
                            className="flex-1 text-[10px] text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent outline-none"
                            dir="ltr"
                          />
                          <button
                            type="submit"
                            className="text-purple-500 hover:text-purple-700 transition-colors shrink-0"
                            title="Ask in AI Scope"
                          >
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
    </div>
  )
}
