# Similar Phrases (Mutashabihat) Tab — Implementation Notes

## What Was Done

Added a "Similar Phrases" tab to the verse detail panel that shows shared/repeated phrases (mutashabihat) across Quranic verses using static data from the Tarteel QUL dataset.

### Files Created

- **`src/services/mutashabihatService.ts`** — Lazy-loading service that fetches `phrases.json` and `phrase_verses.json` from `public/data/` on first access. Caches in memory permanently (data is static). Exposes `getPhrasesForVerse(verseKey)` which resolves phrase IDs to full phrase metadata.

- **`src/features/verseDetail/sections/SimilarPhrasesSection.tsx`** — Tab content component with three sub-components:
  - `SimilarPhrasesSection` — Main section, fetches phrases for the current verse, renders phrase cards.
  - `PhraseCard` — Shows the full verse text with all phrases highlighted simultaneously (each phrase a different color), stats line, and expandable "View all" verse list.
  - `VerseRow` — Individual verse in the expanded list, fetches verse data via existing `quranApi`, highlights shared words, has "Add to canvas" button using the existing `addVerseNode` Zustand action.

- **`public/data/phrases.json`** and **`public/data/phrase_verses.json`** — Static QUL mutashabihat data served from public directory.

### Files Modified

- **`src/features/verseDetail/VerseDetailPanel.tsx`** — Added `similar` tab (Lucide `Repeat` icon) between Tafsir and AI Insight. Uses `React.lazy` + `Suspense` so phrase data only loads when the tab is first opened.

- **`src/features/verseDetail/types.ts`** — Added TypeScript types: `WordRange`, `PhraseSource`, `PhraseEntry`, `PhrasesData`, `PhraseVersesData`, `ResolvedPhrase`.

- **`src/i18n/locales/en/verseDetail.json`** and **`src/i18n/locales/ar/verseDetail.json`** — Added 8 translation keys for the tab label, stats, empty state, and action buttons.

## Issues Encountered & Solutions

### 1. Data Loading — Dynamic `import()` for Root JSON Files

**Problem:** The initial implementation used Vite dynamic `import()` to load `phrases.json` and `phrase_verses.json` from the project root. These files are outside the `tsconfig.app.json` include path (`"include": ["src"]`), and Vite's JSON module handling for 800+ key objects via dynamic import can produce incomplete or incorrectly shaped module objects at runtime.

**Solution:** Moved the JSON files to `public/data/` and switched to `fetch()` against `import.meta.env.BASE_URL + 'data/...'`. This is the standard Vite pattern for large static data files and avoids all JSON module resolution issues. The fetch-once-and-cache-in-memory pattern is preserved.

### 2. Multi-Phrase Highlighting

**Problem:** Each phrase card initially only highlighted its own phrase's words in the verse text. The requirement was to highlight ALL phrases simultaneously with distinct colors.

**Solution:** Added `buildHighlightMap()` which builds a `position → color` map across all phrases for the current verse. First matching phrase wins for overlapping word positions. Each card receives `allPhrases` and renders the full highlight map. Cards are visually distinguished by a colored left border accent.

### 3. Verse 41:21 — "Missing" Phrases

**Problem:** User reported 41:21 shows no phrases when QUL should have data for it.

**Investigation:**
- `phrase_verses.json` has 2,232 verse keys (35.8% of 6,236 total Quran verses)
- `phraseVerses["41:21"]` returns `undefined` — the key does not exist in the dataset
- No phrase in `phrases.json` references 41:21 in its `ayah` map either
- Cross-verified against the live Tarteel MCP API (`ayah_mutashabihat` tool) — it also returns `"phrase_ids": [], "phrases": []` for 41:21
- Key format is correct: standard `chapter:verse` with colon delimiter, no spacing or leading zeros

**Conclusion:** Not a code or loading bug. Verse 41:21 genuinely has no shared phrases in the QUL mutashabihat dataset. Chapter 41 has 15 other verses with phrases, just not verse 21.

## Remaining Issues / Future Work

1. **Dataset coverage is ~36%** — 4,004 of 6,236 verses have no mutashabihat data. The empty state message ("No similar phrases found for this verse") is shown for these. If a more comprehensive dataset becomes available from QUL, replacing the two JSON files in `public/data/` is all that's needed.

2. **No phrase text preview** — Each card shows the full verse text with highlights. A future improvement could extract and display just the shared phrase words as a standalone label above the full verse.

3. **Verse row fetching** — When expanding "View all" on a phrase with many verses, each `VerseRow` fetches its verse data individually via the existing cached `fetchVerse()`. For phrases appearing in 70+ verses, this could mean many sequential API calls. A batch-fetch or virtual scrolling approach could improve performance for very large phrase groups.

4. **No cross-navigation breadcrumb** — Tapping a verse key in the expanded list replaces the detail panel content (navigates to that verse). There's no back-stack or breadcrumb trail to return to the previous verse. The existing `previousPanel` mechanism in `verseDetailStore` only tracks panel-level navigation (AI Scope / Discovery), not verse-to-verse navigation within the detail panel.
