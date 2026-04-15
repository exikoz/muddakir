import { useState, useEffect } from 'react'
import { Plus, Check, BookOpen, Loader2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchVerse } from '../../services/quranApi'
import { useStore } from '../../store'
import type { Verse } from '../../types/quran'

interface Props {
  verseKey: string
}

export default function AIScopeVerseCard({ verseKey }: Props) {
  const { t } = useTranslation('aiScope')
  const addVerseNode = useStore(s => s.addVerseNode)
  const nodes = useStore(s => s.nodes)
  const [verse, setVerse] = useState<Verse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [adding, setAdding] = useState(false)

  const isOnCanvas = nodes.some(n => n.data.verse.verse_key === verseKey)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    fetchVerse(verseKey).then(v => {
      if (cancelled) return
      if (v) {
        setVerse(v)
      } else {
        setError(true)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [verseKey])

  async function handleAddToCanvas() {
    setAdding(true)
    await addVerseNode(verseKey)
    setAdding(false)
  }

  function handleRetry() {
    setLoading(true)
    setError(false)
    fetchVerse(verseKey).then(v => {
      if (v) setVerse(v)
      else setError(true)
      setLoading(false)
    })
  }

  function handleOpenMushaf() {
    const opener = (window as any).__mushafOpener
    if (opener) opener(verseKey)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl my-2.5 overflow-hidden transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Verse {verseKey}
        </span>
        {isOnCanvas ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
            <Check size={12} />
            {t('added')}
          </span>
        ) : (
          <button
            onClick={handleAddToCanvas}
            disabled={adding || loading}
            className="flex items-center gap-1 text-[10px] font-semibold text-purple-600 hover:text-purple-700 px-2 py-0.5 rounded-md hover:bg-purple-50 transition-colors disabled:opacity-40"
          >
            {adding ? <Loader2 size={10} className="animate-spin" /> : <Plus size={12} />}
            {t('add_to_canvas')}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Loader2 size={14} className="animate-spin" />
              {t('loading_verse')}
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-slate-400">{t('error_load_verse', { key: verseKey })}</span>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-700 font-medium"
            >
              <RefreshCw size={10} />
              Retry
            </button>
          </div>
        )}

        {verse && !loading && (
          <>
            {/* Arabic text */}
            <p
              className="font-arabic text-right text-xl leading-loose text-slate-800 mb-2.5"
              dir="rtl"
            >
              {verse.words
                .filter(w => w.char_type_name !== 'end')
                .map(w => w.text)
                .join(' ')}
            </p>

            {/* Translation */}
            {verse.translation && (
              <p className="text-xs text-slate-500 leading-relaxed">
                {verse.translation}
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {verse && !loading && (
        <div className="px-3.5 py-1.5 border-t border-slate-50">
          <button
            onClick={handleOpenMushaf}
            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-emerald-600 transition-colors font-medium"
          >
            <BookOpen size={11} />
            {t('read_in_mushaf')}
          </button>
        </div>
      )}
    </div>
  )
}
