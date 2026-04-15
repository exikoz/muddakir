import { memo } from 'react'
import { X, Sparkles } from 'lucide-react'
import { useStore } from '../../../store'
import { useAIScopeStore } from '../../../store/aiScopeStore'
import type { Verse } from '../../../types/quran'

interface Props {
  nodeId: string
  verse: Verse
}

function NodeActions({ nodeId, verse }: Props) {
  const deleteNode = useStore(s => s.deleteNode)
  const addContextItem = useAIScopeStore(s => s.addContextItem)
  const contextItems = useAIScopeStore(s => s.contextItems)
  const isAIScopeOpen = useAIScopeStore(s => s.isOpen)
  const setAIScopeOpen = useAIScopeStore(s => s.setOpen)

  const isInContext = contextItems.some(c => c.verseKey === verse.verse_key)

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

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleAddToAIScope}
        className={`p-1.5 rounded-full shadow-sm border transition-all ${
          isInContext
            ? 'bg-purple-50 text-purple-500 border-purple-200 opacity-100'
            : 'bg-white text-slate-400 border-slate-100 opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:text-purple-500 hover:bg-purple-50 hover:border-purple-200'
        }`}
        title={isInContext ? 'In AI Scope context' : 'Add to AI Scope'}
      >
        <Sparkles size={12} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          deleteNode(nodeId)
        }}
        className="p-1.5 rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
        title="Remove verse"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default memo(NodeActions)
