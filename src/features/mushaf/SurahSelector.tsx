import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSurahName, surahMatchesQuery } from './surahNames'

const ALL_SURAHS = Array.from({ length: 114 }, (_, i) => i + 1)

interface Props {
  value: number
  onChange: (num: number) => void
}

export default function SurahSelector({ value, onChange }: Props) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = ALL_SURAHS.filter(n => surahMatchesQuery(n, query))

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function select(num: number) {
    onChange(num)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative flex-1">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
      >
        <span className="truncate">{value}. {getSurahName(value, lang)}</span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 flex flex-col max-h-64 overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-100 dark:border-slate-700">
            <Search size={12} className="text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={getSurahName(1, lang) + ', ' + getSurahName(1, lang === 'ar' ? 'en' : 'ar') + '...'}
              className="flex-1 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent outline-none"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">—</p>
            )}
            {filtered.map(n => (
              <button
                key={n}
                onClick={() => select(n)}
                className={`w-full text-left px-2.5 py-1.5 text-sm transition-colors ${
                  n === value
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {n}. {getSurahName(n, lang)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
