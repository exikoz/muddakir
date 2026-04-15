import { useState, useEffect } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import { fetchTranslations } from '../../../services/verseDetailApi'
import type { TranslationData } from '../types'

export default function TranslationsSection() {
  const verse = useVerseDetailStore(s => s.verse)
  const [translations, setTranslations] = useState<TranslationData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!verse) return
    let cancelled = false
    setLoading(true)
    setError(false)

    fetchTranslations(verse.verse_key).then(data => {
      if (cancelled) return
      setTranslations(data)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) { setError(true); setLoading(false) }
    })

    return () => { cancelled = true }
  }, [verse?.verse_key])

  if (!verse) return null

  return (
    <div className="border-b border-slate-100">
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Translations
        </span>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
            <Loader2 size={12} className="animate-spin" />
            Loading translations…
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-400">Could not load translations</span>
            <button
              onClick={() => { setLoading(true); setError(false); fetchTranslations(verse.verse_key).then(setTranslations).finally(() => setLoading(false)) }}
              className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"
            >
              <RefreshCw size={10} /> Retry
            </button>
          </div>
        )}

        {!loading && !error && translations.map(t => (
          <div key={t.resourceId}>
            <p className="text-[10px] font-semibold text-slate-400 mb-1">{t.resourceName}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{t.text}</p>
          </div>
        ))}

        {!loading && !error && translations.length === 0 && (
          <p className="text-xs text-slate-400">No translations available.</p>
        )}
      </div>
    </div>
  )
}
