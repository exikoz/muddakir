# Verse Node Redesign & Word-by-Word Highlighting

## Overview

This document covers the major changes to the verse node UI, toolbar, side panel system, word builder, and audio playback with word-by-word highlighting.

## Toolbar Changes

### Unified Search
- Merged `SeedInput` (verse key lookup) and `TextSearch` (word search) into a single `UnifiedSearch` component.
- Detects verse key patterns (`\d{1,3}:\d{1,3}`) automatically — verse keys go to `addVerseNode`, free text goes to `searchDiscovery`.
- Mode filter (Exact/Lemma/Root/Fuzzy/Semantic) is integrated as an inline pill inside the search bar with a "by {mode}" label.

### Button Labels & Colors
- All toolbar buttons now have visible translated labels (EN + AR) via `react-i18next`.
- Unified color palette: each button has a unique color (amber, violet, teal, sky, indigo, orange) using the same `-50`/`-600`/`-300` pattern.
- Layout: canvas actions (left) → search + filter (center) → panel toggles + utilities (right).

## Side Panel Independence

The `sidePanelStore` was rewritten to track `leftPanel` and `rightPanel` independently.

- `PANEL_SIDE` config map defines which side each panel belongs to.
- Opening a panel only closes panels on the same side.
- Mushaf (left) stays open when Discovery/AI Scope/Workspace (right) are toggled.
- To add a new panel: add to `PanelId` union and `PANEL_SIDE` map.

## Word Builder

Replaced instant word search with a click-to-build pattern:

- `wordBuilderStore.ts` — dedicated Zustand store for selected words.
- `WordBuilder.tsx` — floating bar above the graph canvas showing accumulated words.
- **1 word** → Search uses the toolbar mode filter (Exact/Lemma/Root/etc.)
- **2+ words** → Search uses adjacent regex (`buildAdjacentPattern`)
- Free mode (non-adjacent AND search) kept in code but not exposed in UI.

## Verse Node — Linear Grid Redesign

Shifted to a "Linear / Technical Grid / Bento" aesthetic:

### Structure
- Outer container: `rounded-xl`, `border border-gray-200/60`, no shadows.
- All internal elements are flush rectangular cells separated by 1px borders.
- No `border-radius` on internal buttons, no gaps between cells.

### Top Bar
`[Previous Verse (w-[120px])] [Surah Name · Verse Key (flex-1)] [Bookmark|Info|AI|Close (w-9 each)]`

### Body
- `min-h-[130px]`, `flex flex-col justify-center items-end`
- Arabic text (RTL, `font-arabic`, `text-2xl`, `leading-loose`)
- Translation below with border separator

### Bottom Bar
`[Next Verse (w-[120px])] [Play / Audio Player (flex-1)] [Read in Mushaf (w-[120px])]`

- Previous/Next buttons have identical fixed width and left-aligned content for vertical alignment.
- Audio player swaps only the center cell — Next and Mushaf buttons always visible.

### Quiet Grid
- Internal borders: `border-gray-200/60` (very light at rest)
- Utility text/icons: `text-gray-400` default, `group-hover:text-gray-600` on node hover
- Active states (bookmark, detail, AI scope) use `!text-{color}` to stay visible always
- Arabic verse text stays fully readable at all times

## Audio System — Chapter Audio Playback

### Architecture Change
Switched from verse-by-verse audio files to chapter audio playback:

- **Before**: Played individual verse MP3s (e.g. `AbdulBaset/Mujawwad/mp3/004069.mp3`)
- **After**: Plays the full chapter audio file and seeks to the verse's start position

This ensures word-by-word highlighting timestamps match perfectly since they come from the same recording.

### Components
- `audioStore.ts` — Added `verseStartTime`/`verseEndTime` for verse range tracking, `isLoading` for loading indicator.
- `useAudioPlayer.ts` — Loads chapter audio via `fetchChapterAudio()`, seeks to verse start, auto-stops at verse end.
- `audioConfig.ts` — Added `chapterReciterId` to each reciter config (maps recitation IDs to chapter reciter IDs for the segments API).

### Word-by-Word Highlighting
- `useWordHighlighting.ts` — Hook that fetches word timestamps and uses `requestAnimationFrame` for smooth tracking.
- `fetchChapterAudio()` in `verseDetailApi.ts` — Fetches chapter audio URL + all verse timings + word segments in one request. Cached per chapter+reciter.
- Timestamps are absolute (ms within chapter audio) — no normalization needed.
- Highlighting style: `bg-sky-100 text-sky-900 ring-2 ring-sky-400/50 scale-[1.03]`

### Reciter ID Mapping
| Reciter | recitationId (verse-by-verse) | chapterReciterId (chapter audio) |
|---|---|---|
| Abdul Basit (Mujawwad) | 1 | 1 |
| Al-Minshawi (Murattal) | 9 | 9 |
| Al-Husary (Murattal) | 6 | 6 |

### Known Issue
Al-Minshawi's word highlighting may be slightly off-sync. The chapter audio recording (`siddiq_minshawi/murattal/`) and the verse-by-verse recording (`Minshawi/Murattal/`) are different sources. The segment data from the API may not perfectly match the chapter audio timing for this specific reciter. Abdul Basit and Al-Husary work correctly.

### MiniPlayer (Linear Grid)
- Progress bar flush at top of the center cell
- Controls: Play/Pause | Stop | Time (verse-relative) | Reciter settings
- All flush cells with 1px borders, no rounded corners
- Loading spinner shown while audio buffers

## Verse Node Header
Shows surah name alongside verse key (e.g. "Al-Baqarah · 2:255" / "البقرة · 2:255") using the existing `getSurahName()` utility with full AR/EN translation support.
