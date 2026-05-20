/**
 * search-diagnostic.mjs
 * 
 * Diagnostic file to troubleshoot search issues with quran-search-engine.
 * Tests specific words that have known problems in the app.
 * 
 * Run: node search-diagnostic.mjs
 * 
 * Issues being investigated:
 * 1. فوزا — verse 2:7 showing in lemma results (shouldn't be there?)
 * 2. المشرك — only works with fuzzy, not lemma or exact
 * 3. يَضْرِبَ — lemma results but no highlight on some verses (12:14 yes, 16:75 no)
 * 4. الصيام — unexpected results, no matching
 * 5. Does the engine normalize internally or do we need to call removeTashkeel/normalizeArabic first?
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
  normalizeArabic,
} from 'quran-search-engine'

// ─── Helpers ────────────────────────────────────────────────────────────────

function header(title) {
  console.log(`\n${'═'.repeat(80)}`)
  console.log(`  ${title}`)
  console.log(`${'═'.repeat(80)}`)
}

function sub(title) {
  console.log(`\n  ── ${title} ──`)
}

function suffixMatch(wordText, queryText) {
  const w = removeTashkeel(wordText).trim()
  const q = removeTashkeel(queryText).trim()
  if (w.length === 0 || q.length === 0) return false
  if (w.length >= q.length) return w.endsWith(q)
  return q.endsWith(w)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Loading quran-search-engine data...')
  const [quranData, morphologyMap, wordMap, semanticMap] = await Promise.all([
    loadQuranData(),
    loadMorphology(),
    loadWordMap(),
    loadSemanticData(),
  ])
  const invertedIndex = buildInvertedIndex(morphologyMap, quranData, semanticMap)
  const context = { quranData, morphologyMap, wordMap, invertedIndex, semanticMap }
  console.log(`Loaded ${quranData.size} verses, ${morphologyMap.size} morphology entries, wordMap ready.\n`)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 0: Does the engine normalize internally?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 0: Does the engine normalize the query internally?')
  console.log('  We send the SAME word in 3 forms and compare result counts.')
  console.log('  If the engine normalizes internally, all 3 should return the same results.\n')

  const normTestWord = 'سُلَيْمَانَ' // with tashkeel (what text_imlaei gives us)
  const normTestStripped = removeTashkeel(normTestWord) // سليمان
  const normTestNormalized = normalizeArabic(normTestWord) // whatever normalizeArabic does

  console.log(`  Raw (with tashkeel):  "${normTestWord}"`)
  console.log(`  removeTashkeel:       "${normTestStripped}"`)
  console.log(`  normalizeArabic:      "${normTestNormalized}"`)

  for (const mode of ['exact', 'lemma']) {
    const opts = mode === 'lemma' 
      ? { lemma: true, root: false, fuzzy: false }
      : { lemma: false, root: false, fuzzy: false }

    const r1 = search(normTestWord, context, opts, { page: 1, limit: 100 })
    const r2 = search(normTestStripped, context, opts, { page: 1, limit: 100 })
    const r3 = search(normTestNormalized, context, opts, { page: 1, limit: 100 })

    console.log(`\n  [${mode} mode]`)
    console.log(`    Raw tashkeel query → ${r1.pagination.totalResults} results`)
    console.log(`    removeTashkeel     → ${r2.pagination.totalResults} results`)
    console.log(`    normalizeArabic    → ${r3.pagination.totalResults} results`)

    if (r1.pagination.totalResults === r2.pagination.totalResults && r2.pagination.totalResults === r3.pagination.totalResults) {
      console.log(`    ✅ All 3 forms return same count → engine normalizes internally`)
    } else {
      console.log(`    ❌ DIFFERENT counts → engine does NOT fully normalize internally!`)
      console.log(`    → This means we MUST pre-process the query before calling search()`)
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 1: فوزا — why does 2:7 show up in lemma results?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 1: فوزا — verse 2:7 appearing in lemma results')

  const fawzaQuery = 'فوزا'
  const fawzaQueryTashkeel = 'فَوْزًا' // simulating what text_imlaei might give

  sub('1a: What does the wordMap say about this word?')
  const fawzaWM = wordMap.get(fawzaQuery) || wordMap.get(normalizeArabic(fawzaQuery))
  console.log(`  wordMap["${fawzaQuery}"] = ${JSON.stringify(fawzaWM) || 'NOT FOUND'}`)
  const fawzaNorm = normalizeArabic(fawzaQuery)
  if (fawzaNorm !== fawzaQuery) {
    const fawzaWM2 = wordMap.get(fawzaNorm)
    console.log(`  wordMap["${fawzaNorm}"] (normalized) = ${JSON.stringify(fawzaWM2) || 'NOT FOUND'}`)
  }

  sub('1b: Search results across all modes')
  for (const [label, opts] of [
    ['exact only', { lemma: false, root: false, fuzzy: false }],
    ['lemma only', { lemma: true, root: false, fuzzy: false }],
    ['root only', { lemma: false, root: true, fuzzy: false }],
    ['lemma+root', { lemma: true, root: true, fuzzy: false }],
    ['fuzzy only', { lemma: false, root: false, fuzzy: true }],
  ]) {
    const r = search(fawzaQuery, context, opts, { page: 1, limit: 100 })
    console.log(`  [${label}] → ${r.pagination.totalResults} results | counts: exact=${r.counts.simple}, lemma=${r.counts.lemma}, root=${r.counts.root}, fuzzy=${r.counts.fuzzy}`)
    
    // Check if 2:7 is in results
    const v27 = r.results.find(v => v.sura_id === 2 && v.aya_id === 7)
    if (v27) {
      console.log(`    ⚠️  2:7 IS in results! matchType="${v27.matchType}", score=${v27.matchScore}, tokens=[${v27.matchedTokens.join(', ')}]`)
    }
  }

  sub('1c: What is verse 2:7 morphology?')
  {
    let v27gid = null
    for (const [gid, v] of quranData.entries()) {
      if (v.sura_id === 2 && v.aya_id === 7) { v27gid = gid; break }
    }
    if (v27gid) {
      const morph = morphologyMap.get(v27gid)
      console.log(`  2:7 gid=${v27gid}`)
      console.log(`  lemmas: [${morph?.lemmas?.join(', ') || 'none'}]`)
      console.log(`  roots:  [${morph?.roots?.join(', ') || 'none'}]`)
      const verse = quranData.get(v27gid)
      console.log(`  standard: "${verse.standard}"`)
    }
  }

  sub('1d: Verses that actually contain فوز forms — first 5 results with lemma')
  {
    const r = search(fawzaQuery, context, { lemma: true, root: false, fuzzy: false }, { page: 1, limit: 10 })
    for (const v of r.results.slice(0, 5)) {
      console.log(`  ${v.sura_id}:${v.aya_id} [${v.matchType}, score=${v.matchScore}] tokens=[${v.matchedTokens.join(', ')}]`)
      console.log(`    text: "${v.standard.substring(0, 100)}"`)
      // Check morphology
      const morph = morphologyMap.get(v.gid)
      if (morph) console.log(`    lemmas: [${morph.lemmas.join(', ')}]`)
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 2: المشرك — only works with fuzzy
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 2: المشرك — only works with fuzzy, expected free search')

  const mushrikQuery = 'المشرك'

  sub('2a: What does the wordMap say?')
  const mushrikWM = wordMap.get(mushrikQuery) || wordMap.get(normalizeArabic(mushrikQuery))
  console.log(`  wordMap["${mushrikQuery}"] = ${JSON.stringify(mushrikWM) || 'NOT FOUND'}`)
  // Also check plural forms that exist in Quran
  for (const form of ['المشركين', 'المشركون', 'المشركات', 'مشرك', 'مشركين', 'المشركين']) {
    const wm = wordMap.get(form) || wordMap.get(normalizeArabic(form))
    if (wm) console.log(`  wordMap["${form}"] = ${JSON.stringify(wm)}`)
  }

  sub('2b: Search results across all modes')
  for (const [label, opts] of [
    ['exact only', { lemma: false, root: false, fuzzy: false }],
    ['lemma only', { lemma: true, root: false, fuzzy: false }],
    ['root only', { lemma: false, root: true, fuzzy: false }],
    ['lemma+root', { lemma: true, root: true, fuzzy: false }],
    ['fuzzy only', { lemma: false, root: false, fuzzy: true }],
    ['lemma+fuzzy', { lemma: true, root: false, fuzzy: true }],
    ['all modes', { lemma: true, root: true, fuzzy: true }],
  ]) {
    const r = search(mushrikQuery, context, opts, { page: 1, limit: 100 })
    console.log(`  [${label}] → ${r.pagination.totalResults} results | counts: exact=${r.counts.simple}, lemma=${r.counts.lemma}, root=${r.counts.root}, fuzzy=${r.counts.fuzzy}`)
    if (r.results.length > 0) {
      const first = r.results[0]
      console.log(`    first: ${first.sura_id}:${first.aya_id} [${first.matchType}] "${first.standard.substring(0, 80)}"`)
    }
  }

  sub('2c: Does the engine have a "contains" or partial match? Testing with normalizeArabic')
  {
    // Try searching with the normalized form
    const normalized = normalizeArabic(mushrikQuery)
    console.log(`  normalizeArabic("${mushrikQuery}") = "${normalized}"`)
    const r = search(normalized, context, { lemma: true, root: true }, { page: 1, limit: 10 })
    console.log(`  search("${normalized}", lemma+root) → ${r.pagination.totalResults} results`)
  }

  sub('2d: What about searching المشركين directly (a form that exists in Quran)?')
  {
    const r = search('المشركين', context, { lemma: true, root: false }, { page: 1, limit: 10 })
    console.log(`  search("المشركين", lemma) → ${r.pagination.totalResults} results`)
    if (r.results.length > 0) {
      console.log(`    first: ${r.results[0].sura_id}:${r.results[0].aya_id} [${r.results[0].matchType}]`)
    }
  }

  sub('2e: What about root-based search? Root of شرك is ش-ر-ك')
  {
    // Check if wordMap maps المشرك to root
    const forms = ['المشرك', 'المشركين', 'المشركون', 'شرك']
    for (const f of forms) {
      const wm = wordMap.get(f) || wordMap.get(normalizeArabic(f))
      if (wm) console.log(`  wordMap["${f}"] → lemma="${wm.lemma}", root="${wm.root}"`)
      else console.log(`  wordMap["${f}"] → NOT FOUND`)
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 3: يَضْرِبَ — lemma results but missing highlights on some verses
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 3: يَضْرِبَ — highlight works on 12:14 but not 16:75')

  const yadribuQuery = 'يضرب' // stripped form (what removeTashkeel gives from يَضْرِبَ)
  const yadribuTashkeel = 'يَضْرِبَ'

  sub('3a: Normalization check')
  console.log(`  Raw:             "${yadribuTashkeel}"`)
  console.log(`  removeTashkeel:  "${removeTashkeel(yadribuTashkeel)}"`)
  console.log(`  normalizeArabic: "${normalizeArabic(yadribuTashkeel)}"`)

  sub('3b: wordMap lookup')
  const yadribuWM = wordMap.get(yadribuQuery) || wordMap.get(normalizeArabic(yadribuQuery))
  console.log(`  wordMap["${yadribuQuery}"] = ${JSON.stringify(yadribuWM) || 'NOT FOUND'}`)

  sub('3c: Search with lemma mode')
  {
    const r = search(yadribuQuery, context, { lemma: true, root: false, fuzzy: false }, { page: 1, limit: 100 })
    console.log(`  Total results: ${r.pagination.totalResults}`)
    console.log(`  Counts: exact=${r.counts.simple}, lemma=${r.counts.lemma}, root=${r.counts.root}, fuzzy=${r.counts.fuzzy}`)

    // Check specific verses
    for (const [sura, aya] of [[12, 14], [16, 75], [2, 26], [14, 24], [14, 25]]) {
      const v = r.results.find(x => x.sura_id === sura && x.aya_id === aya)
      if (v) {
        console.log(`\n  ${sura}:${aya} — FOUND in results`)
        console.log(`    matchType: ${v.matchType}, score: ${v.matchScore}`)
        console.log(`    matchedTokens: [${v.matchedTokens.join(', ')}]`)
        console.log(`    tokenTypes: ${JSON.stringify(v.tokenTypes) || 'none'}`)
        console.log(`    standard: "${v.standard.substring(0, 100)}"`)

        // Check engine's built-in highlighting
        const ranges = getHighlightRanges(v.uthmani, v.matchedTokens, v.tokenTypes)
        console.log(`    getHighlightRanges: ${ranges.length} ranges`)

        // Check our suffixMatch highlighting
        const words = v.standard.split(/\s+/)
        const suffixMatches = words
          .map((w, i) => ({ w, i, matches: suffixMatch(w, yadribuQuery) }))
          .filter(x => x.matches)
        console.log(`    suffixMatch highlights: ${suffixMatches.length} words → [${suffixMatches.map(x => `${x.i}:"${x.w}"`).join(', ')}]`)

        // Show morphology
        const morph = morphologyMap.get(v.gid)
        if (morph) {
          console.log(`    lemmas: [${morph.lemmas.join(', ')}]`)
          console.log(`    roots:  [${morph.roots.join(', ')}]`)
        }

        // Word-by-word analysis for this verse
        console.log(`    Word-by-word:`)
        words.forEach((w, i) => {
          const stripped = removeTashkeel(w).trim()
          const sm = suffixMatch(w, yadribuQuery)
          const marker = sm ? '✅' : '  '
          console.log(`      ${marker} [${i}] "${w}" → "${stripped}" endsWith("${yadribuQuery}")=${stripped.endsWith(yadribuQuery)}`)
        })
      } else {
        console.log(`\n  ${sura}:${aya} — NOT in results`)
      }
    }
  }

  sub('3d: Also test with tashkeel query (simulating raw text_imlaei click)')
  {
    const r = search(yadribuTashkeel, context, { lemma: true, root: false, fuzzy: false }, { page: 1, limit: 100 })
    console.log(`  search("${yadribuTashkeel}" with tashkeel, lemma) → ${r.pagination.totalResults} results`)
    const r2 = search(yadribuQuery, context, { lemma: true, root: false, fuzzy: false }, { page: 1, limit: 100 })
    console.log(`  search("${yadribuQuery}" stripped, lemma) → ${r2.pagination.totalResults} results`)
    if (r.pagination.totalResults !== r2.pagination.totalResults) {
      console.log(`  ❌ DIFFERENT! Engine does NOT strip tashkeel internally for this query!`)
    } else {
      console.log(`  ✅ Same count — engine handles tashkeel internally`)
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 4: الصيام — unexpected results, no matching
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 4: الصيام — unexpected results')

  const siyamQuery = 'الصيام'

  sub('4a: wordMap lookup')
  const siyamWM = wordMap.get(siyamQuery) || wordMap.get(normalizeArabic(siyamQuery))
  console.log(`  wordMap["${siyamQuery}"] = ${JSON.stringify(siyamWM) || 'NOT FOUND'}`)
  // Check related forms
  for (const form of ['صيام', 'الصيام', 'صام', 'يصوم', 'صوم', 'الصوم']) {
    const wm = wordMap.get(form) || wordMap.get(normalizeArabic(form))
    if (wm) console.log(`  wordMap["${form}"] = ${JSON.stringify(wm)}`)
    else console.log(`  wordMap["${form}"] = NOT FOUND`)
  }

  sub('4b: Search results across all modes')
  for (const [label, opts] of [
    ['exact only', { lemma: false, root: false, fuzzy: false }],
    ['lemma only', { lemma: true, root: false, fuzzy: false }],
    ['root only', { lemma: false, root: true, fuzzy: false }],
    ['lemma+root', { lemma: true, root: true, fuzzy: false }],
    ['fuzzy only', { lemma: false, root: false, fuzzy: true }],
    ['all modes', { lemma: true, root: true, fuzzy: true }],
  ]) {
    const r = search(siyamQuery, context, opts, { page: 1, limit: 100 })
    console.log(`  [${label}] → ${r.pagination.totalResults} results | counts: exact=${r.counts.simple}, lemma=${r.counts.lemma}, root=${r.counts.root}, fuzzy=${r.counts.fuzzy}`)
  }

  sub('4c: Detailed look at first 5 lemma results')
  {
    const r = search(siyamQuery, context, { lemma: true, root: true, fuzzy: false }, { page: 1, limit: 10 })
    for (const v of r.results.slice(0, 5)) {
      console.log(`\n  ${v.sura_id}:${v.aya_id} [${v.matchType}, score=${v.matchScore}]`)
      console.log(`    tokens: [${v.matchedTokens.join(', ')}]`)
      console.log(`    standard: "${v.standard.substring(0, 100)}"`)
      const morph = morphologyMap.get(v.gid)
      if (morph) {
        console.log(`    lemmas: [${morph.lemmas.join(', ')}]`)
        console.log(`    roots:  [${morph.roots.join(', ')}]`)
      }
      // Check if any word in the verse actually contains الصيام or related
      const words = v.standard.split(/\s+/)
      const matches = words.filter(w => {
        const s = removeTashkeel(w).trim()
        return s.includes('صيام') || s.includes('صوم') || s.includes('الصيام')
      })
      console.log(`    words containing صيام/صوم: [${matches.join(', ') || 'NONE'}]`)
    }
  }

  sub('4d: Does 2:183 (the famous الصيام verse) appear?')
  {
    const r = search(siyamQuery, context, { lemma: true, root: true }, { page: 1, limit: 200 })
    const v2_183 = r.results.find(v => v.sura_id === 2 && v.aya_id === 183)
    if (v2_183) {
      console.log(`  ✅ 2:183 found! matchType=${v2_183.matchType}, score=${v2_183.matchScore}`)
      console.log(`    standard: "${v2_183.standard.substring(0, 100)}"`)
    } else {
      console.log(`  ❌ 2:183 NOT found in results!`)
      // Try exact search for the verse text
      let v183 = null
      for (const [gid, v] of quranData.entries()) {
        if (v.sura_id === 2 && v.aya_id === 183) { v183 = v; break }
      }
      if (v183) {
        console.log(`    Verse text: "${v183.standard.substring(0, 100)}"`)
        console.log(`    Does it contain الصيام? ${v183.standard.includes('الصيام')}`)
        console.log(`    normalizeArabic: ${normalizeArabic(v183.standard).includes(normalizeArabic('الصيام'))}`)
      }
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 5: How our app actually sends the query — the full flow
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 5: Simulating the actual app flow (word click → search)')
  console.log('  In the app: query = word.text_simple || word.text')
  console.log('  Both are text_imlaei from quran.com API (WITH tashkeel)')
  console.log('  The query is passed DIRECTLY to search() — no removeTashkeel, no normalizeArabic\n')

  // Simulate clicking words as they come from quran.com API (text_imlaei)
  const clickSimulations = [
    { word: 'فَوْزًا', label: 'فوزا from a verse', expectedStripped: 'فوزا' },
    { word: 'يَضْرِبَ', label: 'يضرب from a verse', expectedStripped: 'يضرب' },
    { word: 'الصِّيَامُ', label: 'الصيام from 2:183', expectedStripped: 'الصيام' },
    { word: 'الْمُشْرِكِينَ', label: 'المشركين from a verse', expectedStripped: 'المشركين' },
  ]

  for (const sim of clickSimulations) {
    sub(`Click: "${sim.word}" (${sim.label})`)

    const rawQuery = sim.word // this is what the app sends
    const strippedQuery = removeTashkeel(sim.word)
    const normalizedQuery = normalizeArabic(sim.word)

    console.log(`  text_imlaei (raw):  "${rawQuery}"`)
    console.log(`  removeTashkeel:     "${strippedQuery}"`)
    console.log(`  normalizeArabic:    "${normalizedQuery}"`)

    // Search with raw (what app does)
    const rRaw = search(rawQuery, context, { lemma: true, root: false, fuzzy: false }, { page: 1, limit: 50 })
    // Search with stripped
    const rStripped = search(strippedQuery, context, { lemma: true, root: false, fuzzy: false }, { page: 1, limit: 50 })
    // Search with normalized
    const rNormalized = search(normalizedQuery, context, { lemma: true, root: false, fuzzy: false }, { page: 1, limit: 50 })

    console.log(`  Results with raw query:        ${rRaw.pagination.totalResults}`)
    console.log(`  Results with removeTashkeel:    ${rStripped.pagination.totalResults}`)
    console.log(`  Results with normalizeArabic:   ${rNormalized.pagination.totalResults}`)

    if (rRaw.pagination.totalResults !== rStripped.pagination.totalResults) {
      console.log(`  ⚠️  RAW vs STRIPPED differ! We should be calling removeTashkeel before search!`)
    }
    if (rStripped.pagination.totalResults !== rNormalized.pagination.totalResults) {
      console.log(`  ⚠️  STRIPPED vs NORMALIZED differ! normalizeArabic changes results!`)
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 6: المشرك typed manually — is there a "free" or "contains" search?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 6: Is there a "free search" / partial match in the engine?')
  console.log('  The user typed المشرك manually. The Quran has المشركين, المشركون, etc.')
  console.log('  Does the engine match partial words or only full tokens?\n')

  // Test: search for a partial word vs the full word
  const partialTests = [
    { partial: 'المشرك', full: 'المشركين', label: 'المشرك vs المشركين' },
    { partial: 'كتاب', full: 'الكتاب', label: 'كتاب vs الكتاب' },
    { partial: 'صيام', full: 'الصيام', label: 'صيام vs الصيام' },
    { partial: 'رحم', full: 'الرحمن', label: 'رحم vs الرحمن' },
  ]

  for (const t of partialTests) {
    const rPartial = search(t.partial, context, { lemma: true, root: true }, { page: 1, limit: 10 })
    const rFull = search(t.full, context, { lemma: true, root: true }, { page: 1, limit: 10 })
    console.log(`  "${t.partial}" → ${rPartial.pagination.totalResults} results | "${t.full}" → ${rFull.pagination.totalResults} results`)
    
    // Check wordMap for both
    const wmPartial = wordMap.get(t.partial) || wordMap.get(normalizeArabic(t.partial))
    const wmFull = wordMap.get(t.full) || wordMap.get(normalizeArabic(t.full))
    console.log(`    wordMap["${t.partial}"] = ${wmPartial ? `lemma="${wmPartial.lemma}"` : 'NOT FOUND'}`)
    console.log(`    wordMap["${t.full}"] = ${wmFull ? `lemma="${wmFull.lemma}"` : 'NOT FOUND'}`)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 7: Highlight gap analysis — engine results vs our highlighting
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 7: Highlight gap — engine finds verse but we cannot highlight')
  console.log('  For each test word, check how many results have:')
  console.log('  - matchedTokens from engine (Strategy 1)')
  console.log('  - suffixMatch can find the word (Strategy 2)')
  console.log('  - Neither (= no highlighting possible)\n')

  const highlightTests = [
    { query: 'فوزا', label: 'فوزا' },
    { query: 'يضرب', label: 'يضرب' },
    { query: 'الصيام', label: 'الصيام' },
    { query: 'المشركين', label: 'المشركين' },
  ]

  for (const t of highlightTests) {
    const r = search(t.query, context, { lemma: true, root: true }, { page: 1, limit: 50 })
    
    let hasTokens = 0
    let hasSuffix = 0
    let hasNeither = 0

    for (const v of r.results) {
      const engineHasTokens = v.matchedTokens && v.matchedTokens.length > 0
      const words = v.standard.split(/\s+/)
      const ourMatch = words.some(w => suffixMatch(w, t.query))

      if (engineHasTokens) hasTokens++
      else if (ourMatch) hasSuffix++
      else hasNeither++
    }

    console.log(`  "${t.label}" — ${r.pagination.totalResults} total results:`)
    console.log(`    Engine tokens (Strategy 1): ${hasTokens}`)
    console.log(`    suffixMatch (Strategy 2):   ${hasSuffix}`)
    console.log(`    NO highlighting possible:   ${hasNeither}`)
    if (hasNeither > 0) {
      console.log(`    ⚠️  ${hasNeither} verses found by engine but CANNOT be highlighted!`)
      // Show first 3 unhighlightable
      let shown = 0
      for (const v of r.results) {
        if (shown >= 3) break
        const engineHasTokens = v.matchedTokens && v.matchedTokens.length > 0
        const words = v.standard.split(/\s+/)
        const ourMatch = words.some(w => suffixMatch(w, t.query))
        if (!engineHasTokens && !ourMatch) {
          console.log(`      ${v.sura_id}:${v.aya_id} [${v.matchType}] "${v.standard.substring(0, 80)}"`)
          const morph = morphologyMap.get(v.gid)
          if (morph) console.log(`        lemmas: [${morph.lemmas.join(', ')}]`)
          shown++
        }
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('DONE')
  console.log('  Run: node search-diagnostic.mjs')
  console.log('  Review the output above to understand each issue.\n')
}

main().catch(console.error)
