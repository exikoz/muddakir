import { useMemo } from 'react'
import type { Verse, MatchType } from '../../../types/quran'
import { useStore } from '../../../store'
import { useWordBuilderStore } from '../../../store/wordBuilderStore'
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
  const searchOptions = useStore(s => s.searchOptions)

  // Word builder state
  const builderWords = useWordBuilderStore(s => s.words)
  const addWord = useWordBuilderStore(s => s.addWord)

  // Also sync to main store for executeMultiWordSearch compatibility
  const addSelectedWord = useStore(s => s.addSelectedWord)
  const removeSelectedWord = useStore(s => s.removeSelectedWord)
  const mainSelectedWords = useStore(s => s.selectedWords)

  const hoverClasses = getHoverClasses(searchOptions)

  // Which word indices in THIS node are selected in the word builder
  const selectedIndicesInThisNode = useMemo(() => {
    return new Set(
      builderWords
        .filter(w => w.nodeId === sourceNodeId)
        .map(w => w.wordIndex)
    )
  }, [builderWords, sourceNodeId])

  function handleWordClick(wordIndex: number) {
    const word = verse.words[wordIndex]
    if (!word || word.char_type_name === 'end') return

    // Toggle in word builder store
    addWord(sourceNodeId, wordIndex, word.text_simple || word.text)

    // Sync to main store for executeMultiWordSearch
    const existsInMain = mainSelectedWords.findIndex(
      w => w.nodeId === sourceNodeId && w.wordIndex === wordIndex
    )
    if (existsInMain >= 0) {
      removeSelectedWord(existsInMain)
    } else {
      addSelectedWord(sourceNodeId, wordIndex, word.text_simple || word.text)
    }
  }

  const wordHighlights = useMemo(() => {
    if (!matchType) return null
    const map = getWordHighlights(verse.words, matchedTokens ?? [], matchType, searchQuery, verse.verse_key)
    return map.size > 0 ? map : null
  }, [verse.words, verse.verse_key, matchedTokens, matchType, searchQuery])

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
          className += 'bg-emerald-200 text-emerald-900 border border-emerald-400 shadow-sm ring-2 ring-emerald-300'
          title = `Selected: "${word.text}"`
        } else if (isActive) {
          const clickedMatchType = activeWordMatchType || 'exact'
          if (clickedMatchType === 'none') {
            className += 'bg-red-100 text-red-900 border border-red-300 shadow-sm'
            title = `No results found for "${word.text}"`
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
