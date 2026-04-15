import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import type { VerseNodeData } from '../../../types/graph'
import { useStore } from '../../../store'
import ArabicText from './ArabicText'
import NodeActions from './NodeActions'
import MiniPlayer from '../../audio/MiniPlayer'

function VerseNode({ id, data }: NodeProps<any>) {
  const { t } = useTranslation('graph')
  const { verse, activeWordIndex, activeWordMatchType, matchedTokens, tokenTypes, searchQuery } = data as VerseNodeData
  const addSequentialVerse = useStore(state => state.addSequentialVerse)
  const edges = useStore(state => state.edges)
  
  // Check if we already have prev/next verses connected
  const hasPrevVerse = edges.some(e => 
    e.target === id && e.data?.edgeType === 'sequential-prev'
  )
  const hasNextVerse = edges.some(e => 
    e.source === id && e.data?.edgeType === 'sequential-next'
  )
  
  const handlePrevVerse = (e: React.MouseEvent) => {
    e.stopPropagation()
    addSequentialVerse(id as string, 'prev')
  }
  
  const handleNextVerse = (e: React.MouseEvent) => {
    e.stopPropagation()
    addSequentialVerse(id as string, 'next')
  }
  
  // Check if we're at verse 1 (can't go before)
  const [, ayahStr] = verse.verse_key.split(':')
  const isFirstVerse = parseInt(ayahStr, 10) === 1

  return (
    <div className="min-w-[300px] max-w-[500px] bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl group flex flex-col">
      {/* Handles - completely invisible, no dots */}
      <Handle
        id="top-src"
        type="source"
        position={Position.Top}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="top-tgt"
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="left-src"
        type="source"
        position={Position.Left}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="left-tgt"
        type="target"
        position={Position.Left}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />

      {/* Top Bar - Navigation and Tools */}
      <div className="border-b border-slate-50 px-4 py-2 flex items-center justify-between">
        {!hasPrevVerse && !isFirstVerse ? (
          <button
            onClick={handlePrevVerse}
            className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-700 font-medium transition-all px-2 py-1 rounded-full hover:bg-slate-50"
            title={t('load_previous')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 15-6-6-6 6"/>
            </svg>
            <span>{t('previous')}</span>
          </button>
        ) : (
          <div />
        )}
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {t('verse', { key: verse.verse_key })}
        </span>
        <NodeActions nodeId={id as string} verse={verse} />
      </div>

      <div className="p-6 flex-1">
        {/* Arabic Text */}
        <ArabicText 
          verse={verse} 
          sourceNodeId={id as string} 
          activeWordIndex={activeWordIndex}
          activeWordMatchType={activeWordMatchType}
          matchedTokens={matchedTokens}
          tokenTypes={tokenTypes}
          matchType={data.matchType as any}
          searchQuery={searchQuery}
        />

        {/* Translation */}
        {verse.translation && (
          <p className="text-sm text-slate-600 leading-relaxed mt-4 pt-4 border-t border-slate-50">
            {verse.translation}
          </p>
        )}
      </div>
        
      {/* Bottom Bar - Next Button, Audio, and Mushaf Link */}
      <div className="border-t border-slate-50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {!hasNextVerse ? (
            <button
              onClick={handleNextVerse}
              className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-700 font-medium transition-all px-2 py-1 rounded-full hover:bg-slate-50"
              title={t('load_next')}
            >
              <span>{t('next')}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          ) : (
            <div />
          )}
          <MiniPlayer verseKey={verse.verse_key} />
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            const openMushafToVerse = (window as any).__mushafOpener
            if (openMushafToVerse) openMushafToVerse(verse.verse_key)
          }}
          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-emerald-600 transition-colors font-medium"
          title={t('open_in_mushaf')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          </svg>
          {t('read_in_mushaf')}
        </button>
      </div>

      <Handle
        id="right-src"
        type="source"
        position={Position.Right}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="right-tgt"
        type="target"
        position={Position.Right}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="bottom-src"
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="bottom-tgt"
        type="target"
        position={Position.Bottom}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
    </div>
  )
}

export default memo(VerseNode)
