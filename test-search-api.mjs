/**
 * Test the Quran.Foundation Search API
 *
 * Tests:
 * 1. Can we get a token with 'search' scope?
 * 2. What does the search API return for Arabic queries?
 * 3. Does it support lemma-like matching or only exact?
 * 4. What highlighting data comes back?
 *
 * Run: node test-search-api.mjs
 */

// ── Credentials from .env (prod) ────────────────────────────────────────────
const CLIENT_ID = 'b7b6879f-edba-40a0-bafa-58b495810701'
const CLIENT_SECRET = '4TbsSZk~-yK8PU3EndkhAEL6tf'
const AUTH_ENDPOINT = 'https://oauth2.quran.foundation/oauth2/token'
const SEARCH_BASE = 'https://apis.quran.foundation/search'

// ── Get token ────────────────────────────────────────────────────────────────
async function getToken(scope) {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch(AUTH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.log(`Token request failed (scope="${scope}"): ${res.status} ${text}`)
    return null
  }
  const json = await res.json()
  console.log(`✅ Got token for scope="${scope}" (expires in ${json.expires_in}s)`)
  return json.access_token
}

// ── Search helper ────────────────────────────────────────────────────────────
async function searchQuran(token, query, opts = {}) {
  const params = new URLSearchParams({
    mode: opts.mode || 'advanced',
    query,
    highlight: opts.highlight ?? '1',
    get_text: opts.getText ?? '1',
    size: String(opts.size || 20),
    page: String(opts.page || 1),
  })
  if (opts.exactMatchesOnly) params.set('exact_matches_only', '1')

  const url = `${SEARCH_BASE}/v1/search?${params}`
  const res = await fetch(url, {
    headers: {
      'x-auth-token': token,
      'x-client-id': CLIENT_ID,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    console.log(`Search failed: ${res.status} ${text}`)
    return null
  }
  return res.json()
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Step 1: Try getting a search-scoped token
  console.log('='.repeat(70))
  console.log('STEP 1: Token acquisition')
  console.log('='.repeat(70))

  const searchToken = await getToken('search')
  if (!searchToken) {
    console.log('\n❌ Cannot get search token. Trying with content scope...')
    const contentToken = await getToken('content')
    if (!contentToken) {
      console.log('❌ Cannot get any token. Exiting.')
      return
    }
    console.log('Trying search with content token...')
    const testResult = await searchQuran(contentToken, 'الرحمن')
    if (testResult) {
      console.log('Content token works for search!')
    } else {
      console.log('Content token does not work for search.')
      return
    }
  }

  const token = searchToken

  // Step 2: Test queries
  const TEST_QUERIES = [
    {
      query: 'وسليمان',
      description: 'Sulayman with و prefix — does it find lemma variants?',
      opts: {},
    },
    {
      query: 'سليمان',
      description: 'Sulayman bare — does it find prefixed forms?',
      opts: {},
    },
    {
      query: 'سليمان',
      description: 'Sulayman exact only',
      opts: { exactMatchesOnly: true },
    },
    {
      query: 'الرحمن الرحيم',
      description: 'Adjacent divine names',
      opts: {},
    },
    {
      query: 'يطع الله',
      description: 'Adjacent verb+noun',
      opts: {},
    },
  ]

  for (const tc of TEST_QUERIES) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`QUERY: "${tc.query}" — ${tc.description}`)
    console.log(`Options: ${JSON.stringify(tc.opts)}`)
    console.log('='.repeat(70))

    const result = await searchQuran(token, tc.query, tc.opts)
    if (!result) continue

    // Pagination
    const pagination = result.pagination || {}
    console.log(`\nTotal results: ${pagination.totalRecords ?? '?'}`)
    console.log(`Page ${pagination.currentPage ?? '?'} of ${pagination.totalPages ?? '?'}`)

    // Navigation results
    const nav = result.result?.navigation || []
    if (nav.length > 0) {
      console.log(`\nNavigation results: ${nav.length}`)
      nav.slice(0, 3).forEach(n => {
        console.log(`  ${n.resultType}: ${n.key} — ${n.name}`)
      })
    }

    // Verse results
    const verses = result.result?.verses || []
    console.log(`\nVerse results: ${verses.length}`)

    verses.slice(0, 8).forEach((v, i) => {
      console.log(`\n  --- Result #${i + 1} ---`)
      console.log(`  Key: ${v.key}`)
      console.log(`  Name/text: ${v.name}`)
      if (v.arabic) console.log(`  Arabic: ${v.arabic}`)
      if (v.text) console.log(`  Text: ${v.text}`)
      if (v.highlighted) console.log(`  Highlighted: ${v.highlighted}`)

      // Log all fields to see what's available
      const keys = Object.keys(v)
      const extraKeys = keys.filter(k => !['key', 'name', 'arabic', 'text', 'highlighted', 'resultType', 'isArabic', 'isTransliteration'].includes(k))
      if (extraKeys.length > 0) {
        console.log(`  Extra fields: ${extraKeys.join(', ')}`)
        extraKeys.forEach(k => {
          const val = JSON.stringify(v[k])
          console.log(`    ${k}: ${val.length > 100 ? val.substring(0, 100) + '...' : val}`)
        })
      }
    })
  }
}

main().catch(console.error)
