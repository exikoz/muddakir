import { useState, useRef, useEffect } from 'react'
import { Wrench, Sliders, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import UIDebugCustomizer from '../../components/UIDebugCustomizer'
import DebugConsole from '../../components/DebugConsole'

export default function AdvancedToggle() {
  const { t } = useTranslation('toolbar')
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
        className={`h-8 px-2.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold ${
          isActive
            ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-600'
            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-600'
        }`}
        title={t('advanced_title')}
      >
        <Wrench size={14} />
        <span>{t('advanced_label')}</span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-lg py-1 z-50">
          <button
            onClick={() => {
              setCustomizerOpen(v => !v)
              setMenuOpen(false)
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
              customizerOpen
                ? 'text-orange-600 bg-orange-50'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Sliders size={13} />
            <span>{t('ui_customizer')}</span>
          </button>
          <button
            onClick={() => {
              setConsoleOpen(v => !v)
              setMenuOpen(false)
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
              consoleOpen
                ? 'text-orange-600 bg-orange-50'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Terminal size={13} />
            <span>{t('debug_console')}</span>
          </button>
        </div>
      )}

      {customizerOpen && <UIDebugCustomizer onClose={() => setCustomizerOpen(false)} />}
      {consoleOpen && <DebugConsole onClose={() => setConsoleOpen(false)} />}
    </div>
  )
}
