/**
 * Reusable bookmark toggle button.
 *
 * Used in: NodeActions (graph), VerseHeader (detail panel), VerseRow (mushaf).
 * When not logged in, shows a toast nudge to sign in (no redirect).
 */

import { memo } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useUserStore } from '../../store/userStore'
import { useToastStore } from '../../store/toastStore'
import { useSidePanelStore } from '../../store/sidePanelStore'

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
  const showToast = useToastStore(s => s.show)
  const openPanel = useSidePanelStore(s => s.open)

  const isBookmarked = bookmarkedVerseKeys.has(verseKey)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()

    if (!isLoggedIn) {
      // Show a non-blocking toast instead of redirecting
      showToast({
        type: 'info',
        message: 'Sign in to save bookmarks to your Quran.com account',
        action: {
          label: 'Open profile panel',
          onClick: () => openPanel('userProfile'),
        },
        duration: 5000,
      })
      return
    }

    toggleBookmark(verseKey)
  }

  return (
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
  )
}

export default memo(BookmarkButton)
