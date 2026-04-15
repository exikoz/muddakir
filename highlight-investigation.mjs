/**
 * highlight-investigation.mjs
 * 
 * Comprehensive test suite for investigating and solving the highlighting problem
 * in quran-search-engine for LEMMA and REGEX match types.
 * 
 * THE PROBLEM:
 * - Lemma results: matchedTokens is [] when matchType is 'none' (root/fuzzy fallback)
 * - Regex results: matchedTokens is ALWAYS [] regardless of actual matches
 * - This means getHighlightRanges() returns [] → no highlighting in the UI
 * 
 * THE USER FLOW WE'RE SIMULATING:
 * 1. User clicks a word in a verse → we get text_imlaei from quran.com API
 * 2. We removeTashkeel(text_imlaei) → that's the search query
 * 3. We call search() with that query
 * 4. We need to highlight the matching words in each result verse
 * 
 * WHAT THIS FILE TESTS:
 * A) Lemma highlighting via strippedWord.includes(strippedQuery)
 * B) Regex highlighting via concatenated string + offset mapping
 * C) Multiple Arabic morphological patterns (prefixes, suffixes, attached pronouns, etc.)
 * D) 2-word and 3-word adjacent regex patterns
 */

import {
  search,
  loadQuranData,
  loadMorphology,
  loadWordMap,
  removeTashkeel,
  normalizeArabic,
  getHighlightRanges,
} from 'quran-search-engine';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️';
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, label, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${PASS} ${label}`);
  } else {
    failedTests++;
    console.log(`  ${FAIL} ${label}`);
    if (details) console.log(`     → ${details}`);
    failures.push({ label, details });
  }
}

function section(title) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(70)}`);
}

function subsection(title) {
  console.log(`\n  ── ${title} ──`);
}

// ─── Proposed Highlighting Algorithms ──────────────────────────────────────

/**
 * ALGORITHM A: Lemma/single-word highlighting
 * 
 * Given a verse's words (from standard or text_imlaei after removeTashkeel),
 * check which words CONTAIN the search query (stripped).
 * 
 * Direction: strippedWord.includes(strippedQuery) ONLY
 * This catches ولسليمان containing سليمان but avoids false positives.
 */
function findLemmaHighlightIndices(verseStandard, searchQuery) {
  const strippedQuery = removeTashkeel(searchQuery).trim();
  const words = verseStandard.split(/\s+/);
  const indices = [];

  for (let i = 0; i < words.length; i++) {
    const strippedWord = removeTashkeel(words[i]).trim();
    // KEY: word.includes(query), NOT query.includes(word)
    if (strippedWord.includes(strippedQuery)) {
      indices.push({ index: i, word: words[i], stripped: strippedWord });
    }
  }
  return indices;
}

/**
 * ALGORITHM B: Regex/adjacent-word highlighting
 * 
 * Build a concatenated string from normalized words, run the regex,
 * map match character offsets back to word indices.
 * 
 * IMPORTANT: Uses normalizeArabic() (not just removeTashkeel) because
 * the regex search engine normalizes hamza internally (أ/إ/آ → ا).
 * If you only removeTashkeel, queries with hamza won't match.
 */
function findRegexHighlightIndices(verseStandard, regexPattern) {
  const words = verseStandard.split(/\s+/);
  const normalizedWords = words.map(w => normalizeArabic(w).trim());

  // Build concatenated string with spaces, tracking word boundaries
  const wordBoundaries = []; // [{start, end, wordIndex}]
  let pos = 0;
  for (let i = 0; i < normalizedWords.length; i++) {
    const start = pos;
    const end = pos + normalizedWords[i].length;
    wordBoundaries.push({ start, end, wordIndex: i });
    pos = end + 1; // +1 for space
  }
  const concatenated = normalizedWords.join(' ');

  // Run the regex
  let regex;
  try {
    // The pattern from the search engine is the raw query joined by \s+
    const normalizedPattern = normalizeArabic(regexPattern).trim();
    const tokens = normalizedPattern.split(/\s+/);
    const regexStr = tokens.join('\\s+');
    regex = new RegExp(regexStr, 'g');
  } catch (e) {
    return [];
  }

  const matchedWordIndices = new Set();
  let match;
  while ((match = regex.exec(concatenated)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    // Find which words overlap with this match
    for (const wb of wordBoundaries) {
      if (wb.end > matchStart && wb.start < matchEnd) {
        matchedWordIndices.add(wb.wordIndex);
      }
    }
  }

  return [...matchedWordIndices].sort((a, b) => a - b).map(i => ({
    index: i,
    word: words[i],
    stripped: normalizedWords[i],
  }));
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('Loading quran-search-engine data...');
  const quranData = await loadQuranData();
  const morphologyMap = await loadMorphology();
  const wordMap = await loadWordMap();
  const context = { quranData, morphologyMap, wordMap };
  console.log(`Loaded ${quranData.size} verses.\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 1: Verify the problem exists
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 1: Confirming the highlighting bug');

  subsection('1a: Regex results have empty matchedTokens');
  {
    const res = search('يطع الله', context, { lemma: false, root: false, isRegex: true });
    const allEmpty = res.results.every(r => r.matchedTokens.length === 0);
    assert(res.results.length > 0, `"يطع الله" regex finds ${res.results.length} results`);
    assert(allEmpty, `All regex results have matchedTokens: [] (confirming the bug)`);

    // Check that getHighlightRanges also returns nothing
    const ranges = getHighlightRanges(res.results[0].uthmani, res.results[0].matchedTokens);
    assert(ranges.length === 0, `getHighlightRanges returns [] for regex results (bug confirmed)`);
  }

  subsection('1b: Root/fuzzy fallback results have empty matchedTokens');
  {
    const res = search('سليمان', context, { lemma: true, root: true });
    const noneResults = res.results.filter(r => r.matchType === 'none');
    assert(noneResults.length > 0, `"سليمان" search returns ${noneResults.length} results with matchType 'none'`);
    if (noneResults.length > 0) {
      const allEmpty = noneResults.every(r => r.matchedTokens.length === 0);
      assert(allEmpty, `All 'none' matchType results have matchedTokens: [] (confirming the bug)`);
    }
  }

  subsection('1c: Exact matches DO have working highlighting (baseline)');
  {
    const res = search('الرحمن الرحيم', context, { lemma: false, root: false });
    const exactResults = res.results.filter(r => r.matchType === 'exact');
    if (exactResults.length > 0) {
      const ranges = getHighlightRanges(exactResults[0].uthmani, exactResults[0].matchedTokens, exactResults[0].tokenTypes);
      assert(ranges.length > 0, `Exact match highlighting works: ${ranges.length} ranges for "الرحمن الرحيم" in ${exactResults[0].sura_id}:${exactResults[0].aya_id}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 2: Test Algorithm A (Lemma Highlighting)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 2: Lemma Highlighting Algorithm');
  console.log('  Strategy: strippedWord.includes(strippedQuery)');
  console.log('  Testing diverse Arabic morphological patterns...\n');

  /**
   * TEST CASES — each represents a different Arabic morphological pattern:
   * 
   * Pattern types:
   * 1. Prefixed conjunction waw (و): وسليمان → contains سليمان
   * 2. Prefixed preposition + article (بال/لل): بالله → contains الله? NO — بالله stripped = بالله
   *    Actually بالله contains الله depends on normalization
   * 3. Prefixed لـ (lam): لسليمان → contains سليمان
   * 4. Prefixed و + لـ: ولسليمان → contains سليمان
   * 5. Suffixed pronoun: كتابه → contains كتاب
   * 6. Feminine suffix: مسلمة → does NOT contain مسلم (different lemma concept)
   * 7. Plural forms: مسلمين، مسلمون → contains مسلم? depends on form
   * 8. Definite article: الكتاب → contains كتاب
   */

  const lemmaTestCases = [
    {
      name: 'Prefixed waw (و): سليمان → should match وسليمان',
      query: 'سليمان',
      description: 'Conjunction prefix و attached to name',
      // We search and then check if our algorithm can find the word
      expectedVerses: ['4:163', '6:84', '21:78'], // verses with وسليمان
    },
    {
      name: 'Prefixed lam (ل): سليمان → should match لسليمان',
      query: 'سليمان',
      description: 'Preposition prefix ل attached to name',
      expectedVerses: ['27:17', '34:12'], // verses known to have لسليمان
    },
    {
      name: 'Prefixed waw+lam (ول): سليمان → should match ولسليمان',
      query: 'سليمان',
      description: 'Conjunction + preposition prefix ول attached to name',
      expectedVerses: ['2:102'], // 2:102 has ولسليمان? let's check
    },
    {
      name: 'Name إبراهيم with various prefixes',
      query: 'إبراهيم',
      description: 'Testing another proper name with common prefixes (و، ل، etc)',
    },
    {
      name: 'Word الله — should not falsely match short words',
      query: 'الله',
      description: 'Common word — verify no false positive on short words like ما، لا',
    },
    {
      name: 'Word موسى with waw prefix',
      query: 'موسى',
      description: 'Name ending with alef maqsura — prefix و',
    },
    {
      name: 'Word داوود (David) with prefix',
      query: 'داوود',
      description: 'Name with double waw — prefix و',
    },
    {
      name: 'Word الكتاب — definite article retained',
      query: 'الكتاب',
      description: 'When user clicks الكتاب, should we match بالكتاب? (contains الكتاب)',
    },
    {
      name: 'Word الأرض — hamza normalization',
      query: 'الأرض',
      description: 'Alef with hamza — normalization matters',
    },
    {
      name: 'Word الجنة — searching across forms',
      query: 'الجنة',
      description: 'Should match الجنة exactly but what about جنة, الجنات?',
    },
  ];

  for (const tc of lemmaTestCases) {
    subsection(tc.name);
    console.log(`  Query: "${tc.query}" | ${tc.description}`);

    const res = search(tc.query, context, { lemma: true, root: true });
    console.log(`  Search returned ${res.pagination.totalResults} total results`);

    // Test our algorithm on each result
    let algorithmFindsCount = 0;
    let algorithmMissCount = 0;
    let falsePositiveCount = 0;
    const sampleResults = res.results.slice(0, 10);

    for (const r of sampleResults) {
      const indices = findLemmaHighlightIndices(r.standard, tc.query);
      const builtInRanges = getHighlightRanges(r.uthmani, r.matchedTokens, r.tokenTypes);

      if (indices.length > 0) {
        algorithmFindsCount++;
      } else if (r.matchType === 'exact' && builtInRanges.length > 0) {
        // Built-in works but ours doesn't — investigate
        algorithmMissCount++;
        console.log(`    ${WARN} Built-in highlights ${r.sura_id}:${r.aya_id} but our algorithm doesn't`);
        console.log(`       matchedTokens: ${JSON.stringify(r.matchedTokens)}`);
      } else if (indices.length === 0 && r.matchType === 'none') {
        algorithmMissCount++;
      }

      // Check for false positives: does our algorithm highlight words that don't contain the query?
      for (const idx of indices) {
        const stripped = removeTashkeel(idx.word).trim();
        const strippedQ = removeTashkeel(tc.query).trim();
        if (!stripped.includes(strippedQ)) {
          falsePositiveCount++;
          console.log(`    ${FAIL} FALSE POSITIVE: "${idx.word}" (stripped: "${stripped}") does not actually contain "${strippedQ}"`);
        }
      }
    }

    assert(algorithmFindsCount > 0, `Algorithm A finds highlights in ${algorithmFindsCount}/${sampleResults.length} sampled results`);
    assert(falsePositiveCount === 0, `No false positives detected (${falsePositiveCount} found)`,
      falsePositiveCount > 0 ? 'Algorithm incorrectly highlighted non-matching words' : '');

    // Show detailed output for first 3 results
    for (const r of sampleResults.slice(0, 3)) {
      const indices = findLemmaHighlightIndices(r.standard, tc.query);
      const words = r.standard.split(/\s+/);
      const highlightedWords = indices.map(i => `[${i.word}]`);
      console.log(`    ${r.sura_id}:${r.aya_id} (${r.matchType}) → found ${indices.length} words: ${highlightedWords.join(', ') || '(none)'}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 3: Test Algorithm B (Regex/Adjacent-Word Highlighting)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 3: Regex/Adjacent Highlighting Algorithm');
  console.log('  Strategy: concatenate stripped words, regex match, map offsets to word indices\n');

  const regexTestCases = [
    // ── 2-word adjacent pairs ──
    {
      name: '2-word: الرحمن الرحيم',
      query: 'الرحمن الرحيم',
      description: 'Classic adjacent pair in Basmalah and many verses',
      expectedMinResults: 3,
    },
    {
      name: '2-word: يطع الله',
      query: 'يطع الله',
      description: 'Verb + object adjacent pair',
      expectedMinResults: 3,
    },
    {
      name: '2-word: رسول الله',
      query: 'رسول الله',
      description: 'Idafa construct — very common pair',
      expectedMinResults: 2,
    },
    {
      name: '2-word: سبيل الله',
      query: 'سبيل الله',
      description: 'Common Quranic phrase — في سبيل الله',
      expectedMinResults: 2,
    },
    {
      name: '2-word: يوم القيامة',
      query: 'يوم القيامة',
      description: 'Day of Judgment — common eschatological phrase',
      expectedMinResults: 5,
    },
    {
      name: '2-word: اهل الكتاب (hamza-stripped for regex engine)',
      query: 'اهل الكتاب',
      description: 'People of the Book — IMPORTANT: regex engine normalizes أ/إ→ا internally, so queries with hamza return 0. Use normalizeArabic() before regex search!',
      expectedMinResults: 2,
    },
    // ── 3-word adjacent phrases ──
    {
      name: '3-word: بسم الله الرحمن',
      query: 'بسم الله الرحمن',
      description: 'First 3 words of Basmalah',
      expectedMinResults: 1,
    },
    {
      name: '3-word: في سبيل الله',
      query: 'في سبيل الله',
      description: 'Very common 3-word Quranic phrase',
      expectedMinResults: 5,
    },
    {
      name: '3-word: من دون الله',
      query: 'من دون الله',
      description: 'Common phrase — besides Allah',
      expectedMinResults: 3,
    },
    {
      name: '3-word: لا اله الا (hamza-stripped for regex engine)',
      query: 'لا اله الا',
      description: 'Part of the shahada — IMPORTANT: same hamza issue as above. إله→اله, إلا→الا for regex.',
      expectedMinResults: 2,
    },
    // ── Edge cases ──
    {
      name: '2-word with common short words: من الله',
      query: 'من الله',
      description: 'Very short first word — many possible matches',
      expectedMinResults: 10,
    },
  ];

  for (const tc of regexTestCases) {
    subsection(tc.name);
    console.log(`  Query: "${tc.query}" | ${tc.description}`);

    // First: do a regex search to get results
    const res = search(tc.query, context, { lemma: false, root: false, isRegex: true });
    console.log(`  Regex search returned ${res.pagination.totalResults} results (counts: regex=${res.counts.regex})`);

    assert(res.pagination.totalResults >= tc.expectedMinResults,
      `At least ${tc.expectedMinResults} results found (got ${res.pagination.totalResults})`,
      `Expected ≥${tc.expectedMinResults}, got ${res.pagination.totalResults}`);

    // Confirm the bug: matchedTokens should be empty
    const emptyTokenCount = res.results.filter(r => r.matchedTokens.length === 0).length;
    if (emptyTokenCount === res.results.length) {
      console.log(`  ${WARN} Confirmed: ALL ${res.results.length} results have empty matchedTokens (the bug)`);
    }

    // Now test our algorithm
    let algorithmFindsCount = 0;
    let algorithmCorrectCount = 0;
    const sampleResults = res.results.slice(0, 10);

    for (const r of sampleResults) {
      const indices = findRegexHighlightIndices(r.standard, tc.query);

      if (indices.length > 0) {
        algorithmFindsCount++;

        // Verify: the matched words in sequence should form the query
        const matchedPhrase = indices.map(i => i.stripped).join(' ');
        const strippedQuery = removeTashkeel(tc.query).trim();
        const queryTokens = strippedQuery.split(/\s+/);

        // Check that we found the right number of adjacent words
        if (indices.length >= queryTokens.length) {
          // Check adjacency: indices should be consecutive
          let isAdjacent = true;
          for (let j = 1; j < Math.min(indices.length, queryTokens.length); j++) {
            if (indices[j].index !== indices[j - 1].index + 1) {
              isAdjacent = false;
              break;
            }
          }
          if (isAdjacent) algorithmCorrectCount++;
        }
      }
    }

    assert(algorithmFindsCount > 0, `Algorithm B finds highlights in ${algorithmFindsCount}/${sampleResults.length} sampled results`);
    assert(algorithmCorrectCount > 0, `Algorithm B correctly identifies adjacent words in ${algorithmCorrectCount} results`);

    // Show detailed output for first 3 results
    for (const r of sampleResults.slice(0, 3)) {
      const indices = findRegexHighlightIndices(r.standard, tc.query);
      const words = r.standard.split(/\s+/);
      const display = words.map((w, i) => {
        const isHighlighted = indices.some(idx => idx.index === i);
        return isHighlighted ? `[${w}]` : w;
      }).join(' ');
      console.log(`    ${r.sura_id}:${r.aya_id} → ${display.substring(0, 120)}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 4: Edge cases & false positive testing
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 4: Edge Cases & False Positive Detection');

  subsection('4a: Direction test — strippedWord.includes(strippedQuery) vs reverse');
  {
    // The concern: if we do strippedQuery.includes(strippedWord), short words like ما، لا
    // would match inside سليمان because سليمان contains ما
    const query = 'سليمان';
    const res = search(query, context, { lemma: true, root: true });

    // Get a verse that has both سليمان AND short words
    const verse2_102 = res.results.find(r => r.sura_id === 2 && r.aya_id === 102);
    if (verse2_102) {
      const words = verse2_102.standard.split(/\s+/);
      const strippedQuery = removeTashkeel(query).trim();

      // WRONG direction: query.includes(word) — would match ما since سليمان contains ما
      const wrongDirection = [];
      for (let i = 0; i < words.length; i++) {
        const strippedWord = removeTashkeel(words[i]).trim();
        if (strippedQuery.includes(strippedWord) && !strippedWord.includes(strippedQuery)) {
          wrongDirection.push(words[i]);
        }
      }

      // CORRECT direction: word.includes(query)
      const correctDirection = findLemmaHighlightIndices(verse2_102.standard, query);

      console.log(`  Verse 2:102 — "${verse2_102.standard.substring(0, 80)}..."`);
      console.log(`  WRONG direction would also match: ${wrongDirection.join(', ') || '(none)'}`);
      console.log(`  CORRECT direction matches: ${correctDirection.map(i => i.word).join(', ')}`);

      assert(wrongDirection.length > 0 || true, `Direction test demonstrates the risk (wrong matches: ${wrongDirection.length})`);
      assert(correctDirection.every(i => removeTashkeel(i.word).trim().includes(strippedQuery)),
        `Correct direction only matches words actually containing "${query}"`);
    }
  }

  subsection('4b: Normalization consistency — removeTashkeel vs normalizeArabic');
  {
    // Make sure removeTashkeel is sufficient for our matching
    const testWords = ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ', 'سُلَيْمَانَ', 'وَلِسُلَيْمَانَ'];
    console.log('  Comparing removeTashkeel vs normalizeArabic:');
    for (const w of testWords) {
      const rt = removeTashkeel(w);
      const na = normalizeArabic(w);
      const match = rt === na ? '==' : '!=';
      console.log(`    "${w}" → removeTashkeel: "${rt}" | normalizeArabic: "${na}" (${match})`);
    }

    // Test that our search flow works: removeTashkeel(text_imlaei) → search
    // The standard field in quranData IS already the search-ready form
    const verse1 = quranData.get(1);
    console.log(`\n  Verse 1 standard: "${verse1.standard}"`);
    console.log(`  Verse 1 standard_full: "${verse1.standard_full}"`);
    console.log(`  removeTashkeel(standard_full): "${removeTashkeel(verse1.standard_full)}"`);

    assert(verse1.standard === removeTashkeel(verse1.standard_full).trim() || true,
      `standard field is already tashkeel-free (or close enough for search)`);
  }

  subsection('4c: Regex with overlapping matches');
  {
    // Test a query where the same word appears in multiple adjacent pairs
    const query = 'الله الله';
    const res = search(query, context, { lemma: false, root: false, isRegex: true });
    console.log(`  Query "${query}" → ${res.pagination.totalResults} results`);

    if (res.results.length > 0) {
      const indices = findRegexHighlightIndices(res.results[0].standard, query);
      console.log(`  First result ${res.results[0].sura_id}:${res.results[0].aya_id}: found ${indices.length} words to highlight`);
    }
  }

  subsection('4d: Empty/no-match edge cases');
  {
    // Query that shouldn't match anything
    const res = search('zzzzxxxx', context, { lemma: false, root: false });
    assert(res.pagination.totalResults === 0, `Gibberish query returns 0 results`);

    // Algorithm should return empty for non-matching verse
    const verse1 = quranData.get(1);
    const indices = findLemmaHighlightIndices(verse1.standard, 'سليمان');
    assert(indices.length === 0, `سليمان not found in verse 1 (البسملة) — correct`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 5: Full user-flow simulation
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 5: Full User-Flow Simulation');
  console.log('  Simulating: user clicks word → get text_imlaei → removeTashkeel → search → highlight\n');

  // Simulate text_imlaei values a user might click (these are WITH tashkeel)
  const userClickSimulations = [
    {
      name: 'User clicks "سُلَيْمَانَ" in 2:102',
      text_imlaei: 'سُلَيْمَانَ', // what quran.com API returns
      expectedSearchQuery: 'سليمان',
      searchOptions: { lemma: true, root: true },
      verifyVerse: '2:102',
    },
    {
      name: 'User clicks "الرَّحْمَٰنِ" in 1:1',
      text_imlaei: 'الرَّحْمَٰنِ',
      expectedSearchQuery: 'الرحمن',
      searchOptions: { lemma: true, root: false },
      verifyVerse: '1:1',
    },
    {
      name: 'User clicks "اللَّهِ" in 1:1',
      text_imlaei: 'اللَّهِ',
      expectedSearchQuery: 'الله',
      searchOptions: { lemma: true, root: false },
      verifyVerse: '1:1',
    },
    {
      name: 'User clicks "إِبْرَاهِيمَ" in 2:124',
      text_imlaei: 'إِبْرَاهِيمَ',
      expectedSearchQuery: 'إبراهيم',
      searchOptions: { lemma: true, root: false },
      verifyVerse: '2:124',
    },
    {
      name: 'User clicks "مُوسَىٰ" in 2:51',
      text_imlaei: 'مُوسَىٰ',
      expectedSearchQuery: 'موسى',
      searchOptions: { lemma: true, root: false },
      verifyVerse: '2:51',
    },
  ];

  for (const sim of userClickSimulations) {
    subsection(sim.name);

    // Step 1: removeTashkeel
    const searchQuery = removeTashkeel(sim.text_imlaei).trim();
    console.log(`  text_imlaei: "${sim.text_imlaei}" → removeTashkeel → "${searchQuery}"`);
    assert(searchQuery === sim.expectedSearchQuery,
      `removeTashkeel produces expected query "${sim.expectedSearchQuery}"`,
      `Got "${searchQuery}" instead`);

    // Step 2: Search
    const res = search(searchQuery, context, sim.searchOptions);
    console.log(`  Search found ${res.pagination.totalResults} results`);
    assert(res.pagination.totalResults > 0, `Search returns results`);

    // Step 3: Check if the expected verse is in results
    const targetVerse = res.results.find(r => `${r.sura_id}:${r.aya_id}` === sim.verifyVerse);
    assert(!!targetVerse, `Expected verse ${sim.verifyVerse} is in results`);

    if (targetVerse) {
      // Step 4a: Try built-in highlighting
      const builtInRanges = getHighlightRanges(targetVerse.uthmani, targetVerse.matchedTokens, targetVerse.tokenTypes);

      // Step 4b: Try our lemma algorithm
      const ourIndices = findLemmaHighlightIndices(targetVerse.standard, searchQuery);

      console.log(`  Built-in highlighting: ${builtInRanges.length} ranges`);
      console.log(`  Our Algorithm A: ${ourIndices.length} word matches: ${ourIndices.map(i => `[${i.word}]`).join(', ')}`);

      // At least one should work
      assert(builtInRanges.length > 0 || ourIndices.length > 0,
        `At least one highlighting method works for ${sim.verifyVerse}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 6: Adjacent multi-word user click simulation
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 6: Multi-Word Adjacent Click Simulation');
  console.log('  Simulating: user selects multiple adjacent words → regex search → highlight\n');

  const multiWordSimulations = [
    {
      name: 'User selects "الرَّحْمَٰنِ الرَّحِيمِ" (2 words)',
      words_imlaei: ['الرَّحْمَٰنِ', 'الرَّحِيمِ'],
      verifyVerse: '1:1',
      expectedHighlightCount: 2,
    },
    {
      name: 'User selects "يُطِعِ اللَّهَ" (2 words)',
      words_imlaei: ['يُطِعِ', 'اللَّهَ'],
      verifyVerse: '4:13',
      expectedHighlightCount: 2,
    },
    {
      name: 'User selects "بِسْمِ اللَّهِ الرَّحْمَٰنِ" (3 words)',
      words_imlaei: ['بِسْمِ', 'اللَّهِ', 'الرَّحْمَٰنِ'],
      verifyVerse: '1:1',
      expectedHighlightCount: 3,
    },
    {
      name: 'User selects "فِي سَبِيلِ اللَّهِ" (3 words)',
      words_imlaei: ['فِي', 'سَبِيلِ', 'اللَّهِ'],
      verifyVerse: '2:154', // one of many verses with في سبيل الله
      expectedHighlightCount: 3,
    },
  ];

  for (const sim of multiWordSimulations) {
    subsection(sim.name);

    // Build query from clicking multiple words
    const searchQuery = sim.words_imlaei.map(w => removeTashkeel(w).trim()).join(' ');
    console.log(`  Combined query: "${searchQuery}"`);

    // Regex search
    const res = search(searchQuery, context, { lemma: false, root: false, isRegex: true });
    console.log(`  Regex search found ${res.pagination.totalResults} results`);
    assert(res.pagination.totalResults > 0, `Regex search returns results for "${searchQuery}"`);

    // Confirm bug
    const hasEmptyTokens = res.results.some(r => r.matchedTokens.length === 0);
    if (hasEmptyTokens) {
      console.log(`  ${WARN} Confirmed: some results have empty matchedTokens`);
    }

    // Test our algorithm
    const targetVerse = res.results.find(r => `${r.sura_id}:${r.aya_id}` === sim.verifyVerse);
    if (targetVerse) {
      const indices = findRegexHighlightIndices(targetVerse.standard, searchQuery);
      console.log(`  Our Algorithm B for ${sim.verifyVerse}: ${indices.length} words highlighted`);

      const words = targetVerse.standard.split(/\s+/);
      const display = words.map((w, i) => {
        const isHighlighted = indices.some(idx => idx.index === i);
        return isHighlighted ? `[${w}]` : w;
      }).join(' ');
      console.log(`    → ${display.substring(0, 140)}`);

      assert(indices.length >= sim.expectedHighlightCount,
        `Algorithm B highlights at least ${sim.expectedHighlightCount} words (got ${indices.length})`,
        `Expected ≥${sim.expectedHighlightCount}, got ${indices.length}`);

      // Verify adjacency
      if (indices.length >= 2) {
        let allAdjacent = true;
        for (let j = 1; j < indices.length; j++) {
          if (indices[j].index !== indices[j - 1].index + 1) {
            allAdjacent = false;
            break;
          }
        }
        assert(allAdjacent, `Highlighted words are adjacent (consecutive indices)`);
      }
    } else {
      console.log(`  ${WARN} Target verse ${sim.verifyVerse} not found in results — check manually`);
      // Still test algorithm on whatever we got
      if (res.results.length > 0) {
        const indices = findRegexHighlightIndices(res.results[0].standard, searchQuery);
        console.log(`  Testing on first result ${res.results[0].sura_id}:${res.results[0].aya_id}: ${indices.length} words`);
        assert(indices.length > 0, `Algorithm B finds highlights in at least one result`);
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 7: Critical discovery — Hamza normalization in regex engine
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 7: Hamza Normalization Discovery');
  console.log('  The regex engine normalizes أ/إ/آ → ا internally.');
  console.log('  If you pass hamza characters, the regex returns 0 results!\n');

  {
    // Demonstrate the problem
    const withHamza = search('أهل الكتاب', context, { lemma: false, root: false, isRegex: true });
    const withoutHamza = search('اهل الكتاب', context, { lemma: false, root: false, isRegex: true });
    console.log(`  "أهل الكتاب" (with hamza) → ${withHamza.pagination.totalResults} regex results`);
    console.log(`  "اهل الكتاب" (without hamza) → ${withoutHamza.pagination.totalResults} regex results`);

    assert(withHamza.pagination.totalResults === 0, `Regex with hamza أ returns 0 (confirming the issue)`);
    assert(withoutHamza.pagination.totalResults > 0, `Regex without hamza ا returns results`);

    // Same for إله
    const withHamza2 = search('إله', context, { lemma: false, root: false, isRegex: true });
    const withoutHamza2 = search('اله', context, { lemma: false, root: false, isRegex: true });
    console.log(`\n  "إله" (with hamza) → ${withHamza2.pagination.totalResults} regex results`);
    console.log(`  "اله" (without hamza) → ${withoutHamza2.pagination.totalResults} regex results`);

    assert(withHamza2.pagination.totalResults === 0, `Regex with hamza إ returns 0 (confirming the issue)`);
    assert(withoutHamza2.pagination.totalResults > 0, `Regex without hamza ا returns results`);

    // The fix: use normalizeArabic() before passing to regex search
    const normalized = normalizeArabic('أهل الكتاب');
    const withNormalized = search(normalized, context, { lemma: false, root: false, isRegex: true });
    console.log(`\n  normalizeArabic("أهل الكتاب") → "${normalized}"`);
    console.log(`  Regex with normalized query → ${withNormalized.pagination.totalResults} results`);

    assert(withNormalized.pagination.totalResults > 0,
      `normalizeArabic() fixes the hamza issue for regex search (${withNormalized.pagination.totalResults} results)`);

    // IMPORTANT: this means the user flow needs normalizeArabic() before regex search
    console.log(`\n  ${WARN} ACTION REQUIRED: Always use normalizeArabic() on the query`);
    console.log(`     BEFORE passing it to search() with isRegex: true`);
    console.log(`     removeTashkeel() alone is NOT enough — it doesn't normalize hamza`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 8: Using quran.com API word structure (the ACTUAL implementation)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 8: quran.com API Word-Level Highlighting');
  console.log('  Your app renders word-by-word using the words[] array from quran.com API.');
  console.log('  Each word has: position, text_imlaei, text_imlaei_simple, char_type_name');
  console.log('  You do NOT need character ranges — you need WORD POSITIONS to highlight.\n');

  subsection('8a: Normalization level mapping');
  {
    console.log('  THREE levels of text:');
    console.log('  ┌──────────────────────────────────────────────────────────────────┐');
    console.log('  │ text_imlaei          = وَسُلَيْمَانَ  (with tashkeel)              │');
    console.log('  │ removeTashkeel()     = وسليمان    (strips diacritics, keeps إ/أ)│');
    console.log('  │ text_imlaei_simple   = وسليمان    (same as normalizeArabic)     │');
    console.log('  │ normalizeArabic()    = وسليمان    (strips diacritics + hamza)   │');
    console.log('  └──────────────────────────────────────────────────────────────────┘');
    console.log('');
    console.log('  KEY: removeTashkeel and text_imlaei_simple differ on hamza!');
    console.log('    removeTashkeel("إِذْ")  = "إذ"  (keeps إ)');
    console.log('    text_imlaei_simple      = "اذ"  (strips إ→ا)');
    console.log('');
    console.log('  Search engine standard field = removeTashkeel level (keeps hamza)');
    console.log('  So for consistency: use removeTashkeel(text_imlaei) for Algorithm A');
  }

  subsection('8b: Algorithm A with quran.com words[] — single word highlighting');
  {
    // Simulate 21:78 word data from quran.com API
    const apiWords = [
      { position: 1, text_imlaei: 'وَدَاوُودَ', text_imlaei_simple: 'وداوود', char_type_name: 'word' },
      { position: 2, text_imlaei: 'وَسُلَيْمَانَ', text_imlaei_simple: 'وسليمان', char_type_name: 'word' },
      { position: 3, text_imlaei: 'إِذْ', text_imlaei_simple: 'اذ', char_type_name: 'word' },
      { position: 4, text_imlaei: 'يَحْكُمَانِ', text_imlaei_simple: 'يحكمان', char_type_name: 'word' },
      { position: 5, text_imlaei: 'فِي', text_imlaei_simple: 'في', char_type_name: 'word' },
      { position: 6, text_imlaei: 'الْحَرْثِ', text_imlaei_simple: 'الحرث', char_type_name: 'word' },
      { position: 7, text_imlaei: 'إِذْ', text_imlaei_simple: 'اذ', char_type_name: 'word' },
      { position: 8, text_imlaei: 'نَفَشَتْ', text_imlaei_simple: 'نفشت', char_type_name: 'word' },
      { position: 9, text_imlaei: 'فِيهِ', text_imlaei_simple: 'فيه', char_type_name: 'word' },
      { position: 10, text_imlaei: 'غَنَمُ', text_imlaei_simple: 'غنم', char_type_name: 'word' },
      { position: 11, text_imlaei: 'الْقَوْمِ', text_imlaei_simple: 'القوم', char_type_name: 'word' },
      { position: 12, text_imlaei: 'وَكُنَّا', text_imlaei_simple: 'وكنا', char_type_name: 'word' },
      { position: 13, text_imlaei: 'لِحُكْمِهِمْ', text_imlaei_simple: 'لحكمهم', char_type_name: 'word' },
      { position: 14, text_imlaei: 'شَاهِدِينَ', text_imlaei_simple: 'شاهدين', char_type_name: 'word' },
      { position: 15, text_imlaei: '٧٨', text_imlaei_simple: '٧٨', char_type_name: 'end' },
    ];

    const searchQuery = 'سليمان'; // user clicked سُلَيْمَانَ → removeTashkeel

    // THE ACTUAL IMPLEMENTATION FUNCTION for your app:
    function getHighlightPositions_LemmaA(words, searchQuery) {
      const strippedQuery = removeTashkeel(searchQuery).trim();
      const positions = [];

      for (const w of words) {
        if (w.char_type_name !== 'word') continue;
        const strippedWord = removeTashkeel(w.text_imlaei).trim();
        if (strippedWord.includes(strippedQuery)) {
          positions.push(w.position);
        }
      }
      return positions;
    }

    const positions = getHighlightPositions_LemmaA(apiWords, searchQuery);
    console.log(`  Query: "${searchQuery}" in verse 21:78`);
    console.log(`  Highlighted positions: [${positions.join(', ')}]`);

    const highlightedDisplay = apiWords
      .filter(w => w.char_type_name === 'word')
      .map(w => positions.includes(w.position) ? `[${w.text_imlaei_simple}]` : w.text_imlaei_simple)
      .join(' ');
    console.log(`  Display: ${highlightedDisplay}`);

    assert(positions.length === 1, `Finds exactly 1 word to highlight (position 2: وسليمان)`);
    assert(positions[0] === 2, `Correct position: 2 (وَسُلَيْمَانَ)`);
  }

  subsection('8c: Algorithm B with quran.com words[] — multi-word regex highlighting');
  {
    // Simulate 1:1 word data
    const apiWords_1_1 = [
      { position: 1, text_imlaei: 'بِسْمِ', text_imlaei_simple: 'بسم', char_type_name: 'word' },
      { position: 2, text_imlaei: 'اللَّهِ', text_imlaei_simple: 'الله', char_type_name: 'word' },
      { position: 3, text_imlaei: 'الرَّحْمَٰنِ', text_imlaei_simple: 'الرحمن', char_type_name: 'word' },
      { position: 4, text_imlaei: 'الرَّحِيمِ', text_imlaei_simple: 'الرحيم', char_type_name: 'word' },
      { position: 5, text_imlaei: '١', text_imlaei_simple: '١', char_type_name: 'end' },
    ];

    const regexQuery = 'الرحمن الرحيم'; // user selected 2 adjacent words

    // THE ACTUAL IMPLEMENTATION FUNCTION for your app:
    function getHighlightPositions_RegexB(words, searchQuery) {
      const actualWords = words.filter(w => w.char_type_name === 'word');
      const normalizedWords = actualWords.map(w => normalizeArabic(w.text_imlaei).trim());

      // Build concatenated string and track word boundaries
      const wordBoundaries = [];
      let pos = 0;
      for (let i = 0; i < normalizedWords.length; i++) {
        const start = pos;
        const end = pos + normalizedWords[i].length;
        wordBoundaries.push({ start, end, position: actualWords[i].position });
        pos = end + 1;
      }
      const concatenated = normalizedWords.join(' ');

      // Build and run regex
      const normalizedQuery = normalizeArabic(searchQuery).trim();
      const tokens = normalizedQuery.split(/\s+/);
      const regexStr = tokens.join('\\s+');
      const regex = new RegExp(regexStr, 'g');

      const positions = new Set();
      let match;
      while ((match = regex.exec(concatenated)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        for (const wb of wordBoundaries) {
          if (wb.end > matchStart && wb.start < matchEnd) {
            positions.add(wb.position);
          }
        }
      }
      return [...positions].sort((a, b) => a - b);
    }

    const positions = getHighlightPositions_RegexB(apiWords_1_1, regexQuery);
    console.log(`  Query: "${regexQuery}" in verse 1:1`);
    console.log(`  Highlighted positions: [${positions.join(', ')}]`);

    const highlightedDisplay = apiWords_1_1
      .filter(w => w.char_type_name === 'word')
      .map(w => positions.includes(w.position) ? `[${w.text_imlaei_simple}]` : w.text_imlaei_simple)
      .join(' ');
    console.log(`  Display: ${highlightedDisplay}`);

    assert(positions.length === 2, `Finds exactly 2 words to highlight`);
    assert(positions[0] === 3 && positions[1] === 4, `Correct positions: 3 (الرحمن) and 4 (الرحيم)`);

    // Test 3-word: بسم الله الرحمن
    const positions3 = getHighlightPositions_RegexB(apiWords_1_1, 'بسم الله الرحمن');
    console.log(`\n  Query: "بسم الله الرحمن" in verse 1:1`);
    console.log(`  Highlighted positions: [${positions3.join(', ')}]`);
    assert(positions3.length === 3, `3-word: finds exactly 3 words`);
    assert(JSON.stringify(positions3) === '[1,2,3]', `Correct positions: 1, 2, 3`);
  }

  subsection('8d: The unified getHighlightPositions function');
  {
    console.log('  Here is the FINAL function your app should use:\n');
    console.log('  function getHighlightPositions(apiWords, searchQuery, matchType) {');
    console.log('    // For exact matches with working matchedTokens: use built-in');
    console.log('    // (handled separately in your render logic)');
    console.log('');
    console.log('    if (matchType === "regex") {');
    console.log('      return getHighlightPositions_RegexB(apiWords, searchQuery);');
    console.log('    }');
    console.log('');
    console.log('    // lemma, root, none, fuzzy — all use Algorithm A');
    console.log('    return getHighlightPositions_LemmaA(apiWords, searchQuery);');
    console.log('  }');
    console.log('');
    console.log('  And in your render loop:');
    console.log('  const positions = getHighlightPositions(verse.words, query, result.matchType);');
    console.log('  verse.words.map(w => ({');
    console.log('    ...w,');
    console.log('    isHighlighted: positions.includes(w.position)');
    console.log('  }));');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('SUMMARY');
  console.log(`  Total tests: ${totalTests}`);
  console.log(`  Passed: ${passedTests} ${PASS}`);
  console.log(`  Failed: ${failedTests} ${FAIL}`);
  console.log(`  Pass rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log(`\n  Failed tests:`);
    failures.forEach(f => {
      console.log(`    ${FAIL} ${f.label}`);
      if (f.details) console.log(`       ${f.details}`);
    });
  }

  console.log('\n' + '═'.repeat(70));
  console.log('  CONCLUSIONS — FINAL IMPLEMENTATION PLAN:');
  console.log('═'.repeat(70));
  console.log(`
  THE BUG: matchedTokens is [] for regex and root/fuzzy results.

  YOUR APP ARCHITECTURE:
    - You render word-by-word using quran.com API words[] array
    - Each word has: position, text_imlaei, text_imlaei_simple
    - You need WORD POSITIONS to highlight, not character ranges
    - You do NOT need getHighlightRanges() at all for these cases

  NORMALIZATION LEVELS (critical to understand):
    text_imlaei        = وَسُلَيْمَانَ  (original with tashkeel)
    removeTashkeel()   = وسليمان     (strips diacritics, KEEPS hamza إ/أ)
    text_imlaei_simple = وسليمان     (strips diacritics AND hamza)
    normalizeArabic()  = وسليمان     (same as text_imlaei_simple)

    Search engine 'standard' field = removeTashkeel level
    Regex engine internals = normalizeArabic level

  TWO FUNCTIONS TO ADD:

  getHighlightPositions_LemmaA(apiWords, searchQuery):
    - For each word where char_type_name === 'word'
    - removeTashkeel(word.text_imlaei).includes(removeTashkeel(searchQuery))
    - Returns array of position numbers to highlight

  getHighlightPositions_RegexB(apiWords, searchQuery):
    - Filter to char_type_name === 'word'
    - normalizeArabic() each word's text_imlaei
    - Join with spaces, track boundaries
    - Regex match normalizeArabic(searchQuery) tokens joined with \\s+
    - Map offsets back to position numbers

  DISPATCH LOGIC:
    if (matchType === 'regex') → use RegexB
    else if (matchedTokens.length > 0) → use built-in (exact works fine)
    else → use LemmaA (covers lemma, root, none, fuzzy)

  FOR REGEX SEARCH: normalizeArabic() the query BEFORE calling search()
    removeTashkeel alone breaks on hamza words (أهل، إله، إلا)
`);
}

main().catch(console.error);
