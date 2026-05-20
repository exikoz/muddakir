# Search Diagnostic Report

## Overview

This document reports the findings from two diagnostic scripts that test the search functionality in the Muddakir app. The tests compare the **quran-search-engine** npm package (v0.3.2, client-side) against the **quran.com Search API** (v1, server-side) to understand the root causes of unexpected search results and missing highlights.

**Diagnostic files:**
- `search-diagnostic.mjs` — Tests the quran-search-engine package directly
- `search-api-diagnostic.mjs` — Tests the quran.com Search API (v1)

**Date:** April 2026

---

## The Problems Being Investigated

| # | Word | Issue | Search Mode |
|---|------|-------|-------------|
| 1 | فوزا | Verse 2:7 (عذاب عظيم) appears in results — completely unrelated | lemma |
| 2 | المشرك | 0 results unless fuzzy is enabled; user expected free text search | lemma, exact |
| 3 | يَضْرِبَ | Results found but many verses have no highlighting (12:14 missing, 16:75 no highlight) | lemma |
| 4 | الصيام | ~1841 results returned — nearly a third of the Quran | lemma |

---

## Test Results: quran-search-engine Package

### Does the engine normalize internally?

**Yes.** Sending the same word with tashkeel (`سُلَيْمَانَ`), with `removeTashkeel` (`سليمان`), and with `normalizeArabic` (`سليمان`) all return identical result counts. The engine strips diacritics internally before searching.

### Issue 1: فوزا → 119 lemma results (116 are noise)

**Root cause: Bad wordMap entry.**

```
wordMap["فوزا"] = { lemma: "عظيم", root: "ف-و-ز" }
```

The root is correct (ف-و-ز) but the **lemma is wrong** — it's mapped to `عظيم` ("great") instead of `فوز` ("triumph"). Since `عظيم` appears in hundreds of verses, the engine returns all of them as lemma matches.

- **Exact mode:** 3 results (correct — the 3 verses containing فوزا)
- **Lemma mode:** 119 results (3 exact + 116 fuzzy noise from lemma "عظيم")
- **2:7 appears** with `matchType: "none"`, `matchScore: 0` — it contains عظيم in its lemmas

**This is a data quality bug in the quran-search-engine package's bundled wordMap.**

### Issue 2: المشرك → 0 results without fuzzy

**Root cause: Word form not in wordMap.**

```
wordMap["المشرك"] = NOT FOUND
wordMap["المشركين"] = { lemma: "مشرك", root: "ش-ر-ك" }  ← exists
wordMap["المشركون"] = { lemma: "مشرك", root: "ش-ر-ك" }  ← exists
```

The singular form `المشرك` does not appear in the Quran text and is not in the wordMap. The engine does **whole-token matching only** — there is no substring/contains/partial search. Without a wordMap entry, lemma and root resolution fail completely.

- **Fuzzy mode:** 31 results (Fuse.js approximate matching finds المشركين etc.)
- **All other modes:** 0 results

### Issue 3: يضرب → 54 results, 34 with no highlighting

**Root cause: suffixMatch cannot handle verb conjugations.**

The engine finds 54 verses via lemma matching (lemma `ضرب`). But our highlighting uses `suffixMatch` (endsWith), which only handles Arabic **prefixes** (و، ف، ب، ل). It cannot connect:

- `يضرب` (query) → `ضرب` (past tense in 16:75) — different conjugation
- `يضرب` → `اضرب` (imperative in 2:60) — different form
- `يضرب` → `اضربوه` (imperative plural in 2:73) — different form
- `يضرب` → `فضربنا` (past + prefix in 18:11) — different form

**12:14 is NOT in the search results at all** — the engine doesn't find it.

**16:75 IS in results** — the word `ضرب` is there and suffixMatch actually catches it (because `يضرب` ends with `ضرب`), but `endsWith("يضرب")` on the word `ضرب` is false. The suffixMatch function handles this because it checks both directions (shorter is suffix of longer).

**Highlight gap:** 34 out of 54 results have no highlighting possible — the engine found them through lemma matching but our word-level highlighting can't identify which word to highlight.

### Issue 4: الصيام → 1841 results (catastrophic)

**Root cause: Bad wordMap entry.**

```
wordMap["الصيام"] = { lemma: "ما", root: "ص-و-م" }
```

The root is correct (ص-و-م) but the **lemma is `ما`** — one of the most common words in the Quran. This causes the engine to return virtually every verse containing `ما` as a lemma match.

- **Exact mode:** 2 results (correct — 2:183 and 2:187)
- **Lemma mode:** 1841 results (2 exact + 1839 fuzzy noise from lemma "ما")
- Verses like 2:3, 2:4, 2:8 appear with `matchType: "none"`, `matchScore: 0` — completely unrelated to fasting

**This is a data quality bug in the quran-search-engine package's bundled wordMap.**


---

## Test Results: quran.com Search API (v1)

### Authentication

The Search API requires a separate `search` scope token (not the `content` scope used for verse fetching). Token request:

```
POST https://oauth2.quran.foundation/oauth2/token
scope=search
```

The search endpoint is:
```
GET https://apis.quran.foundation/search/v1/search?mode=advanced&query=...
```

### Tashkeel Handling

**The API handles tashkeel internally.** Sending `سُلَيْمَانَ` (with diacritics) and `سليمان` (stripped) return identical results. No pre-processing needed.

### Highlighting

- The API returns `<em>` tags in the `name` field (not in `arabic`)
- `highlight=1` enables it (default), `highlight=0` disables it
- `get_text=1` is needed to get the `arabic` and `name` fields
- The `arabic` field contains clean Uthmani text (no `<em>` tags)
- The `name` field contains Uthmani text WITH `<em>` tags around matched words

**Important:** For some queries (المشرك, الصيام), the API returns results but with **empty highlights** (no `<em>` tags). This happens when the API matches semantically but the exact query word doesn't appear in the verse text.

### Issue 1: فوزا

| | Package (lemma) | Package (exact) | API |
|---|---|---|---|
| Results | 119 | 3 | 3 |
| 2:7 present | ⚠️ Yes | No | ✅ No |
| Highlights | 3 with tokens | — | 3 with `<em>` |

**API is correct.** Returns only the 3 verses that actually contain فوزا. No noise.

### Issue 2: المشرك

| | Package (lemma) | Package (fuzzy) | API |
|---|---|---|---|
| Results | 0 | 31 | 200 |
| Highlights | — | — | ❌ None (no `<em>` tags) |

**API finds 200 results** for the singular form المشرك — it does morphological/semantic matching internally. However, it returns **no `<em>` highlights** for these results because the exact word المشرك doesn't appear in the verse text.

When searching المشركين (a form that exists), the API returns 200 results WITH proper `<em>` highlights.

### Issue 3: يضرب

| | Package (lemma) | API |
|---|---|---|
| Results | 54 | 5 |
| 12:14 | Not found | Not found |
| 16:75 | Found, no highlight | Not found |
| Highlighted forms | يضرب, ويضرب | يَضْرِبَ, يَضْرِبُ, وَيَضْرِبُ |

**API returns only 5 results** — only verses containing the exact form يضرب (with prefix variants). It does NOT do lemma/root expansion for verbs. The package finds more through lemma matching but can't highlight them.

Neither the API nor the package finds 12:14 for this query.

### Issue 4: الصيام

| | Package (lemma) | Package (exact) | API |
|---|---|---|---|
| Results | 1841 | 2 | 55 |
| 2:183 present | ✅ Yes | ✅ Yes | ✅ Yes |
| Highlights | 2 with tokens | — | ❌ None (no `<em>` tags) |

**API returns 55 results** — a reasonable set of verses related to fasting. Much better than the package's 1841 (noise) or 2 (too few). However, the API returns **no `<em>` highlights** for الصيام results, suggesting it matches semantically rather than by exact text.

### Prefix Handling

| Query | API results | Highlights |
|---|---|---|
| سليمان | 132 | سُلَيْمَـٰنَ, سُلَيْمَـٰنُ |
| وسليمان | 156 | وَسُلَيْمَـٰنَ |
| لسليمان | 3 | وَلِسُلَيْمَـٰنَ, لِسُلَيْمَـٰنَ |
| ولسليمان | 2 | وَلِسُلَيْمَـٰنَ |

The API handles prefixes well for proper nouns. Searching the bare form `سليمان` finds all variants. Searching a prefixed form finds only verses with that specific prefix.


---

## Side-by-Side Comparison

| Query | API | API exact | Pkg exact | Pkg lemma | Notes |
|-------|-----|-----------|-----------|-----------|-------|
| فوزا | 3 | 3 | 3 | 119 | Package lemma is noise (bad wordMap) |
| المشرك | 200 | 200 | 0 | 0 | API does morphological matching; package can't |
| المشركين | 200 | 200 | 28 | 43 | Both find results; API finds more |
| يضرب | 5 | 5 | 9 | 54 | API is conservative (exact forms only); package over-matches |
| الصيام | 55 | 55 | 2 | 1841 | API is reasonable; package exact too few, lemma catastrophic |
| الرحمن | 94 | 94 | ? | ? | — |
| الله | 200 | 200 | ? | ? | API caps at 200 |

---

## Key Findings

### 1. The quran-search-engine wordMap has critical data quality issues

Two confirmed bad lemma mappings that cause catastrophic result inflation:
- `فوزا` → lemma `عظيم` (should be `فوز`)
- `الصيام` → lemma `ما` (should be `صيام` or `صوم`)

These are not edge cases — they produce hundreds or thousands of false results. There may be more bad mappings we haven't tested.

**Action:** Report to package author. Consider maintaining a local correction map as a workaround.

### 2. The package has no partial/substring/free-text search

The engine does whole-token matching only. If a word form isn't in the wordMap (like المشرك singular), lemma/root resolution fails completely. Only fuzzy (Fuse.js) can catch it.

**Action:** The API handles this much better — it found 200 results for المشرك.

### 3. Highlighting is fundamentally limited for lemma results

The package returns `matchedTokens: []` for lemma/root matches. Our suffixMatch workaround handles prefixes but not verb conjugations or plural forms. 34 out of 54 results for يضرب have no highlighting possible.

**Action:** The API provides `<em>` tags for exact text matches but NOT for semantic/morphological matches. Neither solution fully solves highlighting for lemma results.

### 4. The API is more accurate but has its own limitations

**Strengths:**
- No false positives from bad wordMap data
- Handles morphological matching for nouns (المشرك → المشركين etc.)
- Returns reasonable result counts (55 for الصيام vs 1841)
- Provides `<em>` highlighting for exact text matches
- Handles tashkeel and prefixes well

**Limitations:**
- No `<em>` highlights for semantic/morphological matches (المشرك, الصيام)
- Conservative with verb forms (يضرب returns only 5 vs package's 54)
- Results capped at 200
- Requires network call + auth token (latency)
- Requires `search` scope token (separate from `content` scope)

### 5. Both the engine and API normalize tashkeel internally

Neither requires pre-processing with `removeTashkeel()` or `normalizeArabic()` before searching. The raw `text_imlaei` from the quran.com API can be passed directly as the search query.

---

## Recommendations

### Short-term: Fix the worst package issues
1. **Filter out noise results:** Discard results with `matchType: "none"` and `matchScore: 0` — these are fuzzy fallback noise, not real matches
2. **Local wordMap corrections:** Override known bad lemma mappings (فوزا→عظيم, الصيام→ما) before searching
3. **Report to package author:** File issues for the bad wordMap entries with reproduction steps

### Medium-term: Use API as fallback/complement
1. **Add a search API proxy** (like the content proxy) with `search` scope token
2. **Use API for typed/manual searches** where the user enters arbitrary text (like المشرك)
3. **Use package for word-click searches** where the exact form exists in the Quran
4. **Use API `<em>` tags for highlighting** when available — parse them into word indices

### Long-term: Evaluate full migration to API
1. The API is more reliable for result quality (no bad wordMap issues)
2. The API handles morphological matching better for nouns
3. But the API is weaker for verb lemma matching (يضرب: 5 vs 54 results)
4. A hybrid approach may be best: API for primary results, package for lemma expansion

---

## How to Run the Diagnostics

```bash
# Test the quran-search-engine package
node search-diagnostic.mjs

# Test the quran.com Search API
node search-api-diagnostic.mjs
```

Both scripts are self-contained and require no dev server. They output detailed results to the console.
