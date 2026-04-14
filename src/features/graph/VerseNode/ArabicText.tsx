import { useMemo } from 'react'
import type { Verse, MatchType } from '../../../types/quran'
import { useStore } from '../../../store'
import {
  getHoverClasses,
  getClickedWordClasses,
  getMatchHighlightClasses,
} from '../../../lib/modeColors'
import { getWordHighlights } from '../../../lib/highlightWords'

interface Props {
  verse: Verse
  activeWordIndex?: number
  activeWordMatchType?: MatchType
  sourceNodeId: string
  matchedTokens?: string[]
  tokenTypes?: Record<string, string>
  matchType?: MatchType
  searchQuery?: string
}

function ArabicText({ verse, activeWordIndex, activeWordMatchType, sourceNodeId, matchedTokens, matchType, searchQuery }: Props) {
  const searchFromWord = useStore(s => s.searchFromWord)
  const searchOptions = useStore(s => s.searchOptions)
  const multiWordMode = useStore(s => s.multiWordMode)
  const selectedWords = useStore(s => s.selectedWords)
  const addSelectedWord = useStore(s => s.addSelectedWord)
  const removeSelectedWord = useStore(s => s.removeSelectedWord)

  const hoverClasses = getHoverClasses(searchOptions)

  // Which word indices in THIS node are selected for multi-word search
  const selectedIndicesInThisNode = useMemo(() => {
    return new Set(
      selectedWords
        .filter(w => w.nodeId === sourceNodeId)
        .map(w => w.wordIndex)
    )
  }, [selectedWords, sourceNodeId])

  async function handleWordClick(wordIndex: number) {
    const word = verse.words[wordIndex]
    if (!word || word.char_type_name === 'end') return

    if (multiWordMode) {
      // Toggle word selection
      const globalIndex = selectedWords.findIndex(
        w => w.nodeId === sourceNodeId && w.wordIndex === wordIndex
      )
      if (globalIndex >= 0) {
        removeSelectedWord(globalIndex)
      } else {
        addSelectedWord(sourceNodeId, wordIndex, word.text_simple || word.text)
      }
      return
    }

    try {
      await searchFromWord(sourceNodeId, wordIndex)
    } catch (err) {
      console.error('[ArabicText] search error:', err)
    }
  }

  const wordHighlights = useMemo(() => {
    if (!matchType) return null
    const map = getWordHighlights(verse.words, matchedTokens ?? [], matchType, searchQuery, verse.verse_key)
    return map.size > 0 ? map : null
  }, [verse.words, matchedTokens, matchType, searchQuery])

  return (
    <div className="font-arabic text-right text-2xl leading-loose text-slate-800" dir="rtl">
      {verse.words.map((word, index) => {
        if (word.char_type_name === 'end') return null

        const isActive = activeWordIndex === index
        const isSelected = selectedIndicesInThisNode.has(index)
        const highlightType = wordHighlights?.get(index)

        let className = 'inline-block px-1 rounded-md cursor-pointer transition-all mx-0.5 '
        let title = word.translation || word.text

        if (isSelected) {
          // Multi-word selected state
          className += 'bg-emerald-200 text-emerald-900 border border-emerald-400 shadow-sm ring-2 ring-emerald-300'
          title = `Selected for multi-word search: "${word.text}"`
        } else if (isActive) {
          const clickedMatchType = activeWordMatchType || 'exact'
          if (clickedMatchType === 'none') {
            className += 'bg-red-100 text-red-900 border border-red-300 shadow-sm'
            title = `No results found for "${word.text}" with current search filters`
          } else {
            className += getClickedWordClasses(clickedMatchType)
          }
        } else if (highlightType) {
          className += getMatchHighlightClasses(highlightType)
        } else {
          className += hoverClasses
        }

        return (
          <span
            key={index}
            onClick={() => handleWordClick(index)}
            className={className}
            title={title}
          >
            {word.text}
          </span>
        )
      })}
    </div>
  )
}

export default ArabicText
