/**
 * Debug script: test lemma search highlighting from the engine only.
 * No quran.com API involved — pure search engine output.
 *
 * Run: node test-lemma.mjs
 */
import {
  search,
  loadQuranData,
  loadMorphology,
  loadWordMap,
  loadSemanticData,
  buildInvertedIndex,
  getHighlightRanges,
  removeTashkeel,
} from 'quran-search-engine'

const QUERY = 'وسليمان'
const LIMIT = 20

async function main() {
  console.log('Loading datasets...\n')
  const [quranData, morphologyMap, wordMap, semanticMap] = await Promise.all([
    loadQuranData(),
    loadMorphology(),
    loadWordMap(),
    loadSemanticData(), 
  ])
  
  // FIX: buildInvertedIndex only takes morphologyMap and quranData
  const invertedIndex = buildInvertedIndex(morphologyMap, quranData)
  
  const context = { quranData, morphologyMap, wordMap, invertedIndex, semanticMap }

  console.log(`\n🔍 Lemma search for: "${QUERY}"`)
  console.log('='.repeat(70))

  const response = search(QUERY, context, {
    lemma: true,
    root: false,
    fuzzy: false,
  }, { page: 1, limit: LIMIT })

  console.log(`Total results: ${response.pagination.totalResults}\n`)

  response.results.forEach((r, i) => {
    const verseKey = `${r.sura_id}:${r.aya_id}`
    console.log(`\n--- Result #${i + 1}: ${verseKey} [${r.matchType}, score: ${r.matchScore}] ---`)
    console.log(`Uthmani text: ${r.uthmani}`)
    console.log(`matchedTokens: [${(r.matchedTokens || []).join(', ')}]`)
    console.log(`tokenTypes:`, r.tokenTypes || '(none)')

    const tokens = r.matchedTokens || []
    if (tokens.length > 0) {
      try {
        const ranges = getHighlightRanges(r.uthmani, tokens, r.tokenTypes)
        console.log(`Highlight ranges:`, ranges)
        ranges.forEach(range => {
          const slice = r.uthmani.substring(range.start, range.end)
          console.log(`  [${range.start}:${range.end}] → "${slice}"`)
        })
      } catch (e) {
        console.log(`Highlight ranges: ❌ ${e.message}`)
      }
    } else {
      console.log(`Highlight ranges: (no tokens to highlight)`)
    }

    // Show each word in the uthmani text stripped
    const uthmaniWords = r.uthmani.split(/\s+/)
    console.log(`\nWord-by-word comparison:`)
    uthmaniWords.forEach((w, wi) => {
      const stripped = removeTashkeel(w).trim()
      const tokenMatch = tokens.map(t => removeTashkeel(t).trim()).find(t => t === stripped)
      console.log(`  [${wi}] "${w}" → "${stripped}" ${tokenMatch ? '✅ matches token' : ''}`)
    })
  })
}

main().catch(console.error)