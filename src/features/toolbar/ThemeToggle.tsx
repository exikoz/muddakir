import { Moon, Sun, Monitor } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

const CYCLE: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']

export default function ThemeToggle() {
  const theme = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)

  const idx = CYCLE.indexOf(theme)
  const next = CYCLE[(idx + 1) % CYCLE.length]

  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun
  const label = theme === 'dark' ? 'Dark' : theme === 'system' ? 'Auto' : 'Light'

  return (
    <button
      onClick={() => setTheme(next)}
      className="h-8 px-2 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-white dark:hover:bg-slate-700"
      title={`Theme: ${label} — click to switch`}
    >
      <Icon size={13} />
      <span>{label}</span>
    </button>
  )
}
