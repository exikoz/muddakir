/**
 * User Profile Panel — right sidebar showing bookmarks, streak, and activity.
 *
 * Sections:
 *   1. User info + streak badge
 *   2. Activity calendar (last 30 days)
 *   3. Bookmarked verses (clickable to navigate)
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Flame, Bookmark, Calendar, LogIn, Loader2 } from 'lucide-react'
import { useSidePanelStore } from '../../store/sidePanelStore'
import { useUserStore } from '../../store/userStore'
import { useStore } from '../../store'
import type { Bookmark as BookmarkType } from '../../services/userApi'
import type { ActivityDay } from '../../services/streakApi'

// ── Surah names for display ─────────────────────────────────────────────────
const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatiha', 2: 'Al-Baqarah', 3: 'Ali Imran', 4: 'An-Nisa', 5: 'Al-Ma\'idah',
  6: 'Al-An\'am', 7: 'Al-A\'raf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Ra\'d', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Mu\'minun', 24: 'An-Nur', 25: 'Al-Furqan',
  26: 'Ash-Shu\'ara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiyah',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqi\'ah', 57: 'Al-Hadid', 58: 'Al-Mujadilah', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
  61: 'As-Saff', 62: 'Al-Jumu\'ah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Ma\'arij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Nazi\'at', 80: 'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-A\'la', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat',
  101: 'Al-Qari\'ah', 102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Ma\'un', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas',
}

function getSurahName(num: number): string {
  return SURAH_NAMES[num] ?? `Surah ${num}`
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StreakSection({ days, activityDays }: { days: number; activityDays: ActivityDay[] }) {
  const { t } = useTranslation('user')
  // Build a 30-day grid showing which days had activity
  const today = new Date()
  const grid: { date: string; active: boolean }[] = []
  const activitySet = new Set(activityDays.map(a => a.date))

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    grid.push({ date: dateStr, active: activitySet.has(dateStr) })
  }

  return (
    <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-700">
      {/* Streak badge */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          days > 0 ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-slate-200 dark:bg-slate-700'
        }`}>
          <Flame size={22} className={days > 0 ? 'text-white' : 'text-slate-400'} />
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {days} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{days !== 1 ? t('days') : t('day')}</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {days > 0 ? t('current_streak') : t('no_streak')}
          </div>
        </div>
      </div>

      {/* Activity grid (last 30 days) */}
      <div className="flex items-center gap-1 mb-1">
        <Calendar size={11} className="text-slate-400" />
        <span className="text-[10px] text-slate-400">{t('last_30_days')}</span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {grid.map(({ date, active }) => (
          <div
            key={date}
            className={`w-4 h-4 rounded-sm ${
              active
                ? 'bg-emerald-400 dark:bg-emerald-500'
                : 'bg-slate-100 dark:bg-slate-700'
            }`}
            title={`${date}${active ? ' — active' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}

function BookmarksList({ bookmarks, onNavigate }: { bookmarks: BookmarkType[]; onNavigate: (verseKey: string) => void }) {
  const { t } = useTranslation('user')
  if (bookmarks.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <Bookmark size={24} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-400 dark:text-slate-500">{t('no_bookmarks')}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          {t('no_bookmarks_hint')}
        </p>
      </div>
    )
  }

  // Sort by creation date (newest first)
  const sorted = [...bookmarks]
    .filter(b => b.type === 'ayah' && b.verseNumber != null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="divide-y divide-slate-50 dark:divide-slate-800">
      {sorted.map(b => {
        const verseKey = `${b.key}:${b.verseNumber}`
        return (
          <button
            key={b.id}
            onClick={() => onNavigate(verseKey)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Bookmark size={12} className="text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                {getSurahName(b.key)} : {b.verseNumber}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                {verseKey}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function SignedOutState() {
  const { t } = useTranslation('user')
  const login = useUserStore(s => s.login)
  const loginLoading = useUserStore(s => s.loginLoading)

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
        <LogIn size={24} className="text-emerald-500" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
        {t('sign_in_to_track')}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-[200px]">
        {t('sign_in_description')}
      </p>
      <button
        onClick={() => login()}
        disabled={loginLoading}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loginLoading ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
        {t('sign_in_with_quran')}
      </button>
    </div>
  )
}

// ── Main Panel ──────────────────────────────────────────────────────────────

export default function UserPanel() {
  const { t } = useTranslation('user')
  const isOpen = useSidePanelStore(s => s.rightPanel === 'userProfile')
  const closePanel = useSidePanelStore(s => s.close)
  const isLoggedIn = useUserStore(s => s.isLoggedIn)
  const user = useUserStore(s => s.user)
  const bookmarks = useUserStore(s => s.bookmarks)
  const bookmarksLoading = useUserStore(s => s.bookmarksLoading)
  const currentStreakDays = useUserStore(s => s.currentStreakDays)
  const activityDays = useUserStore(s => s.activityDays)
  const streakLoading = useUserStore(s => s.streakLoading)
  const addVerseNode = useStore(s => s.addVerseNode)

  const [activeTab, setActiveTab] = useState<'streak' | 'bookmarks'>('streak')

  // Navigate to a bookmarked verse on the canvas
  function handleNavigateToVerse(verseKey: string) {
    addVerseNode(verseKey)
  }

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user?.email ?? 'User'

  return (
    <div
      dir="ltr"
      className={`fixed top-12 bottom-0 right-0 w-[360px] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
                {user?.firstName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {isLoggedIn ? displayName : t('my_profile')}
              </h2>
              {isLoggedIn && currentStreakDays > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Flame size={10} className="text-orange-500" />
                  <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                    {currentStreakDays} {t('day_streak')}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => closePanel('userProfile')}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X size={18} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isLoggedIn ? (
        <SignedOutState />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setActiveTab('streak')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'streak'
                  ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <Flame size={12} />
              {t('streak_tab')}
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'bookmarks'
                  ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <Bookmark size={12} />
              {t('bookmarks_tab')}
              {bookmarks.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-[9px]">
                  {bookmarks.filter(b => b.type === 'ayah').length}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'streak' && (
              streakLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : (
                <StreakSection days={currentStreakDays} activityDays={activityDays} />
              )
            )}
            {activeTab === 'bookmarks' && (
              bookmarksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : (
                <BookmarksList bookmarks={bookmarks} onNavigate={handleNavigateToVerse} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
