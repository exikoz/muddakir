import { memo } from 'react'
import { X, Sparkles, Info, Bookmark, BookmarkCheck, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../../store'
import { useAIScopeStore } from '../../../store/aiScopeStore'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import { useSidePanelStore } from '../../../store/sidePanelStore'
import { useUserStore } from '../../../store/userStore'
import { useDiscoveryCacheStore } from '../../../store/discoveryCacheStore'
import type { Verse } from '../../../types/quran'

interface Props {
  nodeId: string
  verse: Verse
}

/**
 * Quiet grid cell: very muted by default, darkens on node hover (group-hover),
 * and each button has its own hover color flood.
 */
const cell =
  'w-9 h-full flex items-center justify-center border-l border-gray-200/60 transition-colors text-gray-400 group-hover:text-gray-500'

function NodeActions({ nodeId, verse }: Props) {
  const { t } = useTranslation('aiScope')
  const deleteNode = useStore(s => s.deleteNode)
  const showNodeDiscovery = useStore(s => s.showNodeDiscovery)
  const addContextItem = useAIScopeStore(s => s.addContextItem)
  const contextItems = useAIScopeStore(s => s.contextItems)
  const openDetail = useVerseDetailStore(s => s.openDetail)
  const detailVerse = useVerseDetailStore(s => s.verse)
  const rightPanel = useSidePanelStore(s => s.rightPanel)
  const openPanel = useSidePanelStore(s => s.open)

  const isLoggedIn = useUserStore(s => s.isLoggedIn)
  const bookmarkedVerseKeys = useUserStore(s => s.bookmarkedVerseKeys)
  const toggleBookmark = useUserStore(s => s.toggleBookmark)
  const login = useUserStore(s => s.login)
  const isBookmarked = bookmarkedVerseKeys.has(verse.verse_key)

  const hasCachedResults = useDiscoveryCacheStore(s => s.cache.has(nodeId))
  const isActiveDiscoveryNode = useDiscoveryCacheStore(s => s.activeNodeId === nodeId)

  const isInContext = contextItems.some(c => c.verseKey === verse.verse_key)
  const isDetailActive = detailVerse?.verse_key === verse.verse_key

  function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation()
    if (!isLoggedIn) { login(); return }
    toggleBookmark(verse.verse_key)
  }

  function handleOpenDetail(e: React.MouseEvent) {
    e.stopPropagation()
    const prev = rightPanel === 'aiScope' ? 'aiScope' as const
      : rightPanel === 'discovery' ? 'discovery' as const
      : null
    openDetail(verse, prev)
    openPanel('verseDetail')
  }

  function handleAddToAIScope(e: React.MouseEvent) {
    e.stopPropagation()
    addContextItem({
      verseKey: verse.verse_key,
      text: verse.text_arabic,
      translation: verse.translation,
      addedAt: Date.now(),
    })
    openPanel('aiScope')
  }

  function handleShowResults(e: React.MouseEvent) {
    e.stopPropagation()
    showNodeDiscovery(nodeId)
  }

  return (
    <div className="flex items-stretch shrink-0">
      {hasCachedResults && (
        <button
          onClick={handleShowResults}
          className={`${cell} ${
            isActiveDiscoveryNode && rightPanel === 'discovery'
              ? '!text-cyan-500 bg-cyan-50'
              : 'hover:!text-cyan-500 hover:bg-cyan-50'
          }`}
          title={t('show_search_results', 'Show search results')}
        >
          <Layers size={13} />
        </button>
      )}
      <button
        onClick={handleBookmark}
        className={`${cell} ${
          isBookmarked
            ? '!text-amber-500 bg-amber-50'
            : 'hover:!text-amber-500 hover:bg-amber-50'
        }`}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark verse'}
      >
        {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
      </button>

      <button
        onClick={handleOpenDetail}
        className={`${cell} ${
          isDetailActive
            ? '!text-emerald-500 bg-emerald-50'
            : 'hover:!text-emerald-500 hover:bg-emerald-50'
        }`}
        title={t('verse_details')}
      >
        <Info size={13} />
      </button>

      <button
        onClick={handleAddToAIScope}
        className={`${cell} ${
          isInContext
            ? '!text-violet-500 bg-violet-50'
            : 'hover:!text-violet-500 hover:bg-violet-50'
        }`}
        title={isInContext ? t('in_ai_scope_context') : t('add_to_ai_scope')}
      >
        <Sparkles size={13} />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); deleteNode(nodeId) }}
        className={`${cell} hover:!text-red-500 hover:bg-red-50`}
        title={t('remove_verse')}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default memo(NodeActions)
