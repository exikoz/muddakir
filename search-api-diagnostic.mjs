/**
 * search-api-diagnostic.mjs
 * 
 * Diagnostic: Test the quran.com Search API (v1) as a fallback/alternative
 * to the quran-search-engine npm package.
 * 
 * Tests the same problematic words from search-diagnostic.mjs:
 * 1. فوزا — package gives 119 lemma results (most are noise from bad wordMap)
 * 2. المشرك — package gives 0 results without fuzzy
 * 3. يضرب — package finds verses but can't highlight many
 * 4. الصيام — package gives 1841 results (bad lemma mapping to "ما")
 * 
 * Also tests: highlighting via <em> tags, exact_matches_only, get_text
 * 
 * Run: node search-api-diagnostic.mjs
 */

const CLIENT_ID = 'b7b6879f-edba-40a0-bafa-58b495810701'
const CLIENT_SECRET = '4TbsSZk~-yK8PU3EndkhAEL6tf'
const AUTH_ENDPOINT = 'https://oauth2.quran.foundation/oauth2/token'
const SEARCH_BASE = 'https://apis.quran.foundation/search/v1/search'

// ─── Auth ───────────────────────────────────────────────────────────────────

let cachedToken = null

async function getSearchToken() {
  if (cachedToken) return cachedToken
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch(AUTH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'search' }),
  })
  if (!res.ok) throw new Error(`Token failed: ${res.status}`)
  const json = await res.json()
  cachedToken = json.access_token
  return cachedToken
}

async function searchAPI(query, opts = {}) {
  const token = await getSearchToken()
  const params = new URLSearchParams({
    mode: opts.mode || 'advanced',
    query,
    highlight: opts.highlight !== undefined ? String(opts.highlight) : '1',
    get_text: opts.get_text !== undefined ? String(opts.get_text) : '1',
  })
  if (opts.exact_matches_only) params.set('exact_matches_only', '1')
  if (opts.page) params.set('page', String(opts.page))
  if (opts.size) params.set('size', String(opts.size))

  const res = await fetch(`${SEARCH_BASE}?${params}`, {
    headers: { 'x-auth-token': token, 'x-client-id': CLIENT_ID },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Search API ${res.status}: ${body}`)
  }
  return res.json()
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function header(title) {
  console.log(`\n${'═'.repeat(80)}`)
  console.log(`  ${title}`)
  console.log(`${'═'.repeat(80)}`)
}

function sub(title) {
  console.log(`\n  ── ${title} ──`)
}

/**
 * Extract highlighted words from the API's <em> tags in the name field.
 * Returns array of { word, highlighted } objects.
 */
function parseHighlights(nameWithEm) {
  if (!nameWithEm) return { words: [], highlightedWords: [], rawText: '' }
  
  const rawText = nameWithEm.replace(/<\/?em>/g, '')
  const highlightedWords = []
  const emRegex = /<em>(.*?)<\/em>/g
  let match
  while ((match = emRegex.exec(nameWithEm)) !== null) {
    highlightedWords.push(match[1])
  }
  return { words: rawText.split(/\s+/), highlightedWords, rawText }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Testing quran.com Search API (v1)...')
  console.log('Getting search token...')
  await getSearchToken()
  console.log('Token acquired.\n')

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 1: فوزا — package gave 119 results (most noise), API should be cleaner
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 1: فوزا')
  console.log('  Package (lemma): 119 results (116 fuzzy noise from bad wordMap lemma="عظيم")')
  console.log('  Package (exact): 3 results')

  sub('1a: API default search')
  {
    const r = await searchAPI('فوزا')
    console.log(`  API results: ${r.pagination.total_records}`)
    for (const v of r.result.verses) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  sub('1b: API exact_matches_only')
  {
    const r = await searchAPI('فوزا', { exact_matches_only: true })
    console.log(`  API exact results: ${r.pagination.total_records}`)
    for (const v of r.result.verses) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  sub('1c: Does 2:7 appear? (it should NOT)')
  {
    const r = await searchAPI('فوزا')
    const v27 = r.result.verses.find(v => v.key === '2:7')
    console.log(`  2:7 in results: ${v27 ? '⚠️ YES (bad)' : '✅ NO (correct)'}`)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 2: المشرك — package gives 0 without fuzzy
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 2: المشرك (singular — not in Quran text)')
  console.log('  Package (lemma+root): 0 results')
  console.log('  Package (fuzzy): 31 results')

  sub('2a: API default search')
  {
    const r = await searchAPI('المشرك')
    console.log(`  API results: ${r.pagination.total_records}`)
    for (const v of r.result.verses.slice(0, 5)) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  sub('2b: API exact_matches_only')
  {
    const r = await searchAPI('المشرك', { exact_matches_only: true })
    console.log(`  API exact results: ${r.pagination.total_records}`)
    for (const v of r.result.verses.slice(0, 5)) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  sub('2c: API with المشركين (plural form that exists)')
  {
    const r = await searchAPI('المشركين')
    console.log(`  API results for المشركين: ${r.pagination.total_records}`)
    for (const v of r.result.verses.slice(0, 3)) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 3: يضرب — package finds 54 but can't highlight 34 of them
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 3: يضرب (verb — many conjugated forms)')
  console.log('  Package (lemma): 54 results, 34 with no highlighting possible')

  sub('3a: API default search')
  {
    const r = await searchAPI('يضرب')
    console.log(`  API results: ${r.pagination.total_records}`)
    for (const v of r.result.verses.slice(0, 10)) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  sub('3b: API exact_matches_only')
  {
    const r = await searchAPI('يضرب', { exact_matches_only: true })
    console.log(`  API exact results: ${r.pagination.total_records}`)
    for (const v of r.result.verses.slice(0, 5)) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  sub('3c: Check specific verses — 12:14 and 16:75')
  {
    const r = await searchAPI('يضرب', { size: 50 })
    const v1214 = r.result.verses.find(v => v.key === '12:14')
    const v1675 = r.result.verses.find(v => v.key === '16:75')
    
    console.log(`  12:14 in results: ${v1214 ? 'YES' : 'NO'}`)
    if (v1214) {
      const h = parseHighlights(v1214.name)
      console.log(`    highlighted: [${h.highlightedWords.join(', ')}]`)
    }
    
    console.log(`  16:75 in results: ${v1675 ? 'YES' : 'NO'}`)
    if (v1675) {
      const h = parseHighlights(v1675.name)
      console.log(`    highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  sub('3d: Does API handle verb conjugations? Check for ضرب forms')
  {
    const r = await searchAPI('يضرب', { size: 50 })
    // Check what forms are highlighted across all results
    const allHighlighted = new Set()
    for (const v of r.result.verses) {
      const h = parseHighlights(v.name)
      h.highlightedWords.forEach(w => allHighlighted.add(w))
    }
    console.log(`  All highlighted word forms: [${[...allHighlighted].join(', ')}]`)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 4: الصيام — package gives 1841 results (lemma mapped to "ما")
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 4: الصيام')
  console.log('  Package (lemma): 1841 results (bad wordMap lemma="ما")')
  console.log('  Package (exact): 2 results')

  sub('4a: API default search')
  {
    const r = await searchAPI('الصيام')
    console.log(`  API results: ${r.pagination.total_records}`)
    for (const v of r.result.verses) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  sub('4b: API exact_matches_only')
  {
    const r = await searchAPI('الصيام', { exact_matches_only: true })
    console.log(`  API exact results: ${r.pagination.total_records}`)
    for (const v of r.result.verses) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  sub('4c: Does 2:183 appear?')
  {
    const r = await searchAPI('الصيام')
    const v2183 = r.result.verses.find(v => v.key === '2:183')
    console.log(`  2:183 in results: ${v2183 ? '✅ YES' : '❌ NO'}`)
    if (v2183) {
      const h = parseHighlights(v2183.name)
      console.log(`    highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 5: Highlight format analysis — how does the API mark highlights?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 5: Highlight format analysis')
  console.log('  Checking: Does the API use <em> tags? On which field? What text script?')

  sub('5a: Full response structure for a known verse')
  {
    const r = await searchAPI('الرحمن الرحيم', { get_text: 1, highlight: 1 })
    if (r.result.verses.length > 0) {
      const v = r.result.verses[0]
      console.log(`  Verse key: ${v.key}`)
      console.log(`  result_type: ${v.result_type}`)
      console.log(`  All fields: ${Object.keys(v).join(', ')}`)
      console.log(`  name (with <em>): "${v.name?.substring(0, 200)}"`)
      console.log(`  arabic: "${v.arabic?.substring(0, 200)}"`)
      console.log(`  isArabic: ${v.isArabic}`)
      
      // Check if arabic field also has <em> tags
      const arabicHasEm = v.arabic?.includes('<em>')
      const nameHasEm = v.name?.includes('<em>')
      console.log(`  arabic has <em>: ${arabicHasEm}`)
      console.log(`  name has <em>: ${nameHasEm}`)
    }
  }

  sub('5b: highlight=0 vs highlight=1')
  {
    const r0 = await searchAPI('الرحمن', { highlight: 0 })
    const r1 = await searchAPI('الرحمن', { highlight: 1 })
    
    if (r0.result.verses.length > 0 && r1.result.verses.length > 0) {
      console.log(`  highlight=0 name: "${r0.result.verses[0].name?.substring(0, 150)}"`)
      console.log(`  highlight=1 name: "${r1.result.verses[0].name?.substring(0, 150)}"`)
      console.log(`  highlight=0 has <em>: ${r0.result.verses[0].name?.includes('<em>')}`)
      console.log(`  highlight=1 has <em>: ${r1.result.verses[0].name?.includes('<em>')}`)
    }
  }

  sub('5c: get_text=0 vs get_text=1')
  {
    const r0 = await searchAPI('الرحمن', { get_text: 0 })
    const r1 = await searchAPI('الرحمن', { get_text: 1 })
    
    if (r0.result.verses.length > 0 && r1.result.verses.length > 0) {
      console.log(`  get_text=0 fields: ${Object.keys(r0.result.verses[0]).join(', ')}`)
      console.log(`  get_text=1 fields: ${Object.keys(r1.result.verses[0]).join(', ')}`)
      console.log(`  get_text=0 arabic: "${r0.result.verses[0].arabic?.substring(0, 100) || 'MISSING'}"`)
      console.log(`  get_text=1 arabic: "${r1.result.verses[0].arabic?.substring(0, 100) || 'MISSING'}"`)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 6: Quick mode vs Advanced mode
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 6: Quick mode vs Advanced mode')

  sub('6a: Quick mode for فوزا')
  {
    const r = await searchAPI('فوزا', { mode: 'quick' })
    console.log(`  Quick mode results: ${r.pagination.total_records}`)
    console.log(`  Navigation: ${r.result.navigation?.length || 0} items`)
    console.log(`  Verses: ${r.result.verses?.length || 0} items`)
    for (const v of (r.result.verses || []).slice(0, 3)) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  sub('6b: Advanced mode for فوزا')
  {
    const r = await searchAPI('فوزا', { mode: 'advanced' })
    console.log(`  Advanced mode results: ${r.pagination.total_records}`)
    for (const v of r.result.verses.slice(0, 3)) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 7: Prefix handling — does the API handle Arabic prefixes?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 7: Arabic prefix handling')
  console.log('  In the app, user clicks a word like وَسُلَيْمَانَ (with و prefix)')
  console.log('  Does the API find سليمان variants when searching وسليمان?')

  for (const query of ['سليمان', 'وسليمان', 'لسليمان', 'ولسليمان']) {
    const r = await searchAPI(query)
    console.log(`\n  "${query}" → ${r.pagination.total_records} results`)
    for (const v of r.result.verses.slice(0, 3)) {
      const h = parseHighlights(v.name)
      console.log(`    ${v.key} — highlighted: [${h.highlightedWords.join(', ')}]`)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 8: Tashkeel handling — does the API handle diacritics?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 8: Tashkeel handling')
  console.log('  In the app, the query comes from text_imlaei (WITH tashkeel)')
  console.log('  Does the API handle tashkeel or do we need to strip it first?')

  const tashkeelTests = [
    { raw: 'سُلَيْمَانَ', stripped: 'سليمان' },
    { raw: 'فَوْزًا', stripped: 'فوزا' },
    { raw: 'يَضْرِبَ', stripped: 'يضرب' },
    { raw: 'الصِّيَامُ', stripped: 'الصيام' },
  ]

  for (const t of tashkeelTests) {
    const rRaw = await searchAPI(t.raw)
    const rStripped = await searchAPI(t.stripped)
    const same = rRaw.pagination.total_records === rStripped.pagination.total_records
    console.log(`  "${t.raw}" → ${rRaw.pagination.total_records} | "${t.stripped}" → ${rStripped.pagination.total_records} ${same ? '✅ same' : '❌ DIFFERENT'}`)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 9: Side-by-side comparison — Package vs API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('TEST 9: Side-by-side — Package vs API result counts')

  const comparisons = [
    { query: 'فوزا', pkgExact: 3, pkgLemma: 119 },
    { query: 'المشرك', pkgExact: 0, pkgLemma: 0 },
    { query: 'المشركين', pkgExact: 28, pkgLemma: 43 },
    { query: 'يضرب', pkgExact: 9, pkgLemma: 54 },
    { query: 'الصيام', pkgExact: 2, pkgLemma: 1841 },
    { query: 'الرحمن', pkgExact: null, pkgLemma: null },
    { query: 'الله', pkgExact: null, pkgLemma: null },
  ]

  console.log(`  ${'Query'.padEnd(15)} | ${'API'.padEnd(8)} | ${'API exact'.padEnd(10)} | ${'Pkg exact'.padEnd(10)} | ${'Pkg lemma'.padEnd(10)}`)
  console.log(`  ${'-'.repeat(15)} | ${'-'.repeat(8)} | ${'-'.repeat(10)} | ${'-'.repeat(10)} | ${'-'.repeat(10)}`)

  for (const c of comparisons) {
    const rApi = await searchAPI(c.query)
    const rApiExact = await searchAPI(c.query, { exact_matches_only: true })
    const pkgE = c.pkgExact !== null ? String(c.pkgExact) : '?'
    const pkgL = c.pkgLemma !== null ? String(c.pkgLemma) : '?'
    console.log(`  ${c.query.padEnd(15)} | ${String(rApi.pagination.total_records).padEnd(8)} | ${String(rApiExact.pagination.total_records).padEnd(10)} | ${pkgE.padEnd(10)} | ${pkgL.padEnd(10)}`)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('DONE')
  console.log('  Review the output above to compare API vs package behavior.\n')
}

main().catch(console.error)
