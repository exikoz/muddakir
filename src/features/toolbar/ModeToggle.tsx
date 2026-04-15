import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useStore } from '../../store'
import type { SearchOptions } from '../../types/quran'
import { MODE_COLORS } from '../../lib/modeColors'

const OPTION_CONFIG: {
  key: keyof SearchOptions
  label: string
  dot: string
  active: string
}[] = [
  { key: 'lemma',    label: MODE_COLORS.lemma.name,    dot: MODE_COLORS.lemma.dot,    active: MODE_COLORS.lemma.active },
  { key: 'root',     label: MODE_COLORS.root.name,     dot: MODE_COLORS.root.dot,     active: MODE_COLORS.root.active },
  { key: 'fuzzy',    label: MODE_COLORS.fuzzy.name,    dot: MODE_COLORS.fuzzy.dot,    active: MODE_COLORS.fuzzy.active },
  { key: 'semantic', label: MODE_COLORS.semantic.name, dot: MODE_COLORS.semantic.dot, active: MODE_COLORS.semantic.active },
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
  const label = activeKeys.length === 0 ? MODE_COLORS.exact.name : activeKeys[0].label
  const dotColor = activeKeys.length === 0 ? MODE_COLORS.exact.dot : activeKeys[0].dot

  function selectMode(key: keyof SearchOptions) {
    setSearchOptions({
      lemma: key === 'lemma',
      root: key === 'root',
      fuzzy: key === 'fuzzy',
      semantic: key === 'semantic',
    })
    setOpen(false)
  }

  function selectExact() {
    setSearchOptions({
      lemma: false,
      root: false,
      fuzzy: false,
      semantic: false,
    })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="h-8 px-2.5 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1.5 bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white"
        title="Search mode"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        <span>{label}</span>
        <ChevronDown size={11} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-10 left-0 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 min-w-[150px] z-50 flex flex-col gap-0.5">
          <button
            onClick={selectExact}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all text-left ${
              activeKeys.length === 0
                ? MODE_COLORS.exact.active + ' border'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeKeys.length === 0 ? MODE_COLORS.exact.dot : 'bg-slate-300'}`} />
            {MODE_COLORS.exact.name}
            {activeKeys.length === 0 && <span className="ml-auto text-[9px] opacity-60">✓</span>}
          </button>

          {OPTION_CONFIG.map(({ key, label, dot, active }) => {
            const isOn = !!searchOptions[key]
            return (
              <button
                key={key}
                onClick={() => selectMode(key)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all text-left ${isOn ? active : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOn ? dot : 'bg-slate-300'}`} />
                {label}
                {isOn && <span className="ml-auto text-[9px] opacity-60">✓</span>}
              </button>
            )
          })}

          <div className="border-t border-slate-100 mt-0.5 pt-0.5">
            <p className="text-[9px] text-slate-400 px-2.5 py-0.5 leading-tight">
              One mode at a time
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
