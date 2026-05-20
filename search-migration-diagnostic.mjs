/**
 * search-migration-diagnostic.mjs
 * 
 * Comprehensive diagnostic to understand the quran.com Search API behavior
 * mapped to our exact app flows, so we can plan the migration.
 * 
 * APP FLOWS:
 * 1. Single word click → lemma search (default)
 * 2. Multi-word click (adjacent) → regex search
 * 3. Multi-word click (free/non-adjacent) → space-joined lemma search
 * 
 * API QUESTIONS:
 * - Does the API do lemma/morphological matching?
 * - Does it handle prefixed words (وسليمان → سليمان)?
 * - Does it enforce adjacency for multi-word queries?
 * - How does highlight=1 work — what gets <em> and what doesn't?
 * - What's the result ordering? Score-based?
 * - How does exact_matches_only change behavior?
 * - What's the pagination/cap behavior?
 * - Can we distinguish "exact match" from "related" results?
 * 
 * Run: node search-migration-diagnostic.mjs
 */

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
  const params = new URLSearchParams({ mode: 'advanced', query, highlight: '1', get_text: '1' })
  if (opts.exact_matches_only) params.set('exact_matches_only', '1')
  if (opts.size) params.set('size', String(opts.size))
  if (opts.page) params.set('page', String(opts.page))
  if (opts.highlight !== undefined) params.set('highlight', String(opts.highlight))
  const res = await fetch(`${SEARCH_BASE}?${params}`, {
    headers: { 'x-auth-token': token, 'x-client-id': CLIENT_ID },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json()
}

function parseEm(name) {
  if (!name) return { highlighted: [], hasEm: false, text: '' }
  const highlighted = []
  let m, re = /<em>(.*?)<\/em>/g
  while ((m = re.exec(name)) !== null) highlighted.push(m[1])
  return { highlighted, hasEm: highlighted.length > 0, text: name.replace(/<\/?em>/g, '') }
}

function header(t) { console.log(`\n${'═'.repeat(80)}\n  ${t}\n${'═'.repeat(80)}`) }
function sub(t) { console.log(`\n  ── ${t} ──`) }

async function main() {
  console.log('Getting search token...')
  await getSearchToken()
  console.log('Ready.\n')

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 1: Does the API do lemma/morphological matching?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('PART 1: Does the API do lemma/morphological matching?')
  console.log('  If the API only does text matching, searching "سليمان" would only find')
  console.log('  verses with that exact token. If it does lemma matching, it would also')
  console.log('  find verses with related forms.\n')

  // Test 1a: سليمان — exists as-is in Quran (9 verses exact)
  // Package lemma finds 16 (includes verses where سليمان appears via lemma connection)
  sub('1a: سليمان — how many results? (pkg exact=9, pkg lemma=16)')
  {
    const r = await searchAPI('سليمان', { size: 50 })
    const withEm = r.result.verses.filter(v => parseEm(v.name).hasEm)
    const withoutEm = r.result.verses.filter(v => !parseEm(v.name).hasEm)
    console.log(`  Total: ${r.pagination.total_records}`)
    console.log(`  With <em> (text match): ${withEm.length}`)
    console.log(`  Without <em> (semantic/related): ${withoutEm.length}`)
    
    // What forms are highlighted?
    const allForms = new Set()
    for (const v of withEm) parseEm(v.name).highlighted.forEach(h => allForms.add(h))
    console.log(`  Highlighted forms: [${[...allForms].join(', ')}]`)
    
    // Show some without-em results to understand what they are
    if (withoutEm.length > 0) {
      console.log(`  Non-highlighted results (first 5):`)
      for (const v of withoutEm.slice(0, 5)) {
        console.log(`    ${v.key} — "${parseEm(v.name).text.substring(0, 80)}"`)
      }
    }
  }

  // Test 1b: ضرب — a root/lemma that appears in many verb forms
  sub('1b: ضرب (root) — does the API find verb conjugations?')
  {
    const r = await searchAPI('ضرب', { size: 50 })
    const withEm = r.result.verses.filter(v => parseEm(v.name).hasEm)
    const allForms = new Set()
    for (const v of withEm) parseEm(v.name).highlighted.forEach(h => allForms.add(h))
    console.log(`  Total: ${r.pagination.total_records}`)
    console.log(`  With <em>: ${withEm.length}`)
    console.log(`  Highlighted forms: [${[...allForms].join(', ')}]`)
    console.log(`  → Does it find يضرب, اضرب, ضربت, etc.?`)
  }

  // Test 1c: صيام vs الصيام — does the API expand to related forms?
  sub('1c: صيام vs الصيام — morphological expansion?')
  {
    const r1 = await searchAPI('صيام', { size: 50 })
    const r2 = await searchAPI('الصيام', { size: 50 })
    const r3 = await searchAPI('صوم', { size: 50 })
    console.log(`  "صيام":   ${r1.pagination.total_records} results`)
    console.log(`  "الصيام": ${r2.pagination.total_records} results`)
    console.log(`  "صوم":    ${r3.pagination.total_records} results`)
    
    // Check overlap
    const keys1 = new Set(r1.result.verses.map(v => v.key))
    const keys2 = new Set(r2.result.verses.map(v => v.key))
    const overlap = [...keys1].filter(k => keys2.has(k))
    console.log(`  Overlap between صيام and الصيام: ${overlap.length} verses`)
  }

  // Test 1d: مشرك vs المشركين — singular vs plural
  sub('1d: مشرك vs المشركين — does API handle singular→plural?')
  {
    const r1 = await searchAPI('مشرك', { size: 50 })
    const r2 = await searchAPI('المشركين', { size: 50 })
    const r3 = await searchAPI('المشرك', { size: 50 })
    console.log(`  "مشرك":     ${r1.pagination.total_records} results`)
    console.log(`  "المشركين": ${r2.pagination.total_records} results`)
    console.log(`  "المشرك":   ${r3.pagination.total_records} results`)
    
    // What forms get highlighted for each?
    for (const [q, r] of [['مشرك', r1], ['المشركين', r2], ['المشرك', r3]]) {
      const forms = new Set()
      for (const v of r.result.verses) parseEm(v.name).highlighted.forEach(h => forms.add(h))
      console.log(`  "${q}" highlighted forms: [${[...forms].join(', ') || 'NONE'}]`)
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 2: Prefix handling — the core word-click scenario
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('PART 2: Prefix handling — word click scenario')
  console.log('  When user clicks وَسُلَيْمَانَ, the query is "وسليمان".')
  console.log('  Does the API strip the prefix and find سليمان results?')
  console.log('  Or does it only find verses with the exact prefixed form?\n')

  const prefixTests = [
    { bare: 'سليمان', prefixed: 'وسليمان', prefix: 'و' },
    { bare: 'سليمان', prefixed: 'لسليمان', prefix: 'ل' },
    { bare: 'سليمان', prefixed: 'ولسليمان', prefix: 'ول' },
    { bare: 'الله', prefixed: 'بالله', prefix: 'ب' },
    { bare: 'الله', prefixed: 'والله', prefix: 'و' },
    { bare: 'الله', prefixed: 'لله', prefix: 'ل' },
    { bare: 'الكتاب', prefixed: 'والكتاب', prefix: 'و' },
    { bare: 'الكتاب', prefixed: 'بالكتاب', prefix: 'ب' },
    { bare: 'موسى', prefixed: 'وموسى', prefix: 'و' },
    { bare: 'موسى', prefixed: 'لموسى', prefix: 'ل' },
  ]

  for (const t of prefixTests) {
    const rBare = await searchAPI(t.bare, { size: 5 })
    const rPrefixed = await searchAPI(t.prefixed, { size: 5 })
    
    const bareForms = new Set()
    for (const v of rBare.result.verses) parseEm(v.name).highlighted.forEach(h => bareForms.add(h))
    const prefixedForms = new Set()
    for (const v of rPrefixed.result.verses) parseEm(v.name).highlighted.forEach(h => prefixedForms.add(h))

    console.log(`  "${t.bare}" → ${rBare.pagination.total_records} results | "${t.prefixed}" → ${rPrefixed.pagination.total_records} results`)
    console.log(`    Bare highlights: [${[...bareForms].join(', ').substring(0, 100)}]`)
    console.log(`    Prefixed highlights: [${[...prefixedForms].join(', ').substring(0, 100)}]`)
    
    // Key question: does the prefixed search find the bare form?
    const prefixedFindsbare = rPrefixed.result.verses.some(v => {
      const h = parseEm(v.name).highlighted
      return h.some(w => !w.includes(t.prefix)) // highlighted word doesn't have the prefix
    })
    console.log(`    Prefixed query finds bare form: ${prefixedFindsbare ? '✅ YES' : '❌ NO'}`)
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 3: Multi-word queries — adjacency behavior
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('PART 3: Multi-word queries — does the API enforce adjacency?')
  console.log('  In the app, selecting 2+ adjacent words does a regex search')
  console.log('  that enforces the words appear next to each other.')
  console.log('  Does the API do the same, or does it just require both words in the verse?\n')

  const adjacencyTests = [
    {
      query: 'سبيل الله',
      desc: 'Common adjacent phrase',
      // A verse where both words exist but NOT adjacent would prove non-adjacency
    },
    {
      query: 'يوم القيامة',
      desc: 'Common adjacent phrase',
    },
    {
      query: 'الله الرحمن',
      desc: 'May appear adjacent or separate',
    },
    {
      query: 'من الله',
      desc: 'Very common words — many non-adjacent occurrences',
    },
  ]

  for (const t of adjacencyTests) {
    sub(t.desc + ': "' + t.query + '"')
    const r = await searchAPI(t.query, { size: 50 })
    
    // For each result, check if the highlighted words are in a single <em> block
    // (adjacent) or multiple separate <em> blocks (non-adjacent)
    let adjacentCount = 0
    let separateCount = 0
    let noEmCount = 0
    
    for (const v of r.result.verses) {
      const emBlocks = v.name?.match(/<em>.*?<\/em>/g) || []
      if (emBlocks.length === 0) {
        noEmCount++
      } else if (emBlocks.length === 1) {
        // Single block — could be adjacent or just one word matched
        const content = emBlocks[0].replace(/<\/?em>/g, '')
        const wordCount = content.trim().split(/\s+/).length
        if (wordCount >= 2) adjacentCount++ // multiple words in one <em> = adjacent
        else separateCount++ // single word highlighted
      } else {
        separateCount++ // multiple <em> blocks = words highlighted separately
      }
    }

    console.log(`  Total: ${r.pagination.total_records}`)
    console.log(`  Adjacent (multi-word in single <em>): ${adjacentCount}`)
    console.log(`  Separate (single word or split <em>): ${separateCount}`)
    console.log(`  No <em>: ${noEmCount}`)

    // Show examples of each type
    for (const v of r.result.verses.slice(0, 3)) {
      const emBlocks = v.name?.match(/<em>.*?<\/em>/g) || []
      const blockTexts = emBlocks.map(b => b.replace(/<\/?em>/g, ''))
      console.log(`    ${v.key} — <em> blocks: ${emBlocks.length} → [${blockTexts.join(' | ')}]`)
    }

    // Check: are there results where the words are NOT adjacent?
    // Look for results where the two query words are in separate <em> blocks
    const nonAdjacentExamples = r.result.verses.filter(v => {
      const emBlocks = v.name?.match(/<em>.*?<\/em>/g) || []
      return emBlocks.length >= 2 // multiple separate highlights = possibly non-adjacent
    })
    if (nonAdjacentExamples.length > 0) {
      console.log(`  ⚠️  ${nonAdjacentExamples.length} results with separate <em> blocks (possibly non-adjacent):`)
      for (const v of nonAdjacentExamples.slice(0, 3)) {
        const emBlocks = v.name?.match(/<em>.*?<\/em>/g) || []
        console.log(`    ${v.key} — [${emBlocks.map(b => b.replace(/<\/?em>/g, '')).join(' | ')}]`)
        // Show the full text to see if they're actually adjacent or not
        const clean = v.name?.replace(/<\/?em>/g, '') || ''
        console.log(`      Full: "${clean.substring(0, 120)}"`)
      }
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 4: Result ordering and the <em> split
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('PART 4: Result ordering — do <em> results come first?')
  console.log('  If the API returns highlighted results before non-highlighted ones,')
  console.log('  we can use that as a natural "exact match" vs "related" split.\n')

  const orderTests = ['سليمان', 'الصيام', 'المشركين', 'الأرض']

  for (const query of orderTests) {
    const r = await searchAPI(query, { size: 50 })
    
    // Track where the transition from <em> to no-<em> happens
    let lastEmIndex = -1
    let firstNoEmIndex = -1
    let emAfterNoEm = false
    
    r.result.verses.forEach((v, i) => {
      const hasEm = parseEm(v.name).hasEm
      if (hasEm) {
        lastEmIndex = i
        if (firstNoEmIndex >= 0) emAfterNoEm = true
      }
      if (!hasEm && firstNoEmIndex < 0) firstNoEmIndex = i
    })

    const withEm = r.result.verses.filter(v => parseEm(v.name).hasEm).length
    const withoutEm = r.result.verses.filter(v => !parseEm(v.name).hasEm).length

    console.log(`  "${query}": ${r.pagination.total_records} total | ${withEm} with <em> | ${withoutEm} without`)
    console.log(`    Last <em> at index: ${lastEmIndex} | First no-<em> at index: ${firstNoEmIndex}`)
    console.log(`    <em> results after no-<em>: ${emAfterNoEm ? '⚠️ YES (mixed ordering)' : '✅ NO (clean split)'}`)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 5: exact_matches_only — what does it actually do?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('PART 5: exact_matches_only — does it filter to only <em> results?')
  console.log('  If exact_matches_only removes the "related" results,')
  console.log('  it could be useful for getting only highlightable results.\n')

  for (const query of ['سليمان', 'الصيام', 'المشركين', 'المشرك', 'الأرض', 'يضرب']) {
    const rDefault = await searchAPI(query, { size: 50 })
    const rExact = await searchAPI(query, { size: 50, exact_matches_only: true })
    
    const defaultEm = rDefault.result.verses.filter(v => parseEm(v.name).hasEm).length
    const exactEm = rExact.result.verses.filter(v => parseEm(v.name).hasEm).length
    
    console.log(`  "${query}":`)
    console.log(`    Default: ${rDefault.pagination.total_records} total, ${defaultEm} with <em>`)
    console.log(`    Exact:   ${rExact.pagination.total_records} total, ${exactEm} with <em>`)
    console.log(`    Same? ${rDefault.pagination.total_records === rExact.pagination.total_records ? '✅ identical' : '❌ different'}`)
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 6: Pagination — can we get all results?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('PART 6: Pagination behavior')
  
  sub('6a: Default page size and max')
  {
    const r = await searchAPI('الله')
    console.log(`  "الله" — total: ${r.pagination.total_records}, per_page: ${r.pagination.per_page}, total_pages: ${r.pagination.total_pages}`)
    console.log(`  current_page: ${r.pagination.current_page}, next_page: ${r.pagination.next_page}`)
    console.log(`  Verses returned: ${r.result.verses.length}`)
  }

  sub('6b: Custom size')
  {
    const r = await searchAPI('الله', { size: 5 })
    console.log(`  size=5 — total: ${r.pagination.total_records}, per_page: ${r.pagination.per_page}, returned: ${r.result.verses.length}`)
  }

  sub('6c: Page 2')
  {
    const r1 = await searchAPI('سليمان', { size: 10, page: 1 })
    const r2 = await searchAPI('سليمان', { size: 10, page: 2 })
    console.log(`  Page 1: ${r1.result.verses.length} verses, keys: [${r1.result.verses.map(v => v.key).join(', ')}]`)
    console.log(`  Page 2: ${r2.result.verses.length} verses, keys: [${r2.result.verses.map(v => v.key).join(', ')}]`)
    
    // Check for overlap
    const keys1 = new Set(r1.result.verses.map(v => v.key))
    const overlap = r2.result.verses.filter(v => keys1.has(v.key))
    console.log(`  Overlap: ${overlap.length} (should be 0)`)
    
    // Do page 2 results have <em>?
    const p2Em = r2.result.verses.filter(v => parseEm(v.name).hasEm).length
    console.log(`  Page 2 with <em>: ${p2Em}/${r2.result.verses.length}`)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 7: The <em> tag format — word-level or phrase-level?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('PART 7: <em> tag format — word-level or phrase-level?')
  console.log('  We need to know if <em> wraps individual words or phrases')
  console.log('  to map them back to our word-level highlighting system.\n')

  const emFormatTests = [
    { query: 'الرحمن الرحيم', desc: '2-word phrase' },
    { query: 'سليمان', desc: 'single word, multiple occurrences in verse' },
    { query: 'بسم الله الرحمن', desc: '3-word phrase' },
    { query: 'الله', desc: 'very common single word' },
  ]

  for (const t of emFormatTests) {
    sub(`"${t.query}" (${t.desc})`)
    const r = await searchAPI(t.query, { size: 5 })
    
    for (const v of r.result.verses.slice(0, 3)) {
      const emBlocks = v.name?.match(/<em>.*?<\/em>/g) || []
      console.log(`  ${v.key}:`)
      console.log(`    <em> blocks (${emBlocks.length}):`)
      for (const block of emBlocks) {
        const content = block.replace(/<\/?em>/g, '')
        const words = content.trim().split(/\s+/)
        console.log(`      "${content}" (${words.length} word${words.length > 1 ? 's' : ''})`)
      }
      // Show the raw name to see the exact <em> placement
      console.log(`    Raw: "${v.name?.substring(0, 150)}"`)
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 8: Mapping to our app flows
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('PART 8: Simulating exact app flows with the API')

  // Flow 1: Single word click (lemma mode in current app)
  sub('Flow 1: Single word click — current app uses lemma, API uses...?')
  console.log('  Simulating: user clicks a word → we send text_imlaei to API')
  {
    const clicks = [
      { imlaei: 'فَوْزًا', desc: 'noun' },
      { imlaei: 'يَضْرِبَ', desc: 'verb' },
      { imlaei: 'سُلَيْمَانَ', desc: 'proper name' },
      { imlaei: 'وَسُلَيْمَانَ', desc: 'prefixed name' },
      { imlaei: 'الصِّيَامُ', desc: 'noun with article' },
      { imlaei: 'الْمُشْرِكِينَ', desc: 'plural noun' },
    ]

    for (const c of clicks) {
      const r = await searchAPI(c.imlaei, { size: 20 })
      const withEm = r.result.verses.filter(v => parseEm(v.name).hasEm)
      const withoutEm = r.result.verses.filter(v => !parseEm(v.name).hasEm)
      
      console.log(`\n  Click "${c.imlaei}" (${c.desc}):`)
      console.log(`    Total: ${r.pagination.total_records} | Highlighted: ${withEm.length} | Related: ${withoutEm.length}`)
      
      // For our app: highlighted = auto-add to graph, related = discovery panel
      console.log(`    → Graph nodes (highlighted): ${Math.min(withEm.length, 3)} of ${withEm.length}`)
      console.log(`    → Discovery panel (all): ${r.pagination.total_records}`)
    }
  }

  // Flow 2: Multi-word adjacent click
  sub('Flow 2: Multi-word adjacent click — current app uses regex')
  console.log('  Simulating: user selects 2-3 adjacent words → we send space-joined to API')
  {
    const multiClicks = [
      { words: ['الرَّحْمَـٰنِ', 'الرَّحِيمِ'], desc: '2 words' },
      { words: ['سَبِيلِ', 'اللَّهِ'], desc: '2 words' },
      { words: ['بِسْمِ', 'اللَّهِ', 'الرَّحْمَـٰنِ'], desc: '3 words' },
    ]

    for (const mc of multiClicks) {
      const query = mc.words.join(' ')
      const r = await searchAPI(query, { size: 20 })
      const withEm = r.result.verses.filter(v => parseEm(v.name).hasEm)
      
      // Check if highlighted results have the words adjacent
      let adjacentHighlights = 0
      for (const v of withEm) {
        const emBlocks = v.name?.match(/<em>.*?<\/em>/g) || []
        const hasMultiWordBlock = emBlocks.some(b => b.replace(/<\/?em>/g, '').trim().split(/\s+/).length >= 2)
        if (hasMultiWordBlock) adjacentHighlights++
      }

      console.log(`\n  Select "${query}" (${mc.desc}):`)
      console.log(`    Total: ${r.pagination.total_records} | Highlighted: ${withEm.length} | Adjacent highlights: ${adjacentHighlights}`)
      console.log(`    → For adjacent search: ${adjacentHighlights > 0 ? '✅ API finds adjacent matches' : '❌ API does not enforce adjacency'}`)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  header('DONE')
  console.log('  Review the output to understand API behavior for migration planning.\n')
}

main().catch(console.error)
