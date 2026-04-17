/**
 * Reusable bookmark toggle button.
 *
 * Used in: NodeActions (graph), VerseHeader (detail panel), VerseRow (mushaf).
 * When not logged in, shows a tooltip nudge to sign in.
 */

import { memo, useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useUserStore } from '../../store/userStore'

interface Props {
  verseKey: string
  /** Visual size variant */
  size?: number
  /** Extra CSS classes for the outer button */
  className?: string
}

function BookmarkButton({ verseKey, size = 12, className = '' }: Props) {
  const isLoggedIn = useUserStore(s => s.isLoggedIn)
  const bookmarkedVerseKeys = useUserStore(s => s.bookmarkedVerseKeys)
  const toggleBookmark = useUserStore(s => s.toggleBookmark)
  const login = useUserStore(s => s.login)
  const [showNudge, setShowNudge] = useState(false)

  const isBookmarked = bookmarkedVerseKeys.has(verseKey)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()

    if (!isLoggedIn) {
      setShowNudge(true)
      setTimeout(() => setShowNudge(false), 3000)
      return
    }

    toggleBookmark(verseKey)
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={`p-1.5 rounded-full shadow-sm border transition-all ${
          isBookmarked
            ? 'bg-amber-50 text-amber-500 border-amber-200 opacity-100'
            : className || 'bg-white text-slate-400 border-slate-100 opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:text-amber-500 hover:bg-amber-50 hover:border-amber-200'
        }`}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark verse'}
      >
        {isBookmarked ? <BookmarkCheck size={size} /> : <Bookmark size={size} />}
      </button>

      {/* Sign-in nudge tooltip */}
      {showNudge && !isLoggedIn && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-slate-800 text-white text-[10px] rounded-lg px-3 py-2 shadow-lg z-50 text-center">
          <p className="mb-1">Sign in to save bookmarks</p>
          <button
            onClick={(e) => { e.stopPropagation(); login() }}
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Sign in with Quran.com
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  )
}

export default memo(BookmarkButton)
