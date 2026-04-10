import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useStore } from '../../store'
import type { SearchOptions } from '../../types/quran'

const OPTION_CONFIG: {
  key: keyof SearchOptions
  label: string
  dot: string
  active: string
}[] = [
  { key: 'lemma',    label: 'Lemma',    dot: 'bg-amber-500',   active: 'text-amber-700 bg-amber-50 border-amber-300' },
  { key: 'root',     label: 'Root',     dot: 'bg-violet-500',  active: 'text-violet-700 bg-violet-50 border-violet-300' },
  { key: 'fuzzy',    label: 'Fuzzy',    dot: 'bg-orange-400',  active: 'text-orange-700 bg-orange-50 border-orange-300' },
  { key: 'semantic', label: 'Semantic', dot: 'bg-teal-500',    active: 'text-teal-700 bg-teal-50 border-teal-300' },
]

export default function ModeToggle() {
  const searchOptions = useStore(s => s.searchOptions)
  const setSearchOptions = useStore(s => s.setSearchOptions)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeKeys = OPTION_CONFIG.filter(o => searchOptions[o.key])
  const label = activeKeys.length === 0 ? 'EXACT' : activeKeys.map(o => o.label).join(' + ')
  const dotColor = activeKeys.length === 0 ? 'bg-emerald-500' : activeKeys[0].dot

  function toggle(key: keyof SearchOptions) {
    setSearchOptions({ ...searchOptions, [key]: !searchOptions[key] })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="h-9 px-3 rounded-full shadow-sm border text-xs font-bold transition-all flex items-center gap-1.5 bg-white/80 text-slate-700 border-slate-200 hover:border-slate-300"
        title="Search options"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-11 left-0 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 min-w-[160px] z-50 flex flex-col gap-0.5">
          {OPTION_CONFIG.map(({ key, label, dot, active }) => {
            const isOn = !!searchOptions[key]
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${isOn ? active : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isOn ? dot : 'bg-slate-300'}`} />
                {label}
                {isOn && <span className="ml-auto text-[10px] opacity-60">ON</span>}
              </button>
            )
          })}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <p className="text-[10px] text-slate-400 px-3 py-1 leading-tight">
              No options = exact match only
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
