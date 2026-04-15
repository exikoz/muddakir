import { memo } from 'react'
import { X, Sparkles, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../../store'
import { useAIScopeStore } from '../../../store/aiScopeStore'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import type { Verse } from '../../../types/quran'

interface Props {
  nodeId: string
  verse: Verse
}

function NodeActions({ nodeId, verse }: Props) {
  const { t } = useTranslation('aiScope')
  const deleteNode = useStore(s => s.deleteNode)
  const addContextItem = useAIScopeStore(s => s.addContextItem)
  const contextItems = useAIScopeStore(s => s.contextItems)
  const isAIScopeOpen = useAIScopeStore(s => s.isOpen)
  const setAIScopeOpen = useAIScopeStore(s => s.setOpen)
  const openDetail = useVerseDetailStore(s => s.openDetail)
  const detailVerse = useVerseDetailStore(s => s.verse)

  const isInContext = contextItems.some(c => c.verseKey === verse.verse_key)
  const isDetailActive = detailVerse?.verse_key === verse.verse_key

  function handleAddToAIScope(e: React.MouseEvent) {
    e.stopPropagation()
    addContextItem({
      verseKey: verse.verse_key,
      text: verse.text_arabic,
      translation: verse.translation,
      addedAt: Date.now(),
    })
    if (!isAIScopeOpen) setAIScopeOpen(true)
  }

  function handleOpenDetail(e: React.MouseEvent) {
    e.stopPropagation()
    // Track which panel was open before so we can restore on back
    const prev = isAIScopeOpen ? 'aiScope' as const : null
    // Close other panels to avoid overlap
    setAIScopeOpen(false)
    openDetail(verse, prev)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleOpenDetail}
        className={`p-1.5 rounded-full shadow-sm border transition-all ${
          isDetailActive
            ? 'bg-emerald-50 text-emerald-500 border-emerald-200 opacity-100'
            : 'bg-white text-slate-400 border-slate-100 opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:text-emerald-500 hover:bg-emerald-50 hover:border-emerald-200'
        }`}
        title={t('verse_details')}
      >
        <Info size={12} />
      </button>
      <button
        onClick={handleAddToAIScope}
        className={`p-1.5 rounded-full shadow-sm border transition-all ${
          isInContext
            ? 'bg-purple-50 text-purple-500 border-purple-200 opacity-100'
            : 'bg-white text-slate-400 border-slate-100 opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:text-purple-500 hover:bg-purple-50 hover:border-purple-200'
        }`}
        title={isInContext ? t('in_ai_scope_context') : t('add_to_ai_scope')}
      >
        <Sparkles size={12} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          deleteNode(nodeId)
        }}
        className="p-1.5 rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
        title={t('remove_verse')}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default memo(NodeActions)
