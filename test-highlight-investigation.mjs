/**
 * Unified highlighting investigation: lemma + regex
 *
 * For each test case, runs the search, fetches API words, and tests
 * candidate highlighting strategies. Prints PASS/FAIL per verse.
 *
 * Run: node test-highlight-investigation.mjs
 */
import {
  search,
  loadQuranData,
  loadMorphology,
  loadWordMap,
  loadSemanticData,
  buildInvertedIndex,
  removeTashkeel,
  normalizeArabic,
} from 'quran-search-engine'

const API_BASE = 'https://api.quran.com'

// ── Test cases ───────────────────────────────────────────────────────────────
const TEST_CASES = [
  // Lemma cases
  {
    query: 'وسليمان',
    mode: 'lemma',
    description: 'Sulayman — proper noun with prefix variants',
    searchOpts: { lemma: true, root: false, fuzzy: false },
    // Expected: every verse should have at least one word containing "سليمان" highlighted
    expectedSubstring: 'سليمان',
  },
  // Regex cases
  {
    query: 'يطع\\s+الله',
    displayQuery: 'يطع الله',
    mode: 'regex',
    description: 'common adjacent verb+noun',
    searchOpts: { lemma: false, root: false, fuzzy: false, isRegex: true },
    expectedWords: ['يطع', 'الله'],
  },
  {
    query: 'الرحمن\\s+الرحيم',
    displayQuery: 'الرحمن الرحيم',
    mode: 'regex',
    description: 'adjacent divine names (appears in multiple suras)',
    searchOpts: { lemma: false, root: false, fuzzy: false, isRegex: true },
    expectedWords: ['الرحمن', 'الرحيم'],
  },
  {
    query: 'لا\\s+إله',
    displayQuery: 'لا إله',
    mode: 'regex',
    description: 'negation + noun, very frequent',
    searchOpts: { lemma: false, root: false, fuzzy: false, isRegex: true },
    expectedWords: ['لا', 'إله'],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchApiWords(verseKey) {
  const url = `${API_BASE}/api/v4/verses/by_key/${verseKey}?words=true&word_fields=text_imlaei,text_imlaei_simple`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  return json.verse?.words?.filter(w => w.char_type_name !== 'end') ?? null
}

/**
 * Strategy A: removeTashkeel + includes (for lemma fallback)
 * Strip diacritics from the search query and each API word, check if word contains query or vice versa.
 */
function strategySubstringMatch(apiWords, queryText) {
  const strippedQuery = removeTashkeel(queryText).trim()
  const matched = []
  apiWords.forEach((w, i) => {
    const strippedWord = removeTashkeel(w.text_imlaei).trim()
    if (strippedWord.includes(strippedQuery) || strippedQuery.includes(strippedWord)) {
      matched.push(i)
    }
  })
  return matched
}

/**
 * Strategy B: text_imlaei_simple + includes (for lemma fallback)
 * Use the API's pre-stripped simple form.
 */
function strategySimpleMatch(apiWords, queryText) {
  const strippedQuery = removeTashkeel(queryText).trim()
  const matched = []
  apiWords.forEach((w, i) => {
    const simple = (w.text_imlaei_simple || '').trim()
    if (simple.includes(strippedQuery) || strippedQuery.includes(simple)) {
      matched.push(i)
    }
  })
  return matched
}

/**
 * Strategy C: Regex on concatenated simple text, map offsets back to word indices.
 * Build a string from text_imlaei_simple words joined by spaces.
 * Run the regex against it. Map match offsets to word indices.
 */
function strategyRegexOnSimple(apiWords, regexPattern) {
  // Build concatenated string with word boundary tracking
  const wordBounds = [] // { start, end, wordIndex }
  let pos = 0
  const parts = []
  apiWords.forEach((w, i) => {
    const simple = (w.text_imlaei_simple || '').trim()
    const start = pos
    parts.push(simple)
    pos += simple.length
    wordBounds.push({ start, end: pos, wordIndex: i })
    pos += 1 // space
  })
  const fullText = parts.join(' ')

  // Run regex
  const re = new RegExp(regexPattern, 'g')
  const matches = []
  let m
  while ((m = re.exec(fullText)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] })
  }

  // Map each match to word indices
  const allMatchedIndices = new Set()
  const matchDetails = []
  for (const match of matches) {
    const indices = []
    for (const wb of wordBounds) {
      // Word overlaps with match if they share any characters
      if (wb.start < match.end && wb.end > match.start) {
        indices.push(wb.wordIndex)
        allMatchedIndices.add(wb.wordIndex)
      }
    }
    matchDetails.push({ ...match, wordIndices: indices })
  }

  return { matchedIndices: [...allMatchedIndices], matchDetails, fullText, wordBounds }
}

/**
 * Strategy D: Regex on removeTashkeel text, map offsets back to word indices.
 * Same as C but using removeTashkeel instead of text_imlaei_simple.
 */
function strategyRegexOnStripped(apiWords, regexPattern) {
  const wordBounds = []
  let pos = 0
  const parts = []
  apiWords.forEach((w, i) => {
    const stripped = removeTashkeel(w.text_imlaei).trim()
    const start = pos
    parts.push(stripped)
    pos += stripped.length
    wordBounds.push({ start, end: pos, wordIndex: i })
    pos += 1 // space
  })
  const fullText = parts.join(' ')

  const re = new RegExp(regexPattern, 'g')
  const matches = []
  let m
  while ((m = re.exec(fullText)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] })
  }

  const allMatchedIndices = new Set()
  const matchDetails = []
  for (const match of matches) {
    const indices = []
    for (const wb of wordBounds) {
      if (wb.start < match.end && wb.end > match.start) {
        indices.push(wb.wordIndex)
        allMatchedIndices.add(wb.wordIndex)
      }
    }
    matchDetails.push({ ...match, wordIndices: indices })
  }

  return { matchedIndices: [...allMatchedIndices], matchDetails, fullText, wordBounds }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Loading engine datasets...\n')
  const [quranData, morphologyMap, wordMap, semanticMap] = await Promise.all([
    loadQuranData(), loadMorphology(), loadWordMap(), loadSemanticData(),
  ])
  const invertedIndex = buildInvertedIndex(morphologyMap, quranData, semanticMap)
  const context = { quranData, morphologyMap, wordMap, invertedIndex, semanticMap }

  for (const tc of TEST_CASES) {
    console.log(`\n${'#'.repeat(80)}`)
    console.log(`# ${tc.mode.toUpperCase()}: "${tc.displayQuery || tc.query}" — ${tc.description}`)
    console.log(`${'#'.repeat(80)}`)

    const response = search(tc.query, context, tc.searchOpts, { page: 1, limit: 15 })
    console.log(`Engine returned ${response.pagination.totalResults} results (showing ${response.results.length})\n`)

    let passCount = 0
    let failCount = 0

    for (const r of response.results) {
      const vk = `${r.sura_id}:${r.aya_id}`
      const apiWords = await fetchApiWords(vk)
      if (!apiWords) { console.log(`  ❌ ${vk}: API fetch failed`); failCount++; continue }

      const hasEngineTokens = (r.matchedTokens || []).length > 0

      console.log(`\n  ── ${vk} [engine: ${r.matchType}, score: ${r.matchScore}, tokens: ${hasEngineTokens ? r.matchedTokens.join(',') : '(empty)'}] ──`)

      // Show API words
      const wordSummary = apiWords.map((w, i) => `[${i}]${w.text_imlaei_simple}`).join(' ')
      console.log(`  API words: ${wordSummary}`)

      if (tc.mode === 'lemma') {
        // ── LEMMA INVESTIGATION ──
        if (hasEngineTokens) {
          // Engine gave us tokens — our existing getWordHighlights handles this
          console.log(`  Engine tokens present — existing highlighting works ✅`)
          passCount++
          continue
        }

        // No tokens — test fallback strategies
        const queryForMatch = tc.expectedSubstring || tc.query
        const stratA = strategySubstringMatch(apiWords, queryForMatch)
        const stratB = strategySimpleMatch(apiWords, queryForMatch)

        // Verify: does the verse actually contain a Sulayman word?
        const expectedIndices = []
        apiWords.forEach((w, i) => {
          const simple = (w.text_imlaei_simple || '').trim()
          if (simple.includes('سليمان')) expectedIndices.push(i)
        })

        const aCorrect = stratA.length > 0 && stratA.every(i => expectedIndices.includes(i)) && expectedIndices.every(i => stratA.includes(i))
        const bCorrect = stratB.length > 0 && stratB.every(i => expectedIndices.includes(i)) && expectedIndices.every(i => stratB.includes(i))

        console.log(`  Expected word indices: [${expectedIndices.join(',')}]`)
        console.log(`  Strategy A (removeTashkeel+includes): [${stratA.join(',')}] ${aCorrect ? 'PASS ✅' : 'FAIL ❌'}`)
        console.log(`  Strategy B (simple+includes):         [${stratB.join(',')}] ${bCorrect ? 'PASS ✅' : 'FAIL ❌'}`)

        if (aCorrect || bCorrect) passCount++; else failCount++

      } else if (tc.mode === 'regex') {
        // ── REGEX INVESTIGATION ──
        const resultC = strategyRegexOnSimple(apiWords, tc.query)
        const resultD = strategyRegexOnStripped(apiWords, tc.query)

        // Determine expected word indices by finding which words match the expected substrings
        const expectedIndices = []
        if (tc.expectedWords) {
          apiWords.forEach((w, i) => {
            const simple = (w.text_imlaei_simple || '').trim()
            const stripped = removeTashkeel(w.text_imlaei).trim()
            for (const ew of tc.expectedWords) {
              const ewStripped = removeTashkeel(ew).trim()
              if (simple === ewStripped || stripped === ewStripped || simple === ew || stripped === ew) {
                expectedIndices.push(i)
                break
              }
            }
          })
        }

        // Check contiguity — matched indices should be consecutive
        const cContiguous = resultC.matchedIndices.length > 0 && isContiguous(resultC.matchedIndices)
        const dContiguous = resultD.matchedIndices.length > 0 && isContiguous(resultD.matchedIndices)

        const cCorrect = resultC.matchedIndices.length > 0 &&
          resultC.matchedIndices.every(i => expectedIndices.includes(i)) &&
          expectedIndices.every(i => resultC.matchedIndices.includes(i))
        const dCorrect = resultD.matchedIndices.length > 0 &&
          resultD.matchedIndices.every(i => expectedIndices.includes(i)) &&
          expectedIndices.every(i => resultD.matchedIndices.includes(i))

        console.log(`  Expected word indices: [${expectedIndices.join(',')}]`)

        console.log(`  Strategy C (regex on simple text):`)
        console.log(`    Concat text: "${resultC.fullText.substring(0, 120)}${resultC.fullText.length > 120 ? '...' : ''}"`)
        if (resultC.matchDetails.length > 0) {
          resultC.matchDetails.forEach(md => {
            console.log(`    Match [${md.start}:${md.end}] "${md.text}" → word indices [${md.wordIndices.join(',')}]`)
          })
        } else {
          console.log(`    No regex match found`)
        }
        console.log(`    Result: [${resultC.matchedIndices.join(',')}] contiguous=${cContiguous} ${cCorrect ? 'PASS ✅' : 'FAIL ❌'}`)

        console.log(`  Strategy D (regex on removeTashkeel text):`)
        console.log(`    Concat text: "${resultD.fullText.substring(0, 120)}${resultD.fullText.length > 120 ? '...' : ''}"`)
        if (resultD.matchDetails.length > 0) {
          resultD.matchDetails.forEach(md => {
            console.log(`    Match [${md.start}:${md.end}] "${md.text}" → word indices [${md.wordIndices.join(',')}]`)
          })
        } else {
          console.log(`    No regex match found`)
        }
        console.log(`    Result: [${resultD.matchedIndices.join(',')}] contiguous=${dContiguous} ${dCorrect ? 'PASS ✅' : 'FAIL ❌'}`)

        if (cCorrect || dCorrect) passCount++; else failCount++
      }
    }

    console.log(`\n  ── SUMMARY for "${tc.displayQuery || tc.query}" (${tc.mode}): ${passCount} PASS, ${failCount} FAIL ──`)
  }
}

function isContiguous(indices) {
  if (indices.length <= 1) return true
  const sorted = [...indices].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}

main().catch(console.error)
