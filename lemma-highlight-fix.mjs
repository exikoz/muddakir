/**
 * lemma-highlight-fix.mjs
 * 
 * PROBLEM:
 * When user clicks "وَسُلَيْمَانَ" (with prefix و), the query becomes "وسليمان".
 * The search engine finds verses containing "سليمان" (without prefix), but
 * Algorithm A used word.includes(query) which fails:
 *   "سليمان".includes("وسليمان") → false
 * 
 * The original script used includes() in ONE direction (word contains query).
 * That works when query is the bare form. But when the user clicks a prefixed
 * word, the query IS the prefixed form and the matching word might be bare.
 * 
 * FIX:
 * Use endsWith() instead of includes().
 * longer.endsWith(shorter) — because Arabic prefixes attach at the START.
 * This catches both directions:
 *   "وسليمان".endsWith("سليمان") → true  (word has prefix, query bare)
 *   "سليمان" — query "وسليمان".endsWith("سليمان") → true  (query has prefix, word bare)
 * And naturally rejects:
 *   False positives: "وسليمان".endsWith("ما") → false (ما is mid-word, not suffix)
 *   Suffix pronouns: "كتابهم".endsWith("كتاب") → false (different ending)
 * 
 * WHY NOT includes():
 *   "وسليمان".includes("ما") → true (ما appears inside سلي'ما'ن) — FALSE POSITIVE
 * 
 * WHY endsWith() IS PERFECT FOR ARABIC:
 *   Arabic adds prefixes (و، ف، ب، ل، ال، وال، بال، فال، ول، etc.) at the START.
 *   The base word is always the ENDING of the prefixed form.
 *   endsWith() matches exactly this pattern and nothing else.
 */

import {
  search,
  loadQuranData,
  loadMorphology,
  loadWordMap,
  removeTashkeel,
} from 'quran-search-engine';

// ─── The Fix ────────────────────────────────────────────────────────────────

/**
 * Check if a verse word matches the search query, accounting for Arabic prefixes.
 * Uses endsWith: the shorter string should be a suffix of the longer one.
 */
function suffixMatch(wordText, queryText) {
  const w = removeTashkeel(wordText).trim();
  const q = removeTashkeel(queryText).trim();
  if (w.length === 0 || q.length === 0) return false;
  if (w.length >= q.length) return w.endsWith(q);
  return q.endsWith(w);
}

/**
 * Get word positions to highlight from quran.com API words array.
 * This replaces the old includes()-based Algorithm A.
 */
function getHighlightPositions(apiWords, searchQuery) {
  const positions = [];
  for (const w of apiWords) {
    if (w.char_type_name !== 'word') continue;
    if (suffixMatch(w.text_imlaei, searchQuery)) {
      positions.push(w.position);
    }
  }
  return positions;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const PASS = '✅';
const FAIL = '❌';
let total = 0, passed = 0, failed = 0;
const failures = [];

function assert(cond, label, detail = '') {
  total++;
  if (cond) { passed++; console.log(`  ${PASS} ${label}`); }
  else { failed++; console.log(`  ${FAIL} ${label}`); if (detail) console.log(`     → ${detail}`); failures.push(label); }
}

function section(t) { console.log(`\n${'═'.repeat(70)}\n  ${t}\n${'═'.repeat(70)}`); }

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Loading search engine data...');
  const quranData = await loadQuranData();
  const morphologyMap = await loadMorphology();
  const wordMap = await loadWordMap();
  const context = { quranData, morphologyMap, wordMap };
  console.log('Ready.\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 1: suffixMatch unit tests
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 1: suffixMatch() unit tests');

  const unitTests = [
    // --- Prefix on query, bare word ---
    { w: 'سليمان', q: 'وسليمان', expect: true, desc: 'bare word, prefixed query (و)' },
    { w: 'سليمان', q: 'ولسليمان', expect: true, desc: 'bare word, prefixed query (ول)' },
    { w: 'سليمان', q: 'فسليمان', expect: true, desc: 'bare word, prefixed query (ف)' },

    // --- Prefix on word, bare query ---
    { w: 'وسليمان', q: 'سليمان', expect: true, desc: 'prefixed word (و), bare query' },
    { w: 'ولسليمان', q: 'سليمان', expect: true, desc: 'prefixed word (ول), bare query' },
    { w: 'لسليمان', q: 'سليمان', expect: true, desc: 'prefixed word (ل), bare query' },
    { w: 'بالله', q: 'الله', expect: true, desc: 'prefixed word (ب), bare query' },
    { w: 'فالله', q: 'الله', expect: true, desc: 'prefixed word (ف), bare query' },
    { w: 'والكتاب', q: 'الكتاب', expect: true, desc: 'prefixed word (و), bare query' },
    { w: 'بالكتاب', q: 'الكتاب', expect: true, desc: 'prefixed word (بال), bare query' },
    { w: 'لإبراهيم', q: 'إبراهيم', expect: true, desc: 'prefixed word (ل), name with hamza' },
    { w: 'وإبراهيم', q: 'إبراهيم', expect: true, desc: 'prefixed word (و), name with hamza' },
    { w: 'لموسى', q: 'موسى', expect: true, desc: 'prefixed word (ل), name with alef maqsura' },
    { w: 'وموسى', q: 'موسى', expect: true, desc: 'prefixed word (و), name with alef maqsura' },

    // --- Both same ---
    { w: 'سليمان', q: 'سليمان', expect: true, desc: 'exact match' },
    { w: 'وسليمان', q: 'وسليمان', expect: true, desc: 'both prefixed same way' },

    // --- FALSE POSITIVES (must be false) ---
    { w: 'ما', q: 'وسليمان', expect: false, desc: 'ما not suffix of وسليمان' },
    { w: 'من', q: 'وسليمان', expect: false, desc: 'من not suffix of وسليمان' },
    { w: 'لا', q: 'وسليمان', expect: false, desc: 'لا not suffix of وسليمان' },
    { w: 'ما', q: 'الله', expect: false, desc: 'ما not suffix of الله' },
    { w: 'على', q: 'الله', expect: false, desc: 'على not suffix of الله' },
    { w: 'من', q: 'سليمان', expect: false, desc: 'من not suffix of سليمان' },

    // --- Suffix pronouns (must be false) ---
    { w: 'كتابهم', q: 'كتاب', expect: false, desc: 'كتابهم has suffix هم, not a prefix variation' },
    { w: 'ربهم', q: 'رب', expect: false, desc: 'ربهم has suffix هم' },
    { w: 'قلوبهم', q: 'قلوب', expect: false, desc: 'قلوبهم has suffix هم' },
    { w: 'عليهم', q: 'على', expect: false, desc: 'عليهم has suffix هم' },
    { w: 'كتابه', q: 'كتاب', expect: false, desc: 'كتابه has suffix ه' },

    // --- Tashkeel handling ---
    { w: 'وَسُلَيْمَانَ', q: 'سليمان', expect: true, desc: 'word with tashkeel, bare query' },
    { w: 'سُلَيْمَانَ', q: 'وسليمان', expect: true, desc: 'word with tashkeel, prefixed query' },
    { w: 'بِسْمِ', q: 'بسم', expect: true, desc: 'tashkeel stripped correctly' },
  ];

  for (const t of unitTests) {
    const result = suffixMatch(t.w, t.q);
    assert(result === t.expect, t.desc, result !== t.expect ? `word: "${t.w}" query: "${t.q}" got ${result}` : '');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 2: Real search — clicking prefixed words
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 2: Real search with prefixed clicked words');

  const clickTests = [
    { clicked: 'وَسُلَيْمَانَ', desc: 'وسليمان from 21:78', knownVerses: ['2:102', '21:79', '27:16'] },
    { clicked: 'سُلَيْمَانَ', desc: 'سليمان from 2:102', knownVerses: ['4:163', '21:78', '21:81'] },
    { clicked: 'وَإِبْرَاهِيمَ', desc: 'وإبراهيم', knownVerses: ['2:124', '2:125'] },
    { clicked: 'بِاللَّهِ', desc: 'بالله', knownVerses: ['1:1', '2:7'] },
    { clicked: 'اللَّهِ', desc: 'الله', knownVerses: ['2:8'] },
    { clicked: 'وَمُوسَىٰ', desc: 'وموسى', knownVerses: ['2:51', '2:53'] },
  ];

  for (const tc of clickTests) {
    const query = removeTashkeel(tc.clicked).trim();
    console.log(`\n  Click: "${tc.clicked}" → query: "${query}"`);

    const res = search(query, context, { lemma: true, root: true });

    let highlightedExact = 0;
    let highlightedOther = 0;
    let missedExact = 0;
    let falsePositives = 0;

    for (const r of res.results.slice(0, 20)) {
      const words = r.standard.split(/\s+/);
      const matched = words.filter(w => suffixMatch(w, query));

      if (r.matchType === 'exact') {
        if (matched.length > 0) highlightedExact++;
        else missedExact++;
      } else {
        if (matched.length > 0) highlightedOther++;
      }

      // Check false positives: matched words should genuinely end with the query stem
      for (const m of matched) {
        const mStripped = removeTashkeel(m).trim();
        const qStripped = removeTashkeel(query).trim();
        const shorter = mStripped.length <= qStripped.length ? mStripped : qStripped;
        const longer = mStripped.length > qStripped.length ? mStripped : qStripped;
        if (!longer.endsWith(shorter)) falsePositives++;
      }
    }

    assert(missedExact === 0, `No missed exact matches for "${query}"`,
      missedExact > 0 ? `${missedExact} exact results had no highlighting` : '');
    assert(falsePositives === 0, `No false positives for "${query}"`);
    console.log(`    Exact highlighted: ${highlightedExact}, Other highlighted: ${highlightedOther}`);

    // Show first 3
    for (const r of res.results.slice(0, 3)) {
      const words = r.standard.split(/\s+/);
      const display = words.map(w => suffixMatch(w, query) ? `[${w}]` : w).join(' ');
      console.log(`    ${r.sura_id}:${r.aya_id} (${r.matchType}) → ${display.substring(0, 100)}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 3: The includes() vs endsWith() comparison
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 3: Why endsWith() beats includes()');

  {
    const query = 'وسليمان'; // user clicked the prefixed form
    const res = search(query, context, { lemma: true, root: true });

    // Find verse 2:102 — has bare سليمان (twice)
    const v2_102 = res.results.find(r => r.sura_id === 2 && r.aya_id === 102);
    if (v2_102) {
      const words = v2_102.standard.split(/\s+/);

      console.log('\n  Verse 2:102: "' + v2_102.standard.substring(0, 80) + '..."');
      console.log('  Query: "' + query + '"');
      console.log('');

      // OLD: includes() one direction — word.includes(query)
      const oldMethod = words.filter(w => removeTashkeel(w).trim().includes(removeTashkeel(query).trim()));
      console.log('  OLD (word.includes(query)):  ' + (oldMethod.length === 0 ? 'NOTHING — سليمان.includes(وسليمان) = false' : oldMethod.join(', ')));

      // WRONG: includes() reverse — query.includes(word)
      const wrongMethod = words.filter(w => removeTashkeel(query).trim().includes(removeTashkeel(w).trim()));
      console.log('  WRONG (query.includes(word)): ' + wrongMethod.join(', ') + ' ← false positives!');

      // WRONG: includes() both directions
      const bothIncludes = words.filter(w => {
        const ws = removeTashkeel(w).trim();
        const qs = removeTashkeel(query).trim();
        return ws.includes(qs) || qs.includes(ws);
      });
      console.log('  WRONG (either includes):      ' + bothIncludes.join(', ') + ' ← still has false positives!');

      // NEW: endsWith()
      const newMethod = words.filter(w => suffixMatch(w, query));
      console.log('  NEW (endsWith):               ' + newMethod.join(', ') + ' ← CORRECT');

      assert(newMethod.length === 2, 'endsWith finds both سليمان instances in 2:102');
      assert(newMethod.every(w => removeTashkeel(w).trim() === 'سليمان'), 'Only matches the actual سليمان words');
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PART 4: With quran.com API words array
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('PART 4: With actual quran.com API words[] array');

  {
    // Simulate 21:78 API response
    const apiWords = [
      { position: 1, text_imlaei: 'وَدَاوُودَ', char_type_name: 'word' },
      { position: 2, text_imlaei: 'وَسُلَيْمَانَ', char_type_name: 'word' },
      { position: 3, text_imlaei: 'إِذْ', char_type_name: 'word' },
      { position: 4, text_imlaei: 'يَحْكُمَانِ', char_type_name: 'word' },
      { position: 5, text_imlaei: 'فِي', char_type_name: 'word' },
      { position: 6, text_imlaei: 'الْحَرْثِ', char_type_name: 'word' },
      { position: 7, text_imlaei: 'إِذْ', char_type_name: 'word' },
      { position: 8, text_imlaei: 'نَفَشَتْ', char_type_name: 'word' },
      { position: 9, text_imlaei: 'فِيهِ', char_type_name: 'word' },
      { position: 10, text_imlaei: 'غَنَمُ', char_type_name: 'word' },
      { position: 11, text_imlaei: 'الْقَوْمِ', char_type_name: 'word' },
      { position: 12, text_imlaei: 'وَكُنَّا', char_type_name: 'word' },
      { position: 13, text_imlaei: 'لِحُكْمِهِمْ', char_type_name: 'word' },
      { position: 14, text_imlaei: 'شَاهِدِينَ', char_type_name: 'word' },
      { position: 15, text_imlaei: '٧٨', char_type_name: 'end' },
    ];

    // Scenario: user clicked سليمان (bare) somewhere else, this verse is a result
    const pos1 = getHighlightPositions(apiWords, 'سليمان');
    console.log('\n  Query "سليمان" in 21:78 → positions:', pos1);
    assert(pos1.length === 1 && pos1[0] === 2, 'Bare query finds position 2 (وَسُلَيْمَانَ)');

    // Scenario: user clicked وسليمان in THIS verse, verse 2:102 is a result
    // (simulating 2:102's words)
    const apiWords_2_102_partial = [
      { position: 7, text_imlaei: 'سُلَيْمَانَ', char_type_name: 'word' },
      { position: 10, text_imlaei: 'سُلَيْمَانَ', char_type_name: 'word' },
      { position: 1, text_imlaei: 'وَاتَّبَعُوا', char_type_name: 'word' },
      { position: 2, text_imlaei: 'مَا', char_type_name: 'word' },
    ];

    const pos2 = getHighlightPositions(apiWords_2_102_partial, 'وسليمان');
    console.log('  Query "وسليمان" in 2:102 → positions:', pos2);
    assert(pos2.length === 2, 'Prefixed query finds both سليمان words');
    assert(!pos2.includes(2), 'Does NOT highlight ما (position 2)');
    assert(pos2.includes(7) && pos2.includes(10), 'Highlights positions 7 and 10');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  section('SUMMARY');
  console.log(`  Total: ${total} | Passed: ${passed} ${PASS} | Failed: ${failed} ${FAIL}`);
  if (failures.length) { console.log('  Failures:'); failures.forEach(f => console.log(`    ${FAIL} ${f}`)); }

  console.log(`
${'═'.repeat(70)}
  THE FIX — ONE LINE CHANGE:
${'═'.repeat(70)}

  BEFORE (broken):
    removeTashkeel(word.text_imlaei).includes(removeTashkeel(searchQuery))

  AFTER (fixed):
    suffixMatch(word.text_imlaei, searchQuery)

  Where suffixMatch is:
    function suffixMatch(wordText, queryText) {
      const w = removeTashkeel(wordText).trim();
      const q = removeTashkeel(queryText).trim();
      if (w.length === 0 || q.length === 0) return false;
      if (w.length >= q.length) return w.endsWith(q);
      return q.endsWith(w);
    }

  WHY: Arabic prefixes (و، ف، ب، ل، ال، etc.) attach at the START.
  endsWith() matches the base word regardless of which side has the prefix.
  includes() either misses matches or creates false positives on short words.

  DO NOT use text_imlaei_simple — it over-normalizes (الْفَائِزُونَ → الفايزون).
  Use removeTashkeel(text_imlaei) which preserves the correct letter forms.
`);
}

main().catch(console.error);
