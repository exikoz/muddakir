import { useState, useRef, useEffect } from 'react'
import { Wrench, Sliders, Terminal } from 'lucide-react'
import UIDebugCustomizer from '../../components/UIDebugCustomizer'
import DebugConsole from '../../components/DebugConsole'

export default function AdvancedToggle() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isActive = customizerOpen || consoleOpen

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={`h-8 w-8 rounded-lg border transition-all flex items-center justify-center ${
          isActive
            ? 'bg-amber-50 text-amber-600 border-amber-300'
            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:text-slate-600 hover:border-slate-300'
        }`}
        title="Advanced — Developer tools"
      >
        <Wrench size={14} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-50">
          <button
            onClick={() => {
              setCustomizerOpen(v => !v)
              setMenuOpen(false)
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
              customizerOpen
                ? 'text-amber-600 bg-amber-50'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Sliders size={13} />
            <span>UI Customizer</span>
          </button>
          <button
            onClick={() => {
              setConsoleOpen(v => !v)
              setMenuOpen(false)
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
              consoleOpen
                ? 'text-amber-600 bg-amber-50'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Terminal size={13} />
            <span>Debug Console</span>
          </button>
        </div>
      )}

      {customizerOpen && <UIDebugCustomizer onClose={() => setCustomizerOpen(false)} />}
      {consoleOpen && <DebugConsole onClose={() => setConsoleOpen(false)} />}
    </div>
  )
}
