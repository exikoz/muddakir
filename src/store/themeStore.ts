import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

const stored = (localStorage.getItem('muddakir-theme') as Theme) || 'light'
const initialResolved = resolve(stored)
// Apply immediately to avoid flash
applyTheme(initialResolved)

export const useThemeStore = create<ThemeState>((set) => ({
  theme: stored,
  resolved: initialResolved,
  setTheme: (theme) => {
    const resolved = resolve(theme)
    localStorage.setItem('muddakir-theme', theme)
    applyTheme(resolved)
    set({ theme, resolved })
  },
}))

// Listen for system theme changes when in 'system' mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { theme } = useThemeStore.getState()
  if (theme === 'system') {
    const resolved = getSystemTheme()
    applyTheme(resolved)
    useThemeStore.setState({ resolved })
  }
})
