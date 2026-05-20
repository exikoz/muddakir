/**
 * Mobile verse card — displays a verse with actions.
 * Word taps add to the word builder (same as desktop ArabicText).
 * Search is triggered from the word builder bar, not on tap.
 */

import { memo, useMemo, useCallback } from 'react'
import {
  Bookmark, BookmarkCheck, Info, Sparkles, X, Layers, Search,
  ChevronUp, ChevronDown, BookOpen, Play, Pause, Loader2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { useAudioStore } from '../../features/audio/audioStore'
import { useAIScopeStore } from '../../store/aiScopeStore'
import { useUserStore } from '../../store/userStore'
import { useWordBuilderStore } from '../../store/wordBuilderStore'
import { useDiscoveryCacheStore } from '../../store/discoveryCacheStore'
import { getSurahName } from '../../features/mushaf/surahNames'
import { useMobileStore } from '../store/mobileStore'
import { MODE_COLORS, getHoverClasses, getClickedWordClasses, getMatchHighlightClasses } from '../../lib/modeColors'
import { getWordHighlights } from '../../lib/highlightWords'
import type { Verse, MatchType } from '../../types/quran'

interface Props {
  nodeId: string
  verse: Verse
  matchType?: MatchType
  matchedTokens?: string[]
  searchQuery?: string
  activeWordIndex?: number
  activeWordMatchType?: MatchType
}

function MobileVerseCard({ nodeId, verse, matchType, matchedTokens, searchQuery, activeWordIndex, activeWordMatchType }: Props) {
  const { i18n } = useTranslation('graph')
  const deleteNode = useStore(s => s.deleteNode)
  const addSequentialVerse = useStore(s => s.addSequentialVerse)
  const searchOptions = useStore(s => s.searchOptions)
  const showNodeDiscovery = useStore(s => s.showNodeDiscovery)
  const openPanel = useMobileStore(s => s.openPanel)

  // Word builder — same pattern as desktop ArabicText
  const builderWords = useWordBuilderStore(s => s.words)
  const addWord = useWordBuilderStore(s => s.addWord)
  const addSelectedWord = useStore(s => s.addSelectedWord)
  const removeSelectedWord = useStore(s => s.removeSelectedWord)
  const mainSelectedWords = useStore(s => s.selectedWords)

  // Discovery cache — show results button
  const hasCachedResults = useDiscoveryCacheStore(s => s.cache.has(nodeId))
  const isActiveDiscoveryNode = useDiscoveryCacheStore(s => s.activeNodeId === nodeId)
  const discoveryResults = useStore(s => s.discoveryResults)

  // Audio
  const currentVerseKey = useAudioStore(s => s.currentVerseKey)
  const isPlaying = useAudioStore(s => s.isPlaying)
  const isAudioLoading = useAudioStore(s => s.isLoading)
  const playVerse = useAudioStore(s => s.playVerse)
  const pauseAudio = useAudioStore(s => s.pause)
  const currentReciterId = useAudioStore(s => s.currentReciterId)
  const isThisPlaying = currentVerseKey === verse.verse_key && isPlaying

  // User
  const isLoggedIn = useUserStore(s => s.isLoggedIn)
  const bookmarkedVerseKeys = useUserStore(s => s.bookmarkedVerseKeys)
  const toggleBookmark = useUserStore(s => s.toggleBookmark)
  const login = useUserStore(s => s.login)
  const isBookmarked = bookmarkedVerseKeys.has(verse.verse_key)

  // AI Scope
  const addContextItem = useAIScopeStore(s => s.addContextItem)

  const [chapterStr] = verse.verse_key.split(':')
  const chapter = parseInt(chapterStr, 10)
  const surahName = getSurahName(chapter, i18n.language)

  const matchEdge = matchType ? MODE_COLORS[matchType]?.edge : undefined
  const hoverClasses = getHoverClasses(searchOptions)

  // Which words in THIS node are selected in the word builder
  const selectedIndicesInThisNode = useMemo(() => {
    return new Set(
      builderWords
        .filter(w => w.nodeId === nodeId)
        .map(w => w.wordIndex)
    )
  }, [builderWords, nodeId])

  // Compute word highlights using the same utility as desktop
  const wordHighlights = useMemo(() => {
    if (!matchType || !matchedTokens) return null
    const map = getWordHighlights(verse.words, matchedTokens, matchType, searchQuery, verse.verse_key)
    return map.size > 0 ? map : null
  }, [verse.words, verse.verse_key, matchedTokens, matchType, searchQuery])

  // Word tap → add to word builder (same as desktop)
  const handleWordTap = useCallback((wordIndex: number) => {
    const word = verse.words[wordIndex]
    if (!word || word.char_type_name === 'end') return

    addWord(nodeId, wordIndex, word.text_simple || word.text)

    const existsInMain = mainSelectedWords.findIndex(
      w => w.nodeId === nodeId && w.wordIndex === wordIndex
    )
    if (existsInMain >= 0) {
      removeSelectedWord(existsInMain)
    } else {
      addSelectedWord(nodeId, wordIndex, word.text_simple || word.text)
    }
  }, [nodeId, verse.words, addWord, mainSelectedWords, addSelectedWord, removeSelectedWord])

  const handleShowResults = useCallback(() => {
    showNodeDiscovery(nodeId)
    openPanel({ type: 'discovery', nodeId })
  }, [nodeId, showNodeDiscovery, openPanel])

  const handleBookmark = useCallback(() => {
    if (!isLoggedIn) { login(); return }
    toggleBookmark(verse.verse_key)
  }, [isLoggedIn, login, toggleBookmark, verse.verse_key])

  const handlePlayPause = useCallback(() => {
    if (isThisPlaying) pauseAudio()
    else playVerse(verse.verse_key, currentReciterId)
  }, [isThisPlaying, pauseAudio, playVerse, verse.verse_key, currentReciterId])

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-xl border-2 shadow-sm overflow-hidden"
      style={{ borderColor: matchEdge || '#e2e8f0' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-600">
        <div className="flex items-center gap-2">
          <button
            onClick={() => addSequentialVerse(nodeId, 'prev')}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
          >
            <ChevronUp size={14} />
          </button>
          <span className="text-xs font-semibold text-slate-600">
            {surahName} · {verse.verse_key}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {hasCachedResults && (
            <button
              onClick={handleShowResults}
              className={`p-1.5 rounded ${
                isActiveDiscoveryNode && discoveryResults.length > 0
                  ? 'text-cyan-500 bg-cyan-50'
                  : 'text-slate-400 hover:text-cyan-500'
              }`}
            >
              <Layers size={14} />
            </button>
          )}
          <button onClick={handlePlayPause} className="p-1.5 rounded text-slate-400 hover:text-emerald-500">
            {isAudioLoading && currentVerseKey === verse.verse_key
              ? <Loader2 size={14} className="animate-spin" />
              : isThisPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={handleBookmark} className={`p-1.5 rounded ${isBookmarked ? 'text-amber-500' : 'text-slate-400'}`}>
            {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>
          <button onClick={() => openPanel({ type: 'verseDetail', verseKey: verse.verse_key })} className="p-1.5 rounded text-slate-400 hover:text-emerald-500">
            <Info size={14} />
          </button>
          <button
            onClick={() => {
              addContextItem({ verseKey: verse.verse_key, text: verse.text_arabic, translation: verse.translation, addedAt: Date.now() })
              openPanel({ type: 'ai' })
            }}
            className="p-1.5 rounded text-slate-400 hover:text-violet-500"
          >
            <Sparkles size={14} />
          </button>
          <button
            onClick={() => openPanel({ type: 'mushaf', chapter, highlightVerse: verse.verse_key })}
            className="p-1.5 rounded text-slate-400 hover:text-emerald-500"
          >
            <BookOpen size={14} />
          </button>
          <button onClick={() => deleteNode(nodeId)} className="p-1.5 rounded text-slate-400 hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Arabic text — tappable words, highlights use getWordHighlights (same as desktop) */}
      <div className="px-3 py-3" dir="rtl">
        <p className="text-lg leading-loose font-arabic text-slate-800 dark:text-slate-100 flex flex-wrap gap-x-1">
          {verse.words.map((word, idx) => {
            if (word.char_type_name === 'end') return null

            const isActive = activeWordIndex === word.position
            const isSelected = selectedIndicesInThisNode.has(idx)
            const highlightType = wordHighlights?.get(idx)

            // Priority: selected > active search > match highlight > idle
            let wordClass = 'inline-block px-1 py-0.5 rounded-md transition-all duration-150 '
            if (isSelected) {
              wordClass += 'bg-emerald-200 text-emerald-900 border border-emerald-400 shadow-sm ring-2 ring-emerald-300'
            } else if (isActive) {
              const clickedType = activeWordMatchType || 'exact'
              if (clickedType === 'none') {
                wordClass += 'bg-red-100 text-red-900 border border-red-300 shadow-sm'
              } else {
                wordClass += getClickedWordClasses(clickedType)
              }
            } else if (highlightType) {
              wordClass += getMatchHighlightClasses(highlightType)
            } else {
              wordClass += hoverClasses
            }

            return (
              <button
                key={idx}
                onClick={() => handleWordTap(idx)}
                className={wordClass}
              >
                {word.text}
              </button>
            )
          })}
        </p>
      </div>

      {/* Translation */}
      <div className="px-3 pb-3">
        <p className="text-xs text-slate-500 leading-relaxed">{verse.translation}</p>
      </div>

      {/* Search query badge */}
      {searchQuery && (
        <div className="px-3 pb-2">
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
            <Search size={9} />
            {searchQuery}
          </span>
        </div>
      )}

      {/* Footer: next verse */}
      <div className="flex justify-center border-t border-slate-100 py-1">
        <button
          onClick={() => addSequentialVerse(nodeId, 'next')}
          className="p-1 rounded text-slate-400 hover:text-slate-600"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  )
}

export default memo(MobileVerseCard)
