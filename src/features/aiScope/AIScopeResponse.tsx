import { useMemo, useState } from 'react'
import { Plus, Loader2, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { parseAIResponse, extractVerseKeys } from './parseAIResponse'
import AIScopeVerseCard from './AIScopeVerseCard'
import { useStore } from '../../store'

interface Props {
  content: string
}

export default function AIScopeResponse({ content }: Props) {
  const { t, i18n } = useTranslation('aiScope')
  const contentDir = i18n.dir()
  const addVerseNode = useStore(s => s.addVerseNode)
  const [addingAll, setAddingAll] = useState(false)

  const blocks = useMemo(() => parseAIResponse(content), [content])
  const allVerseKeys = useMemo(() => extractVerseKeys(blocks), [blocks])

  async function handleAddAllToCanvas() {
    if (allVerseKeys.length === 0) return
    setAddingAll(true)
    for (const key of allVerseKeys) {
      await addVerseNode(key)
    }
    setAddingAll(false)
  }

  // If parsing produced no structured blocks, render as plain text
  if (blocks.length === 0) {
    return <p className="text-sm text-slate-700 leading-relaxed" dir={contentDir}>{content}</p>
  }

  return (
    <div className="space-y-0" dir={contentDir}>
      {blocks.map((block, i) => {
        if (block.type === 'text') {
          // Split into paragraphs on double newlines
          const paragraphs = block.content.split(/\n{2,}/).filter(Boolean)
          return (
            <div key={i} className="space-y-2">
              {paragraphs.map((p, j) => (
                <p key={j} className="text-sm text-slate-700 leading-relaxed">
                  {p.trim()}
                </p>
              ))}
            </div>
          )
        }

        if (block.type === 'verse') {
          return <AIScopeVerseCard key={`${block.verseKey}-${i}`} verseKey={block.verseKey} />
        }

        if (block.type === 'reflist') {
          return (
            <div key={i} className="mt-3 pt-2.5 border-t border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {t('also_referenced')}
              </p>
              <div className="space-y-0.5">
                {block.items.map(item => (
                  <RefListRow key={item.verseKey} verseKey={item.verseKey} description={item.description} />
                ))}
              </div>
            </div>
          )
        }

        if (block.type === 'receipt') {
          return (
            <p key={i} className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 leading-relaxed">
              {block.content}
            </p>
          )
        }

        return null
      })}

      {/* Add all to canvas */}
      {allVerseKeys.length > 1 && (
        <div className="pt-2 mt-1">
          <button
            onClick={handleAddAllToCanvas}
            disabled={addingAll}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 hover:text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-40"
          >
            {addingAll ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
            {addingAll ? t('adding') : t('add_all_to_canvas', { count: allVerseKeys.length })}
          </button>
        </div>
      )}
    </div>
  )
}

/** Compact reference row for the "Also referenced" overflow list */
function RefListRow({ verseKey, description }: { verseKey: string; description: string }) {
  const addVerseNode = useStore(s => s.addVerseNode)
  const nodes = useStore(s => s.nodes)
  const [adding, setAdding] = useState(false)

  const isOnCanvas = nodes.some(n => n.type === 'verse' && n.data.verse.verse_key === verseKey)

  async function handleAdd() {
    setAdding(true)
    await addVerseNode(verseKey)
    setAdding(false)
  }

  return (
    <div className="flex items-center gap-2 py-1 px-1 rounded-md hover:bg-slate-50 transition-colors group">
      <span className="text-[11px] font-semibold text-slate-500 w-12 shrink-0">{verseKey}</span>
      <span className="text-[11px] text-slate-400 flex-1 truncate">{description}</span>
      {isOnCanvas ? (
        <span className="text-[9px] text-emerald-500 font-medium shrink-0">✓</span>
      ) : (
        <button
          onClick={handleAdd}
          disabled={adding}
          className="opacity-0 group-hover:opacity-100 text-purple-500 hover:text-purple-700 transition-all shrink-0 disabled:opacity-40"
          title="Add to canvas"
        >
          {adding ? <Loader2 size={10} className="animate-spin" /> : <Plus size={12} />}
        </button>
      )}
    </div>
  )
}
