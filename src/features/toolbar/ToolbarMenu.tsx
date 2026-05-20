import { useState, useRef, useEffect } from 'react'
import { Menu, Globe, Sliders, Terminal, Package, Globe2, Moon, Sun, Monitor } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supportedLanguages, type SupportedLanguage } from '../../i18n/config'
import { useSearchProviderStore } from '../../store/searchProviderStore'
import { useThemeStore } from '../../store/themeStore'
import UIDebugCustomizer from '../../components/UIDebugCustomizer'
import DebugConsole from '../../components/DebugConsole'

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  ar: 'العربية',
}

export default function ToolbarMenu() {
  const { t, i18n } = useTranslation('toolbar')
  const [open, setOpen] = useState(false)
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentLang = i18n.language as SupportedLanguage
  const providerName = useSearchProviderStore(s => s.providerName)
  const setProvider = useSearchProviderStore(s => s.setProvider)
  const isAPI = providerName === 'api'
  const theme = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)

  const THEME_CYCLE: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun
  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'system' ? 'Auto' : 'Light'

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function cycleLang() {
    const idx = supportedLanguages.indexOf(currentLang)
    const next = supportedLanguages[(idx + 1) % supportedLanguages.length]
    i18n.changeLanguage(next)
    setOpen(false)
  }

  const row = 'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors'
  const idle = 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
  const sep = 'my-0.5 border-t border-slate-100 dark:border-slate-700'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="h-8 w-8 rounded-lg border flex items-center justify-center transition-all bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
        title="More options"
      >
        <Menu size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-lg py-1 z-50">
          {/* Language */}
          <button onClick={cycleLang} className={`${row} ${idle}`}>
            <Globe size={14} className="shrink-0" />
            <span className="flex-1 text-left">{t('language', 'Language')}</span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              {LANGUAGE_LABELS[currentLang] ?? currentLang}
            </span>
          </button>

          {/* Theme */}
          <button
            onClick={() => {
              const idx = THEME_CYCLE.indexOf(theme)
              setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length])
            }}
            className={`${row} ${idle}`}
          >
            <ThemeIcon size={14} className="shrink-0" />
            <span className="flex-1 text-left">{t('theme', 'Theme')}</span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              {themeLabel}
            </span>
          </button>

          <div className={sep} />

          {/* Dev tools section label */}
          <p className="px-3 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('dev_tools', 'Dev tools')}
          </p>

          {/* UI Customizer */}
          <button
            onClick={() => { setCustomizerOpen(v => !v); setOpen(false) }}
            className={`${row} ${customizerOpen ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30' : idle}`}
          >
            <Sliders size={14} className="shrink-0" />
            <span className="flex-1 text-left">{t('ui_customizer')}</span>
          </button>

          {/* Debug Console */}
          <button
            onClick={() => { setConsoleOpen(v => !v); setOpen(false) }}
            className={`${row} ${consoleOpen ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30' : idle}`}
          >
            <Terminal size={14} className="shrink-0" />
            <span className="flex-1 text-left">{t('debug_console')}</span>
          </button>

          {/* Search Provider */}
          <button
            onClick={() => { setProvider(isAPI ? 'package' : 'api'); setOpen(false) }}
            className={`${row} ${idle}`}
          >
            {isAPI ? <Globe2 size={14} className="shrink-0" /> : <Package size={14} className="shrink-0" />}
            <span className="flex-1 text-left">{t('search_provider', 'Search provider')}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              isAPI
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}>
              {isAPI ? 'API' : 'Pkg'}
            </span>
          </button>
        </div>
      )}

      {customizerOpen && <UIDebugCustomizer onClose={() => setCustomizerOpen(false)} />}
      {consoleOpen && <DebugConsole onClose={() => setConsoleOpen(false)} />}
    </div>
  )
}
