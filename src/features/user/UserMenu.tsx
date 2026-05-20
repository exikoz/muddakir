/**
 * User menu button for the toolbar.
 *
 * Logged out: shows "Sign in" button.
 * Logged in: shows user avatar/initial — clicking opens the User Panel sidebar.
 *            Long-press or right-click shows a dropdown with logout.
 */

import { useState, useRef, useEffect } from 'react'
import { LogIn, LogOut, User, Flame } from 'lucide-react'
import { useUserStore } from '../../store/userStore'
import { useSidePanelStore } from '../../store/sidePanelStore'

export default function UserMenu() {
  const isLoggedIn = useUserStore(s => s.isLoggedIn)
  const user = useUserStore(s => s.user)
  const login = useUserStore(s => s.login)
  const logout = useUserStore(s => s.logout)
  const loginLoading = useUserStore(s => s.loginLoading)
  const currentStreakDays = useUserStore(s => s.currentStreakDays)
  const togglePanel = useSidePanelStore(s => s.toggle)
  const [showDropdown, setShowDropdown] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDropdown])

  if (!isLoggedIn) {
    return (
      <button
        onClick={() => login()}
        disabled={loginLoading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-all disabled:opacity-50"
        title="Sign in with Quran.com"
      >
        <LogIn size={12} />
        Sign in
      </button>
    )
  }

  const initial = user?.firstName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'
  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user?.email ?? 'User'

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      {/* Streak badge (if active) */}
      {currentStreakDays > 0 && (
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/30 rounded-md">
          <Flame size={10} className="text-orange-500" />
          <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{currentStreakDays}</span>
        </div>
      )}

      {/* Avatar button — click opens panel, right-click shows dropdown */}
      <button
        onClick={() => togglePanel('userProfile')}
        onContextMenu={(e) => { e.preventDefault(); setShowDropdown(!showDropdown) }}
        className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center hover:bg-emerald-200 transition-colors border border-emerald-200"
        title={`${displayName} — Click to open profile, right-click for menu`}
      >
        {initial}
      </button>

      {/* Context dropdown (right-click) */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 py-1 z-50">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <User size={12} className="text-slate-400 dark:text-slate-500" />
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">{displayName}</span>
            </div>
          </div>
          <button
            onClick={() => { logout(); setShowDropdown(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
