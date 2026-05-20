# Highlighting Fix — Complete Documentation

## Overview

This document covers the investigation, troubleshooting, and implementation of word-level highlighting across all search modes in the Quran verse explorer app. The work spanned the full pipeline: API text rendering, search engine integration, and per-node highlight state management.

---

## The Original Problem

The app uses two separate data sources:

1. **quran.com API** — provides `text_imlaei` (diacritized Arabic) for display, individual word objects, translations
2. **quran-search-engine** (npm package) — finds matching verses, returns results with `matchedTokens` and character-offset-based `getHighlightRanges()`

The original code called `getHighlightRanges(verse.text_arabic, matchedTokens)` in graph nodes. This computed character offsets against the engine's internal Uthmani text, then applied those offsets to the API's `text_imlaei` string. Since these two scripts have completely different character positions, offsets landed on wrong words (e.g. highlighting "Harun" instead of "Sulayman" in verse 4:163).

Additionally, the Deep Discovery panel rendered `r.uthmani` (engine text) directly instead of API text, creating inconsistent Arabic script across the UI.

---

## Issues Identified

### Issue 1: Character offset mismatch (all search modes)
Engine highlight ranges are computed against Uthmani text. API renders `text_imlaei`. Different character counts and positions between the two scripts caused wrong words to be highlighted.

### Issue 2: Mixed script forms in UI
Graph nodes displayed `text_imlaei` from the API. Discovery panel displayed `uthmani` from the engine. Two different Arabic script forms visible to the user.

### Issue 3: Empty matchedTokens for lemma/regex results
The engine returns `matchedTokens: []` for:
- Lemma-matched results (`matchType: 'none'`, `matchScore: 0`)
- All regex results (`matchType: 'regex'`)

Only exact text matches get populated `matchedTokens`. This meant 0 highlighting for lemma and regex results.

### Issue 4: Global search term caused highlight interference
`currentSearchTerm` was a single global value in the Zustand store. Every `ArabicText` component subscribed to it. When a new search fired from any node, all other nodes re-evaluated their highlights against the new query, causing existing highlights to disappear.

### Issue 5: `includes()` failed for prefixed Arabic words
When a user clicked `وَسُلَيْمَانَ` (with و prefix), the query became `وسليمان`. Result verses containing bare `سليمان` failed the check `"سليمان".includes("وسليمان")` → false.

### Issue 6: Discovery panel "Add" nodes had no highlights
`addVerseNode` applied `matchedTokens` and `matchType` from the search result but did not set `searchTerm` on the exploration node. The frozen `searchQuery` on the ReactFlow node was `undefined`, so the lemma/regex fallback had no query to work with.

---

## Solutions Tried and Rejected

### text_imlaei_simple for matching
The API's `text_imlaei_simple` field applies its own orthographic changes (e.g. `ئ` → `ي`, `الرحمن` → `الرحمان`) that don't align with the engine's normalization or `removeTashkeel`. Searching with `الفايزون` (simple form) returns 0 results. Rejected.

### normalizeArabic for lemma matching
`normalizeArabic` replaces base letters (e.g. `ئ` → `ء`) which causes mismatches. Only safe for regex where the engine normalizes internally. Not suitable for lemma word comparison.

### Morphology map index-based lemma lookup
The engine's `morphologyMap` stores exact lemmas per verse. However, word indices between the API and morphologyMap only align ~52% of the time (tested across 200 verses). The mismatch comes from how each system splits compound particles. Rejected as unreliable without an alignment algorithm.

### Quran.com Search API
Tested the authenticated search endpoint (`apis.quran.foundation/search/v1/search`). It returns `<em>` tags for highlighted words and handles prefix variants well when searching the bare form. However, it does not support lemma search — only text matching. Could complement the engine in the future but doesn't solve the core lemma highlighting problem.

---

## Final Solution

### Architecture

Replaced character-offset highlighting entirely with word-level matching. Three strategies in a single utility file, dispatched based on available data:

```
matchType === 'regex'        → Strategy 3 (RegexB)
matchedTokens.length > 0     → Strategy 1 (ExactTokens)
searchQuery exists            → Strategy 2 (LemmaA)
```

### Strategy 1: Exact Token Matching
For results where the engine provides `matchedTokens` (exact text matches):
- `removeTashkeel(word.text)` compared against `removeTashkeel(token)` with `.trim()`
- Handles trailing pause marks (ۖ ۚ) that leave spaces after stripping

### Strategy 2: Lemma/Root/Fuzzy Fallback (suffixMatch)
For results where `matchedTokens` is empty:
- Uses `endsWith()` instead of `includes()` to handle Arabic prefixes
- `suffixMatch(wordText, queryText)`: strips both with `removeTashkeel`, the shorter string must be a suffix of the longer one
- Correctly matches: `ولسليمان` ↔ `سليمان`, `بالله` ↔ `الله`, `لموسى` ↔ `موسى`
- Correctly rejects: `ما` vs `وسليمان` (not a suffix), `كتابهم` vs `كتاب` (suffix pronoun, not prefix)

### Strategy 3: Regex/Adjacent Highlighting
For multi-word adjacent searches (`matchType === 'regex'`):
- Concatenates `normalizeArabic(word.text)` for each API word, joined by spaces
- Tracks word boundaries (start/end character positions per word)
- Runs the regex pattern against the concatenated string
- Maps match offsets back to word indices
- Uses `normalizeArabic` (not `removeTashkeel`) because the regex engine normalizes hamza internally

### Frozen searchQuery per node
Each node carries its own `searchQuery` in `VerseNodeData`, set once at creation from `explorationNode.searchTerm`. Never mutated by later searches. `ArabicText` reads it as a prop, not from the global store. This prevents cross-node highlight interference.

The Discovery panel still reads `currentSearchTerm` from the global store — correct behavior since it always shows results for the latest search.

---

## Effect on Each Search Mode

| Mode | matchedTokens | Highlight Strategy | Status |
|------|--------------|-------------------|--------|
| Exact | Populated | Strategy 1 (token equality) | Working |
| Lemma | Empty (`matchType: 'none'`) | Strategy 2 (suffixMatch) | Working |
| Root | Empty (`matchType: 'none'`) | Strategy 2 (suffixMatch) | Working — same dispatch as lemma |
| Fuzzy | Empty (`matchType: 'none'`) | Strategy 2 (suffixMatch) | Working — same dispatch as lemma |
| Semantic | Empty (`matchType: 'none'`) | Strategy 2 (suffixMatch) | Working — same dispatch as lemma |
| Regex | Empty (`matchType: 'regex'`) | Strategy 3 (RegexB) | Working |

Root, semantic, and fuzzy all follow the same path as lemma — the engine returns `matchedTokens: []` for all of them, so they fall through to Strategy 2.

---

## Direct Search (Discovery Panel without Seed Verse)

When a user types a query directly in the Discovery panel search bar (without clicking a word on a node):
- `searchDiscovery()` in the store sets `currentSearchTerm` to the typed query
- Discovery items read `currentSearchTerm` from the store for highlighting — this works correctly
- If the user clicks "Add" on a discovery result, `addVerseNode` sets `explorationNode.searchTerm = explorer.getCurrentSearchTerm()` — the node gets the frozen query

No issues with direct search. The highlighting pipeline is the same.

---

## Files Changed

### Core highlighting
- **`src/lib/highlightWords.ts`** — NEW. Single utility with `getWordHighlights()` entry point, `suffixMatch()`, and three strategy functions. This is the only file that does highlight matching.

### Types
- **`src/types/quran.ts`** — Added `'regex'` to `MatchType` union
- **`src/types/graph.ts`** — Added `searchQuery?: string` to `VerseNodeData`

### API layer
- **`src/services/quranApi.ts`** — Removed `text_imlaei_simple` from API `word_fields` request. Both `text` and `text_simple` on Word objects now map to `text_imlaei`.

### Components
- **`src/features/graph/VerseNode/ArabicText.tsx`** — Accepts `searchQuery` prop, passes it to `getWordHighlights`. No longer subscribes to `currentSearchTerm` from the store. Removed `getHighlightRanges` import and character-offset logic.
- **`src/features/graph/VerseNode/VerseNode.tsx`** — Destructures `searchQuery` from node data, passes to `ArabicText`.
- **`src/features/discovery/DiscoveryItem.tsx`** — Fetches verse from API via `fetchVerse` instead of rendering engine `uthmani` text. Uses `getWordHighlights` with `currentSearchTerm` from store.

### State
- **`src/store/index.ts`** — `toReactFlowNode` copies `explorationNode.searchTerm` → `data.searchQuery`. `addVerseNode` sets `explorationNode.searchTerm` when applying searchMeta from Discovery.

### Deleted
- **`src/components/HighlightedArabic.tsx`** — Removed. Was the only consumer of `getHighlightRanges` for UI rendering. No longer needed.

---

## Key Methods to Know

| Method | File | Purpose |
|--------|------|---------|
| `getWordHighlights()` | `src/lib/highlightWords.ts` | Main entry point — dispatches to correct strategy |
| `suffixMatch()` | `src/lib/highlightWords.ts` | Arabic prefix-aware word comparison using `endsWith` |
| `getHighlights_ExactTokens()` | `src/lib/highlightWords.ts` | Strategy 1 — `removeTashkeel` equality |
| `getHighlightPositions_LemmaA()` | `src/lib/highlightWords.ts` | Strategy 2 — suffix matching fallback |
| `getHighlightPositions_RegexB()` | `src/lib/highlightWords.ts` | Strategy 3 — concatenated string + regex offset mapping |
| `fetchVerse()` | `src/services/quranApi.ts` | Fetches verse with word objects from quran.com API (7-day cache) |
| `searchWord()` | `src/services/quranSearch.ts` | Searches via quran-search-engine package |
| `searchRegex()` | `src/services/quranSearch.ts` | Regex/adjacent search via engine |
| `buildAdjacentPattern()` | `src/services/quranSearch.ts` | Builds regex pattern from selected words (already uses `normalizeArabic`) |
| `toReactFlowNode()` | `src/store/index.ts` | Converts ExplorationNode to ReactFlow node, copies `searchTerm` → `searchQuery` |

---

## Known Limitations

1. **Lemma suffix matching is heuristic, not linguistic.** `suffixMatch` handles common Arabic prefixes (و، ف، ب، ل، ال، etc.) but does not understand morphology. A word like `كتابهم` (with suffix pronoun هم) will NOT match query `كتاب` — which is correct behavior (suffix pronouns change meaning), but edge cases may exist with less common prefix/suffix combinations.

2. **Regex highlighting requires `normalizeArabic` on the query before search.** The engine normalizes hamza internally. If the query contains أ/إ/آ and is not normalized before calling `search()` with `isRegex: true`, the engine returns 0 results. `buildAdjacentPattern` already handles this. Any new regex search path must do the same.

3. **Short query words may over-match in lemma mode.** A 2-character query like `من` will match any word ending in `من` (e.g. `المؤمنين` ends with `ين` not `من`, so this specific case is fine). But very short queries increase the chance of coincidental suffix matches. This has not been a problem in practice.

4. **Discovery panel fetches verses on mount.** Each `DiscoveryItem` calls `fetchVerse` when rendered. The 7-day cache makes repeat views instant, but the first render of 50 discovery results triggers up to 50 API calls (many will be cache hits from graph nodes). No performance issue observed but worth noting.

5. **`text_imlaei_simple` is no longer requested from the API.** The `word_fields` parameter was changed to remove it. If any future feature needs the simplified form, it must be re-added to the API request and the Word type.

---

## Test Scripts (not committed)

These scripts were used during investigation and remain in the repo root for future debugging:

- `test-lemma.mjs` — Tests engine lemma search output and matchedTokens
- `test-mapping.mjs` — Compares API word indices vs morphologyMap indices
- `test-api-vs-morph.mjs` — Bulk comparison of API word count vs morphology lemma count
- `test-search-api.mjs` — Tests the Quran.Foundation Search API (authenticated)
- `test-highlight-investigation.mjs` — Unified lemma + regex highlighting investigation
- `highlight-investigation.mjs` — Comprehensive 107-test investigation (lemma + regex + edge cases)
- `lemma-highlight-fix.mjs` — Focused test proving `endsWith` over `includes`
- `verify-lemma-methods.mjs` — Tests morphologyMap and wordMap lemma extraction
