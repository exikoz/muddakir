import { useMemo } from 'react'
import type { Verse } from '../../../types/quran'
import { getHighlightRanges } from '../../../services/quranSearch'
import { useStore } from '../../../store'

interface Props {
  verse: Verse
  activeWordIndex?: number
  sourceNodeId: string
  matchedTokens?: string[]
  tokenTypes?: Record<string, string>
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  exact:    'bg-emerald-100 text-emerald-900',
  lemma:    'bg-blue-100 text-blue-900',
  root:     'bg-violet-100 text-violet-900',
  fuzzy:    'bg-amber-100 text-amber-900',
  semantic: 'bg-teal-100 text-teal-900',
  none:     'bg-red-100 text-red-900 border border-red-300', // No results indicator
}

function ArabicText({ verse, activeWordIndex, sourceNodeId, matchedTokens, tokenTypes }: Props) {
  const searchFromWord = useStore(s => s.searchFromWord)

  async function handleWordClick(wordIndex: number) {
    const word = verse.words[wordIndex]
    if (!word || word.char_type_name === 'end') return

    try {
      await searchFromWord(sourceNodeId, wordIndex)
    } catch (err) {
      console.error('[ArabicText] search error:', err)
    }
  }

  // Calculate word positions in the full text for highlight mapping
  const wordPositions = useMemo(() => {
    const positions: { start: number; end: number; wordIndex: number }[] = []
    let currentPos = 0
    
    verse.words.forEach((word, index) => {
      if (word.char_type_name === 'end') return
      const wordLength = word.text.length
      positions.push({ 
        start: currentPos, 
        end: currentPos + wordLength,
        wordIndex: index 
      })
      currentPos += wordLength + 1 // +1 for space
    })
    
    return positions
  }, [verse.words])

  // Get highlight class for a word based on whether it overlaps with any highlight range
  const getWordHighlightClass = useMemo(() => {
    if (!matchedTokens || matchedTokens.length === 0) return null

    const fullText = verse.text_arabic
    const ranges = getHighlightRanges(fullText, matchedTokens, tokenTypes as any)
    
    if (ranges.length === 0) return null

    // Map word indices to their highlight types
    const wordHighlights = new Map<number, string>()
    
    wordPositions.forEach(({ start, end, wordIndex }) => {
      // Check if this word overlaps with any highlight range
      const overlappingRange = ranges.find(r => 
        Math.max(start, r.start) < Math.min(end, r.end)
      )
      
      if (overlappingRange) {
        const matchType = (overlappingRange as any).type || 'exact'
        wordHighlights.set(wordIndex, matchType)
      }
    })
    
    return wordHighlights
  }, [verse.text_arabic, matchedTokens, tokenTypes, wordPositions])

  // Render words with proper click handlers and highlights
  return (
    <div className="font-arabic text-right text-2xl leading-loose text-slate-800" dir="rtl">
      {verse.words.map((word, index) => {
        if (word.char_type_name === 'end') return null
        
        const isActive = activeWordIndex === index
        const highlightType = getWordHighlightClass?.get(index)
        
        let className = 'inline-block px-1 rounded-md cursor-pointer transition-all mx-0.5 '
        let title = word.translation || word.text
        
        if (isActive) {
          // Clicked word in source node
          const matchType = (verse as any).activeWordMatchType || 'exact'
          if (matchType === 'none') {
            // No results found
            className += 'bg-red-100 text-red-900 border border-red-300 shadow-sm'
            title = `No results found for "${word.text}" with current search filters`
          } else {
            className += 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-sm'
          }
        } else if (highlightType) {
          // Matched word in result node
          className += HIGHLIGHT_COLORS[highlightType] || HIGHLIGHT_COLORS.exact
        } else {
          // Regular word
          className += 'hover:bg-emerald-50 hover:text-emerald-700'
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
