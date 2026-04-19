/**
 * Mobile welcome / empty state — seed input.
 * Simplified version of the desktop WelcomeState.
 */

import { useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'

export default function MobileWelcome() {
  const { t } = useTranslation('welcome')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const addVerseNode = useStore(s => s.addVerseNode)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const val = input.trim()
    if (!val) return
    setLoading(true)
    try {
      await addVerseNode(val)
      setInput('')
    } finally {
      setLoading(false)
    }
  }, [input, addVerseNode])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
      <span className="text-5xl text-slate-400/[0.12]" dir="rtl">
        أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ
      </span>

      <p className="text-sm text-slate-400/60 text-center max-w-xs leading-relaxed">
        {t('tagline')}
      </p>

      <form onSubmit={handleSubmit} className="flex items-center w-full max-w-xs">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('input_placeholder')}
          disabled={loading}
          className="flex-1 h-11 px-4 text-sm rounded-l-lg border border-slate-300/70 bg-white text-slate-700 placeholder:text-slate-400 outline-none focus:border-emerald-400 disabled:opacity-50"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-11 px-5 rounded-r-lg bg-emerald-600 text-white font-medium text-sm disabled:opacity-40 flex items-center gap-2"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : t('go')}
        </button>
      </form>
    </div>
  )
}
