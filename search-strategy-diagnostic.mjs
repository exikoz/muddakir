/**
 * search-strategy-diagnostic.mjs
 * 
 * Focused diagnostic for the ACTUAL app use cases:
 * 
 * USE CASE 1: User clicks a word in a verse → single word search
 *   - The query is text_imlaei (with tashkeel) from quran.com API
 *   - Default mode is lemma
 *   - We need: correct results + highlighting
 * 
 * USE CASE 2: User selects multiple adjacent words → regex search
 *   - Currently uses buildAdjacentPattern() + searchRegex()
 *   - Could the API handle this with a multi-word query?
 * 
 * USE CASE 3: المشرك typed manually → free text search
 *   - Not a word click — user typed it
 *   - Package gives 0 without fuzzy, API gives 200
 *   - But API returns no highlights for many results
 * 
 * KEY QUESTIONS:
 * - Can we use the API as primary and package as fallback for lemma?
 * - Can the API handle adjacent multi-word search?
 * - For results without <em> highlights, can we use the package's
 *   morphology data to find which word to highlight?
 * - What about the bad wordMap entries — can we filter noise?
 * 
 * Run: node search-strategy-diagnostic.mjs
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

// ─── API Auth ───────────────────────────────────────────────────────────────

const CLIENT_ID = 'b7b6879f-edba-40a0-bafa-58b495810701'
const CLIENT_SECRET = '4TbsSZk~-yK8PU3EndkhAEL6tf'
const AUTH_ENDPOINT = 'https://oauth2.quran.foundation/oauth2/token'
const SEARCH_BASE = 'https://apis.quran.foundation/search/v1/search'

let cachedToken = null
async function getSearchToken() {
  if (cachedToken) return cachedToken
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch(AUTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'search' }),
  })
  if (!res.ok) throw new Error(`Token failed: ${res.status}`)
  cachedToken = (await res.json()).access_token
  return cachedToken
}

async function searchAPI(query, opts = {}) {
  const token = await getSearchToken()
  const params = new URLSearchParams({
    mode: opts.mode || 'advanced',
    query,
    highlight: '1',
    get_text: '1',
  })
  if (opts.exact_matches_only) params.set('exact_matches_only', '1')
  if (opts.size) params.set('size', String(opts.size))
  if (opts.page) params.set('page', String(opts.page))
  const res = await fetch(`${SEARCH_BASE}?${params}`, {
    headers: { 'x-auth-token': token, 'x-client-id': CLIENT_ID },
  })
  if (!res.ok) throw new Error(`Search API ${res.status}: ${await res.text()}`)
  return res.json()
}

function parseHighlights(nameWithEm) {
  if (!nameWithEm) return { highlightedWords: [], hasHighlights: false }
  const highlightedWords = []
  const emRegex = /<em>(.*?)<\/em>/g
  let match
  while ((match = emRegex.exec(nameWithEm)) !== null) highlightedWords.push(match[1])
  return { highlightedWords, hasHighlights: highlightedWords.length > 0 }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function header(title) {
  console.log(`\n${'═'.repeat(80)}`)
  console.log(`  ${title}`)
  console.log(`${'═'.repeat(80)}`)
}
function sub(title) { console.log(`\n  ── ${title} ──`) }

function suffixMatch(wordText, queryText) {
  const w = removeTashkeel(wordText).trim()
  const q = removeTashkeel(queryText).trim()
  if (w.length === 0 || q.length === 0) return false
  if (w.length >= q.length) return w.endsWith(q)
  return q.endsWith(w)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Loading package data + API token...')
  const [quranData, morphologyMap, wordMap, semanticMap] = await Promise.all([
    loadQuranData(), loadMorphology(), loadWordMap(), loadSemanticData(),
  ])
  const invertedIndex = buildInvertedIndex(morphologyMap, quranData, semanticMap)
  const ctx = { quranData, morphologyMap, wordMap, invertedIndex, semanticMap }
  await getSearchToken()
  console.log('Ready.\n')

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // USE CASE 1: Word click → single word search
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('USE CASE 1: Word click — single word search')
  console.log('  User clicks a word → text_imlaei is the query')
  console.log('  App uses lemma mode by default')
  console.log('  We need: correct results + word-level highlighting\n')

  // Simulate real word clicks (text_imlaei values from quran.com API)
  const wordClicks = [
    { imlaei: 'فَوْزًا', from: '4:73', desc: 'فوزا — noun, package has bad lemma' },
    { imlaei: 'يَضْرِبَ', from: '2:26', desc: 'يضرب — verb, many conjugations' },
    { imlaei: 'الصِّيَامُ', from: '2:183', desc: 'الصيام — noun, package has bad lemma' },
    { imlaei: 'سُلَيْمَانَ', from: '2:102', desc: 'سليمان — proper name, works well' },
    { imlaei: 'وَسُلَيْمَانَ', from: '21:78', desc: 'وسليمان — prefixed name' },
    { imlaei: 'الْمُشْرِكِينَ', from: '2:105', desc: 'المشركين — plural, exists in Quran' },
    { imlaei: 'إِبْرَاهِيمَ', from: '2:124', desc: 'إبراهيم — proper name with hamza' },
    { imlaei: 'الْأَرْضِ', from: '2:11', desc: 'الأرض — common noun with hamza' },
  ]

  for (const click of wordClicks) {
    sub(`Click: "${click.imlaei}" (${click.desc})`)
    const query = click.imlaei // raw text_imlaei — what the app sends
    const stripped = removeTashkeel(query).trim()

    // Package: lemma search (what app does now)
    const pkgLemma = search(stripped, ctx, { lemma: true, root: false, fuzzy: false }, { page: 1, limit: 50 })
    // Package: exact only
    const pkgExact = search(stripped, ctx, { lemma: false, root: false, fuzzy: false }, { page: 1, limit: 50 })

    // API search
    const apiResult = await searchAPI(stripped, { size: 50 })

    // Count highlights
    let apiWithEm = 0, apiWithoutEm = 0
    for (const v of apiResult.result.verses) {
      if (parseHighlights(v.name).hasHighlights) apiWithEm++
      else apiWithoutEm++
    }

    // Package highlight analysis
    let pkgWithTokens = 0, pkgSuffixMatch = 0, pkgNoHighlight = 0
    for (const v of pkgLemma.results) {
      if (v.matchedTokens?.length > 0) { pkgWithTokens++; continue }
      const words = v.standard.split(/\s+/)
      if (words.some(w => suffixMatch(w, stripped))) { pkgSuffixMatch++; continue }
      pkgNoHighlight++
    }

    console.log(`  Query: "${stripped}"`)
    console.log(`  ┌─────────────────┬──────────┬──────────────┬───────────────┐`)
    console.log(`  │                 │ Results  │ Highlighted  │ No highlight  │`)
    console.log(`  ├─────────────────┼──────────┼──────────────┼───────────────┤`)
    console.log(`  │ Pkg exact       │ ${String(pkgExact.pagination.totalResults).padEnd(8)} │ —            │ —             │`)
    console.log(`  │ Pkg lemma       │ ${String(pkgLemma.pagination.totalResults).padEnd(8)} │ ${String(pkgWithTokens + pkgSuffixMatch).padEnd(12)} │ ${String(pkgNoHighlight).padEnd(13)} │`)
    console.log(`  │ API             │ ${String(apiResult.pagination.total_records).padEnd(8)} │ ${String(apiWithEm).padEnd(12)} │ ${String(apiWithoutEm).padEnd(13)} │`)
    console.log(`  └─────────────────┴──────────┴──────────────┴───────────────┘`)

    // Show first 3 API results with highlights
    for (const v of apiResult.result.verses.slice(0, 3)) {
      const h = parseHighlights(v.name)
      console.log(`    API: ${v.key} — ${h.hasHighlights ? `✅ [${h.highlightedWords.join(', ')}]` : '❌ no highlight'}`)
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // USE CASE 2: Adjacent multi-word search
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('USE CASE 2: Adjacent multi-word search')
  console.log('  User selects 2-3 adjacent words → currently uses regex search')
  console.log('  Can the API handle this with a space-separated query?\n')

  const multiWordTests = [
    { words: ['الرَّحْمَـٰنِ', 'الرَّحِيمِ'], desc: 'الرحمن الرحيم' },
    { words: ['سَبِيلِ', 'اللَّهِ'], desc: 'سبيل الله' },
    { words: ['يَوْمِ', 'الْقِيَامَةِ'], desc: 'يوم القيامة' },
    { words: ['بِسْمِ', 'اللَّهِ', 'الرَّحْمَـٰنِ'], desc: 'بسم الله الرحمن' },
    { words: ['فِي', 'سَبِيلِ', 'اللَّهِ'], desc: 'في سبيل الله' },
  ]

  for (const t of multiWordTests) {
    sub(t.desc)
    const stripped = t.words.map(w => removeTashkeel(w).trim()).join(' ')
    const normalized = t.words.map(w => normalizeArabic(w).trim()).join(' ')

    // Package: regex search (current approach)
    const regexPattern = t.words.map(w => normalizeArabic(w).trim()).filter(w => w.length > 0).join('\\s+')
    const pkgRegex = search(regexPattern, ctx, { lemma: false, root: false, isRegex: true }, { page: 1, limit: 50 })

    // API: just send the words as a query
    const apiResult = await searchAPI(stripped, { size: 50 })
    // API: also try exact_matches_only
    const apiExact = await searchAPI(stripped, { size: 50, exact_matches_only: true })

    let apiWithEm = 0
    for (const v of apiResult.result.verses) {
      if (parseHighlights(v.name).hasHighlights) apiWithEm++
    }

    console.log(`  Query: "${stripped}"`)
    console.log(`  Regex: "${regexPattern}"`)
    console.log(`  Pkg regex:       ${pkgRegex.pagination.totalResults} results`)
    console.log(`  API default:     ${apiResult.pagination.total_records} results (${apiWithEm} with highlights)`)
    console.log(`  API exact_only:  ${apiExact.pagination.total_records} results`)

    // Check if API results are adjacent (the words appear next to each other)
    // vs just both appearing somewhere in the verse
    if (apiResult.result.verses.length > 0) {
      const first = apiResult.result.verses[0]
      const h = parseHighlights(first.name)
      console.log(`    First: ${first.key} — [${h.highlightedWords.join(', ')}]`)
      
      // Check: are the highlighted words adjacent in the name?
      if (h.highlightedWords.length > 0) {
        // The <em> tags should wrap adjacent words if they're next to each other
        const emBlocks = first.name.match(/<em>.*?<\/em>/g) || []
        console.log(`    <em> blocks: ${emBlocks.length} (${emBlocks.length === 1 ? 'single block = adjacent' : 'multiple blocks = may not be adjacent'})`)
      }
    }

    // Show first 3 from each
    console.log(`    Package regex top 3:`)
    for (const v of pkgRegex.results.slice(0, 3)) {
      console.log(`      ${v.sura_id}:${v.aya_id} [${v.matchType}]`)
    }
    console.log(`    API top 3:`)
    for (const v of apiResult.result.verses.slice(0, 3)) {
      const h = parseHighlights(v.name)
      console.log(`      ${v.key} — [${h.highlightedWords.join(', ')}]`)
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // USE CASE 3: Can we use package morphology to highlight API results?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('USE CASE 3: Morphology-based highlighting for API results without <em>')
  console.log('  When the API returns results without <em> tags,')
  console.log('  can we use the package morphology data to find which word to highlight?')
  console.log('  Strategy: look up the verse GID → get lemmas array → find matching lemma index\n')

  // Test with المشرك — API gives 200 results but no <em> highlights
  sub('Test: المشرك — API results without highlights')
  {
    const apiResult = await searchAPI('المشرك', { size: 10 })
    // Get the lemma for المشركين (the form that exists in wordMap)
    const targetLemma = (wordMap.get('المشركين') || wordMap.get(normalizeArabic('المشركين')))?.lemma
    console.log(`  Target lemma (from المشركين): "${targetLemma}"`)

    for (const v of apiResult.result.verses.slice(0, 5)) {
      const h = parseHighlights(v.name)
      const [sura, aya] = v.key.split(':').map(Number)

      // Find the verse GID in quranData
      let gid = null
      for (const [g, verse] of quranData.entries()) {
        if (verse.sura_id === sura && verse.aya_id === aya) { gid = g; break }
      }

      console.log(`\n    ${v.key} — API highlight: ${h.hasHighlights ? `[${h.highlightedWords.join(', ')}]` : 'NONE'}`)

      if (gid) {
        const morph = morphologyMap.get(gid)
        const verse = quranData.get(gid)
        if (morph && targetLemma) {
          // Find which word positions have the matching lemma
          const matchingPositions = []
          morph.lemmas.forEach((lemma, i) => {
            if (lemma === targetLemma) matchingPositions.push(i)
          })

          if (matchingPositions.length > 0) {
            const words = verse.standard.split(/\s+/)
            const matchedWords = matchingPositions.map(i => `[${i}]:"${words[i] || '?'}"`)
            console.log(`      Morphology match: lemma "${targetLemma}" at positions ${matchedWords.join(', ')}`)
          } else {
            console.log(`      Morphology: lemma "${targetLemma}" NOT found in verse lemmas`)
            console.log(`      Verse lemmas: [${morph.lemmas.join(', ')}]`)
          }
        }
      }
    }
  }

  // Test with الصيام — same problem
  sub('Test: الصيام — API results without highlights')
  {
    const apiResult = await searchAPI('الصيام', { size: 10 })
    // The wordMap has bad lemma for الصيام, but the root is correct: ص-و-م
    const targetRoot = (wordMap.get('الصيام') || wordMap.get(normalizeArabic('الصيام')))?.root
    console.log(`  Target root (from الصيام): "${targetRoot}"`)

    for (const v of apiResult.result.verses.slice(0, 5)) {
      const h = parseHighlights(v.name)
      const [sura, aya] = v.key.split(':').map(Number)

      let gid = null
      for (const [g, verse] of quranData.entries()) {
        if (verse.sura_id === sura && verse.aya_id === aya) { gid = g; break }
      }

      console.log(`\n    ${v.key} — API highlight: ${h.hasHighlights ? `[${h.highlightedWords.join(', ')}]` : 'NONE'}`)

      if (gid) {
        const morph = morphologyMap.get(gid)
        const verse = quranData.get(gid)
        if (morph && targetRoot) {
          // Find which word positions have the matching root
          const matchingPositions = []
          morph.roots.forEach((root, i) => {
            if (root === targetRoot) matchingPositions.push(i)
          })

          if (matchingPositions.length > 0) {
            const words = verse.standard.split(/\s+/)
            const matchedWords = matchingPositions.map(i => `[${i}]:"${words[i] || '?'}"`)
            console.log(`      Root match: "${targetRoot}" at positions ${matchedWords.join(', ')}`)
          } else {
            console.log(`      Root "${targetRoot}" NOT found in verse roots`)
            console.log(`      Verse roots: [${morph.roots.join(', ')}]`)
          }
        }
      }
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // USE CASE 4: Package noise filtering — can we fix lemma results?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('USE CASE 4: Can we filter package noise by discarding score=0 results?')
  console.log('  The bad wordMap causes matchType="none", matchScore=0 results')
  console.log('  What if we just filter those out?\n')

  const noiseTests = [
    { query: 'فوزا', desc: 'فوزا (bad lemma→عظيم)' },
    { query: 'الصيام', desc: 'الصيام (bad lemma→ما)' },
    { query: 'يضرب', desc: 'يضرب (verb, many forms)' },
    { query: 'سليمان', desc: 'سليمان (proper name, good data)' },
    { query: 'المشركين', desc: 'المشركين (exists in Quran)' },
  ]

  for (const t of noiseTests) {
    const r = search(t.query, ctx, { lemma: true, root: false, fuzzy: false }, { page: 1, limit: 200 })
    
    const withScore = r.results.filter(v => v.matchScore > 0)
    const noScore = r.results.filter(v => v.matchScore === 0)
    
    // Of the score>0 results, how many can we highlight?
    let scoreHighlightable = 0
    for (const v of withScore) {
      if (v.matchedTokens?.length > 0) { scoreHighlightable++; continue }
      const words = v.standard.split(/\s+/)
      if (words.some(w => suffixMatch(w, t.query))) { scoreHighlightable++; continue }
    }

    console.log(`  "${t.desc}"`)
    console.log(`    Total: ${r.pagination.totalResults} | Score>0: ${withScore.length} | Score=0: ${noScore.length}`)
    console.log(`    Score>0 highlightable: ${scoreHighlightable}/${withScore.length}`)
    console.log(`    Filtering score=0 removes ${noScore.length} noise results`)
    
    if (withScore.length > 0 && withScore.length <= 10) {
      console.log(`    Score>0 results:`)
      for (const v of withScore) {
        console.log(`      ${v.sura_id}:${v.aya_id} [${v.matchType}, score=${v.matchScore}] tokens=[${v.matchedTokens?.join(', ') || ''}]`)
      }
    }
    console.log()
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // USE CASE 5: API for adjacent words — does it enforce adjacency?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('USE CASE 5: Does the API enforce word adjacency?')
  console.log('  When searching "سبيل الله", does the API only return verses')
  console.log('  where these words are NEXT TO each other, or anywhere in the verse?\n')

  {
    const apiResult = await searchAPI('سبيل الله', { size: 10 })
    console.log(`  API "سبيل الله": ${apiResult.pagination.total_records} results`)
    
    for (const v of apiResult.result.verses.slice(0, 5)) {
      const h = parseHighlights(v.name)
      // Check if the highlighted text contains both words adjacent
      const nameClean = v.name?.replace(/<\/?em>/g, '') || ''
      const hasAdjacent = nameClean.includes('سَبِيلِ ٱللَّهِ') || nameClean.includes('سَبِيلِ اللَّهِ')
      console.log(`    ${v.key} — adjacent: ${hasAdjacent ? '✅' : '❓'} | em: [${h.highlightedWords.join(', ')}]`)
    }

    // Compare with package regex
    const pkgRegex = search('سبيل\\s+الله', ctx, { lemma: false, root: false, isRegex: true }, { page: 1, limit: 10 })
    console.log(`\n  Pkg regex "سبيل\\s+الله": ${pkgRegex.pagination.totalResults} results`)
    for (const v of pkgRegex.results.slice(0, 3)) {
      console.log(`    ${v.sura_id}:${v.aya_id}`)
    }

    // Also test: does the API return verses where the words are NOT adjacent?
    const apiSingle1 = await searchAPI('سبيل', { size: 5 })
    const apiSingle2 = await searchAPI('الله', { size: 5 })
    console.log(`\n  API "سبيل" alone: ${apiSingle1.pagination.total_records} results`)
    console.log(`  API "الله" alone: ${apiSingle2.pagination.total_records} results`)
    console.log(`  API "سبيل الله" together: ${apiResult.pagination.total_records} results`)
    console.log(`  If API enforces adjacency, "together" should be << "سبيل" alone`)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // USE CASE 6: Lemma search — package vs API for verb forms
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('USE CASE 6: Lemma/verb search — what does each miss?')
  console.log('  For يضرب, the package finds 54 (via lemma ضرب) but API finds only 5')
  console.log('  What does the API miss that the package finds?\n')

  {
    const pkgResults = search('يضرب', ctx, { lemma: true, root: false, fuzzy: false }, { page: 1, limit: 100 })
    const apiResult = await searchAPI('يضرب', { size: 50 })
    
    const apiKeys = new Set(apiResult.result.verses.map(v => v.key))
    const pkgKeys = new Set(pkgResults.results.map(v => `${v.sura_id}:${v.aya_id}`))

    // Package finds but API doesn't
    const pkgOnly = pkgResults.results.filter(v => !apiKeys.has(`${v.sura_id}:${v.aya_id}`))
    // API finds but package doesn't
    const apiOnly = apiResult.result.verses.filter(v => !pkgKeys.has(v.key))

    console.log(`  Package: ${pkgResults.pagination.totalResults} results`)
    console.log(`  API: ${apiResult.pagination.total_records} results`)
    console.log(`  Package only: ${pkgOnly.length} | API only: ${apiOnly.length}`)

    console.log(`\n  Package-only results (first 10) — what verb forms does the package find via lemma?`)
    for (const v of pkgOnly.slice(0, 10)) {
      const morph = morphologyMap.get(v.gid)
      const words = v.standard.split(/\s+/)
      // Find the word with lemma ضرب
      const drbPositions = []
      if (morph) {
        morph.lemmas.forEach((l, i) => {
          if (l === 'ضرب') drbPositions.push({ i, word: words[i] || '?' })
        })
      }
      console.log(`    ${v.sura_id}:${v.aya_id} [${v.matchType}] — ضرب forms: [${drbPositions.map(p => `"${p.word}"`).join(', ') || 'none found'}]`)
    }

    console.log(`\n  API-only results:`)
    for (const v of apiOnly) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — [${h.highlightedWords.join(', ')}]`)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('SUMMARY')
  console.log(`
  The data above should answer:
  
  1. For word clicks: Is the API or package better for each word type?
  2. For adjacent words: Can the API replace the package regex?
  3. For highlighting: Can morphology data fill the gap when <em> is missing?
  4. For noise: Does filtering score=0 fix the bad wordMap problem?
  5. For lemma: What does the package find that the API misses (verb forms)?
  `)
}

main().catch(console.error)
