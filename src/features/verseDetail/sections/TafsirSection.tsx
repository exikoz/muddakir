import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import { fetchTafsir, fetchAvailableTafsirs } from '../../../services/verseDetailApi'
import { TAFSIR, TAFSIR_PREVIEW_LENGTH } from '../detailConfig'
import type { TafsirData, ResourceItem } from '../types'

/** Strip HTML tags and decode entities for safe display */
function sanitizeHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? div.innerText ?? ''
}

export default function TafsirSection() {
  const { t } = useTranslation('verseDetail')
  const verse = useVerseDetailStore(s => s.verse)
  const [tafsir, setTafsir] = useState<TafsirData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Available tafsirs + selected
  const [available, setAvailable] = useState<ResourceItem[]>([])
  const [selectedId, setSelectedId] = useState(TAFSIR.id)
  const [showPicker, setShowPicker] = useState(false)

  // Fetch available tafsirs list once
  useEffect(() => {
    fetchAvailableTafsirs().then(setAvailable)
  }, [])

  // Fetch selected tafsir for the current verse
  useEffect(() => {
    if (!verse) return
    let cancelled = false
    setLoading(true)
    setError(false)
    setExpanded(false)

    fetchTafsir(verse.verse_key, selectedId).then(data => {
      if (!cancelled) { setTafsir(data); setLoading(false) }
    }).catch(() => {
      if (!cancelled) { setError(true); setLoading(false) }
    })

    return () => { cancelled = true }
  }, [verse?.verse_key, selectedId])

  if (!verse) return null

  const plainText = tafsir ? sanitizeHtml(tafsir.text) : ''
  const isLong = plainText.length > TAFSIR_PREVIEW_LENGTH
  const displayText = expanded || !isLong ? plainText : plainText.slice(0, TAFSIR_PREVIEW_LENGTH) + '…'

  const selectedName = available.find(t => t.id === selectedId)?.name ?? tafsir?.resourceName ?? 'Tafsir'

  return (
    <div className="px-4 py-3">
      {/* Tafsir selector */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-700 font-medium transition-colors"
        >
          {selectedName}
          <ChevronDown size={10} className={`transition-transform ${showPicker ? 'rotate-180' : ''}`} />
        </button>

        {showPicker && (
          <div className="absolute top-6 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto p-1">
            {available.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedId(t.id); setShowPicker(false) }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left text-[10px] hover:bg-slate-50 transition-colors ${
                  selectedId === t.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-600'
                }`}
              >
                <span className="truncate">{t.name}</span>
                <span className="text-[8px] text-slate-400 ml-2 shrink-0">{t.language}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
          <Loader2 size={12} className="animate-spin" />
          {t('loading_tafsir')}
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-between py-2">
          <span className="text-xs text-slate-400">{t('error_tafsir')}</span>
          <button
            onClick={() => { setLoading(true); setError(false); fetchTafsir(verse.verse_key, selectedId).then(setTafsir).finally(() => setLoading(false)) }}
            className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"
          >
            <RefreshCw size={10} /> {t('retry')}
          </button>
        </div>
      )}

      {!loading && !error && tafsir && (
        <>
          <p className="text-sm text-slate-600 leading-relaxed">{displayText}</p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium mt-1.5"
            >
              {expanded ? t('show_less') : t('read_full_tafsir')}
            </button>
          )}
        </>
      )}

      {!loading && !error && !tafsir && (
        <p className="text-xs text-slate-400">{t('no_tafsir')}</p>
      )}
    </div>
  )
}
