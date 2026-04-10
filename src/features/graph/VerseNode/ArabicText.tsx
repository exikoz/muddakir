import { useMemo } from 'react'
import type { Verse } from '../../../types/quran'
import type { VerseEdge } from '../../../types/graph'
import { searchWord, getHighlightRanges } from '../../../services/quranSearch'
import { fetchVerse } from '../../../services/quranApi'
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
}

function ArabicText({ verse, activeWordIndex, sourceNodeId, matchedTokens, tokenTypes }: Props) {
  const searchOptions = useStore(s => s.searchOptions)
  const addNode = useStore(s => s.addNode)
  const addEdge = useStore(s => s.addEdge)
  const setDiscoveryResults = useStore(s => s.setDiscoveryResults)
  const setDiscoveryOpen = useStore(s => s.setDiscoveryOpen)
  const setCurrentSearchTerm = useStore(s => s.setCurrentSearchTerm)
  const setLastSearchSourceId = useStore(s => s.setLastSearchSourceId)
  const updateNodeData = useStore(s => s.updateNodeData)
  const nodes = useStore(s => s.nodes)

  async function handleWordClick(wordIndex: number) {
    const word = verse.words[wordIndex]
    if (!word || word.char_type_name === 'end') return

    // Use text_simple for better search results
    const query = word.text_simple || word.text
    setCurrentSearchTerm(query)
    setLastSearchSourceId(sourceNodeId)
    updateNodeData(sourceNodeId, { activeWordIndex: wordIndex })

    try {
      const results = await searchWord(query, searchOptions, 50)
      if (results.length === 0) {
        setDiscoveryResults([])
        return
      }

      // Sort by score
      const sorted = [...results].sort((a, b) => b.matchScore - a.matchScore)
      
      // Auto-add top 3
      const top3 = sorted.slice(0, 3)
      const overflow = sorted.slice(3)

      // Calculate position offset
      const sourceNode = nodes.find(n => n.id === sourceNodeId)
      const baseX = sourceNode?.position.x ?? 200
      const baseY = sourceNode?.position.y ?? 200

      for (let i = 0; i < top3.length; i++) {
        const result = top3[i]
        const verseData = await fetchVerse(result.verse_key)
        if (!verseData) continue

        const newNodeId = `verse-${result.verse_key}-${Date.now()}-${i}`
        const newNode = {
          id: newNodeId,
          type: 'verse' as const,
          position: { 
            x: baseX + 400, 
            y: baseY + (i * 150) - 150 
          },
          data: { 
            verse: verseData,
            activeWordMatchType: result.matchType,
            // Pass search metadata for highlighting
            matchedTokens: result.matchedTokens,
            tokenTypes: result.tokenTypes,
          },
        }
        addNode(newNode)

        // Create edge from source to new node with match type
        const newEdge: VerseEdge = {
          id: `${sourceNodeId}-${newNodeId}`,
          source: sourceNodeId,
          sourceHandle: 'right-src',
          target: newNodeId,
          targetHandle: 'left-tgt',
          type: 'verse',
          data: { matchType: result.matchType },
        }
        addEdge(newEdge)
      }

      // Show overflow in drawer
      setDiscoveryResults(overflow)
      if (overflow.length > 0) setDiscoveryOpen(true)

      // Update match type on source node
      const topMatchType = sorted[0]?.matchType ?? 'none'
      updateNodeData(sourceNodeId, { activeWordMatchType: topMatchType })

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
        
        if (isActive) {
          // Clicked word in source node
          className += 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-sm'
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
            title={word.translation || word.text}
          >
            {word.text}
          </span>
        )
      })}
    </div>
  )
}

export default ArabicText
