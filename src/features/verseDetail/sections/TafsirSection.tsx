import { useState, useEffect } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import { fetchTafsir } from '../../../services/verseDetailApi'
import { TAFSIR_PREVIEW_LENGTH } from '../detailConfig'
import type { TafsirData } from '../types'

/** Strip HTML tags and decode entities for safe display */
function sanitizeHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? div.innerText ?? ''
}

export default function TafsirSection() {
  const verse = useVerseDetailStore(s => s.verse)
  const [tafsir, setTafsir] = useState<TafsirData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!verse) return
    let cancelled = false
    setLoading(true)
    setError(false)
    setExpanded(false)

    fetchTafsir(verse.verse_key).then(data => {
      if (cancelled) return
      setTafsir(data)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) { setError(true); setLoading(false) }
    })

    return () => { cancelled = true }
  }, [verse?.verse_key])

  if (!verse) return null

  const plainText = tafsir ? sanitizeHtml(tafsir.text) : ''
  const isLong = plainText.length > TAFSIR_PREVIEW_LENGTH
  const displayText = expanded || !isLong ? plainText : plainText.slice(0, TAFSIR_PREVIEW_LENGTH) + '…'

  return (
    <div className="border-b border-slate-100">
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Tafsir
        </span>
      </div>

      <div className="px-4 pb-4">
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
            <Loader2 size={12} className="animate-spin" />
            Loading tafsir…
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-400">Could not load tafsir</span>
            <button
              onClick={() => { setLoading(true); setError(false); fetchTafsir(verse.verse_key).then(setTafsir).finally(() => setLoading(false)) }}
              className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"
            >
              <RefreshCw size={10} /> Retry
            </button>
          </div>
        )}

        {!loading && !error && tafsir && (
          <>
            <p className="text-[10px] font-semibold text-slate-400 mb-1">{tafsir.resourceName}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{displayText}</p>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium mt-1.5"
              >
                {expanded ? 'Show less' : 'Read full tafsir'}
              </button>
            )}
          </>
        )}

        {!loading && !error && !tafsir && (
          <p className="text-xs text-slate-400">No tafsir available for this verse.</p>
        )}
      </div>
    </div>
  )
}
