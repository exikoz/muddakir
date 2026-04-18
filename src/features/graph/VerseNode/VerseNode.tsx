import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { ChevronUp, ChevronDown, BookOpen, Play, Loader2 } from 'lucide-react'
import type { VerseNodeData } from '../../../types/graph'
import { useStore } from '../../../store'
import { useAudioStore } from '../../audio/audioStore'
import { getSurahName } from '../../mushaf/surahNames'
import ArabicText from './ArabicText'
import NodeActions from './NodeActions'
import MiniPlayer from '../../audio/MiniPlayer'

function VerseNode({ id, data }: NodeProps) {
  const { t, i18n } = useTranslation('graph')
  const { verse, activeWordIndex, activeWordMatchType, matchedTokens, tokenTypes, searchQuery, matchType } = data as VerseNodeData
  const addSequentialVerse = useStore(s => s.addSequentialVerse)
  const edges = useStore(s => s.edges)

  // Audio
  const currentVerseKey = useAudioStore(s => s.currentVerseKey)
  const isPlaying = useAudioStore(s => s.isPlaying)
  const isAudioLoading = useAudioStore(s => s.isLoading)
  const currentTime = useAudioStore(s => s.currentTime)
  const playVerse = useAudioStore(s => s.playVerse)
  const pauseAudio = useAudioStore(s => s.pause)
  const currentReciterId = useAudioStore(s => s.currentReciterId)

  const isThisVerse = currentVerseKey === verse.verse_key
  const isThisPlaying = isThisVerse && isPlaying
  const isThisActive = isThisVerse && (isPlaying || (currentTime > 0 && useAudioStore.getState().verseStartTime > 0))

  const hasPrevVerse = edges.some(e => e.target === id && e.data?.edgeType === 'sequential-prev')
  const hasNextVerse = edges.some(e => e.source === id && e.data?.edgeType === 'sequential-next')

  const [chapterStr, ayahStr] = verse.verse_key.split(':')
  const chapter = parseInt(chapterStr, 10)
  const isFirstVerse = parseInt(ayahStr, 10) === 1
  const surahName = getSurahName(chapter, i18n.language)

  const handlePrevVerse = (e: React.MouseEvent) => { e.stopPropagation(); addSequentialVerse(id as string, 'prev') }
  const handleNextVerse = (e: React.MouseEvent) => { e.stopPropagation(); addSequentialVerse(id as string, 'next') }
  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isThisPlaying) pauseAudio()
    else playVerse(verse.verse_key, currentReciterId)
  }
  const handleOpenMushaf = (e: React.MouseEvent) => {
    e.stopPropagation()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opener = (window as Record<string, any>).__mushafOpener
    if (opener) opener(verse.verse_key)
  }

  // Quiet grid: light borders, muted text that darkens on node hover (via `group`)
  const navW = 'w-[120px]'
  const border = 'border-gray-200/60'
  const cellBase = 'flex items-center text-[11px] font-medium transition-colors'
  const quietCell = 'text-gray-400 group-hover:text-gray-600 hover:!text-gray-700 hover:bg-gray-50'
  const handleCls = '!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0'

  return (
    <div className={`group min-w-[420px] max-w-[520px] bg-white rounded-xl border ${border} overflow-hidden flex flex-col`}>
      {/* Invisible handles */}
      <Handle id="top-src" type="source" position={Position.Top} className={handleCls} />
      <Handle id="top-tgt" type="target" position={Position.Top} className={handleCls} />
      <Handle id="left-src" type="source" position={Position.Left} className={handleCls} />
      <Handle id="left-tgt" type="target" position={Position.Left} className={handleCls} />

      {/* ── TOP BAR ── */}
      <div className={`flex items-stretch border-b ${border} h-9`}>
        {/* Left: Previous Verse */}
        <div className={`${navW} shrink-0 border-r ${border}`}>
          {!hasPrevVerse && !isFirstVerse ? (
            <button
              onClick={handlePrevVerse}
              className={`${cellBase} ${quietCell} h-full w-full justify-start pl-3 gap-1.5`}
              title={t('load_previous')}
            >
              <ChevronUp size={12} />
              <span>{t('previous_verse')}</span>
            </button>
          ) : (
            <div className="h-full" />
          )}
        </div>

        {/* Center: Verse title */}
        <div className="flex-1 flex items-center justify-center px-3 min-w-0">
          <span className="text-[11px] font-semibold text-gray-400 group-hover:text-gray-500 tracking-wide truncate transition-colors">
            {surahName} · {verse.verse_key}
          </span>
        </div>

        {/* Right: Action buttons */}
        <NodeActions nodeId={id as string} verse={verse} />
      </div>

      {/* ── BODY ── */}
      <div className="px-5 py-4 flex-1 min-h-[130px] flex flex-col justify-center items-end">
        <ArabicText
          verse={verse}
          sourceNodeId={id as string}
          activeWordIndex={activeWordIndex}
          activeWordMatchType={activeWordMatchType}
          matchedTokens={matchedTokens}
          tokenTypes={tokenTypes}
          matchType={matchType}
          searchQuery={searchQuery}
        />

        {verse.translation && (
          <p className={`text-sm text-gray-500 group-hover:text-gray-600 leading-relaxed mt-3 pt-3 border-t ${border} transition-colors`}>
            {verse.translation}
          </p>
        )}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className={`flex items-stretch border-t ${border} h-9`}>
        {/* Left: Next Verse */}
        <div className={`${navW} shrink-0 border-r ${border}`}>
          {!hasNextVerse ? (
            <button
              onClick={handleNextVerse}
              className={`${cellBase} ${quietCell} h-full w-full justify-start pl-3 gap-1.5`}
              title={t('load_next')}
            >
              <ChevronDown size={12} />
              <span>{t('next_verse')}</span>
            </button>
          ) : (
            <div className="h-full" />
          )}
        </div>

        {/* Center: Play button OR inline audio player */}
        {isThisActive ? (
          <MiniPlayer verseKey={verse.verse_key} />
        ) : (
          <button
            onClick={handlePlayPause}
            className={`${cellBase} ${quietCell} flex-1 justify-center gap-1.5`}
            title={t('play_verse')}
          >
            {isAudioLoading && isThisVerse ? (
              <Loader2 size={11} className="animate-spin text-emerald-500" />
            ) : (
              <Play size={11} />
            )}
            <span>{isAudioLoading && isThisVerse ? '…' : t('play')}</span>
          </button>
        )}

        {/* Right: Read in Mushaf */}
        <button
          onClick={handleOpenMushaf}
          className={`${cellBase} ${quietCell} ${navW} shrink-0 justify-center gap-1.5 border-l ${border}`}
          title={t('open_in_mushaf')}
        >
          <BookOpen size={11} />
          <span>{t('read_in_mushaf')}</span>
        </button>
      </div>

      <Handle id="right-src" type="source" position={Position.Right} className={handleCls} />
      <Handle id="right-tgt" type="target" position={Position.Right} className={handleCls} />
      <Handle id="bottom-src" type="source" position={Position.Bottom} className={handleCls} />
      <Handle id="bottom-tgt" type="target" position={Position.Bottom} className={handleCls} />
    </div>
  )
}

export default memo(VerseNode)
