/**
 * User menu button for the toolbar.
 *
 * Logged out: shows "Sign in" button.
 * Logged in: shows user avatar/initial with dropdown for logout.
 */

import { useState, useRef, useEffect } from 'react'
import { LogIn, LogOut, User } from 'lucide-react'
import { useUserStore } from '../../store/userStore'

export default function UserMenu() {
  const isLoggedIn = useUserStore(s => s.isLoggedIn)
  const user = useUserStore(s => s.user)
  const login = useUserStore(s => s.login)
  const logout = useUserStore(s => s.logout)
  const loginLoading = useUserStore(s => s.loginLoading)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center hover:bg-emerald-200 transition-colors border border-emerald-200"
        title={displayName}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User size={12} className="text-slate-400" />
              <span className="text-[11px] font-medium text-slate-700 truncate">{displayName}</span>
            </div>
          </div>
          <button
            onClick={() => { logout(); setOpen(false) }}
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
