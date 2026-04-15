import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, ChevronDown, Check } from 'lucide-react'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import { fetchTranslations, fetchAvailableTranslations } from '../../../services/verseDetailApi'
import { TRANSLATIONS } from '../detailConfig'
import type { TranslationData, ResourceItem } from '../types'

export default function TranslationsSection() {
  const verse = useVerseDetailStore(s => s.verse)
  const [translations, setTranslations] = useState<TranslationData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Available translations from API + user selection
  const [available, setAvailable] = useState<ResourceItem[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>(() => TRANSLATIONS.map(t => t.id))
  const [showPicker, setShowPicker] = useState(false)

  // Fetch available translations list once
  useEffect(() => {
    fetchAvailableTranslations().then(setAvailable)
  }, [])

  // Fetch selected translations for the current verse
  useEffect(() => {
    if (!verse || selectedIds.length === 0) {
      setTranslations([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(false)

    fetchTranslations(verse.verse_key, selectedIds).then(data => {
      if (!cancelled) { setTranslations(data); setLoading(false) }
    }).catch(() => {
      if (!cancelled) { setError(true); setLoading(false) }
    })

    return () => { cancelled = true }
  }, [verse?.verse_key, selectedIds])

  if (!verse) return null

  function toggleTranslation(id: number) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // Group available by language for the picker
  const englishTranslations = available.filter(t => t.language.toLowerCase().includes('english'))
  const otherTranslations = available.filter(t => !t.language.toLowerCase().includes('english'))

  return (
    <div className="px-4 py-3">
      {/* Selector */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-700 font-medium transition-colors"
        >
          {selectedIds.length} translation{selectedIds.length !== 1 ? 's' : ''} selected
          <ChevronDown size={10} className={`transition-transform ${showPicker ? 'rotate-180' : ''}`} />
        </button>

        {showPicker && (
          <div className="absolute top-6 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto p-1">
            {englishTranslations.length > 0 && (
              <>
                <p className="text-[9px] text-slate-400 font-semibold uppercase px-2 pt-1.5 pb-0.5">English</p>
                {englishTranslations.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTranslation(t.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[10px] hover:bg-slate-50 transition-colors"
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      selectedIds.includes(t.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                    }`}>
                      {selectedIds.includes(t.id) && <Check size={8} />}
                    </span>
                    <span className="text-slate-700 truncate">{t.name}</span>
                  </button>
                ))}
              </>
            )}
            {otherTranslations.length > 0 && (
              <>
                <p className="text-[9px] text-slate-400 font-semibold uppercase px-2 pt-2 pb-0.5">Other Languages</p>
                {otherTranslations.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTranslation(t.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[10px] hover:bg-slate-50 transition-colors"
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      selectedIds.includes(t.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                    }`}>
                      {selectedIds.includes(t.id) && <Check size={8} />}
                    </span>
                    <span className="text-slate-600 truncate">{t.name}</span>
                    <span className="text-[8px] text-slate-400 ml-auto shrink-0">{t.language}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
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
              onClick={() => { setLoading(true); setError(false); fetchTranslations(verse.verse_key, selectedIds).then(setTranslations).finally(() => setLoading(false)) }}
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

        {!loading && !error && translations.length === 0 && selectedIds.length > 0 && (
          <p className="text-xs text-slate-400">No translations available.</p>
        )}

        {selectedIds.length === 0 && (
          <p className="text-xs text-slate-400">Select at least one translation above.</p>
        )}
      </div>
    </div>
  )
}
