# UI Panel System & Notes Feature — Refactor Log

## Overview

This document covers the changes made across several sessions to fix the sidebar panel system, add note nodes to the graph canvas, and resolve the resulting integration issues.

---

## 1. Sidebar Panel Docking (below toolbar)

### Problem
All sidebar panels (Mushaf, Discovery, AI Scope, Verse Detail, Workspace) used `fixed inset-y-0` positioning, stretching from the top of the viewport to the bottom. This covered the toolbar completely, making it impossible to see which toggle button was active or switch between panels without first closing the current one.

A "back button" approach was attempted in `VerseHeader` (tracking `previousPanel` in `verseDetailStore`) but it was fragile and didn't solve the core UX issue.

### Solution
Changed all four fixed-position panels from `inset-y-0` to `top-12 bottom-0` so they dock below the 48px toolbar. Bumped the toolbar's z-index from `z-50` to `z-[60]` to ensure it always stays on top.

### Files changed
- `src/features/verseDetail/VerseDetailPanel.tsx`
- `src/features/mushaf/MushafPanel.tsx`
- `src/features/aiScope/AIScopePanel.tsx`
- `src/features/discovery/DiscoveryPanel.tsx`
- `src/features/toolbar/Toolbar.tsx`

---

## 2. Centralized Side Panel State (`sidePanelStore`)

### Problem
Each panel had its own independent open/close boolean (`isMushafOpen`, `isDiscoveryOpen`, `aiScopeStore.isOpen`, `verseDetailStore.isOpen`, `workspaceStore.isPanelOpen`). Nothing prevented multiple panels from being open simultaneously, causing them to stack on top of each other.

### Solution
Created `src/store/sidePanelStore.ts` — a single Zustand store with one `activePanel` field. Only one panel can be open at a time. All toggle buttons, close buttons, and cross-panel navigation now go through this store.

### How it's wired

```
sidePanelStore.activePanel: PanelId | null
  where PanelId = 'discovery' | 'mushaf' | 'workspace' | 'aiScope' | 'verseDetail'
```

- **Toolbar toggles** (`AIScopeToggle`, `DiscoveryToggle`, `MushafToggle`, `WorkspaceToggle`) call `sidePanelStore.toggle(panelId)`.
- **Panel close buttons** call `sidePanelStore.close(panelId)`.
- **Panel visibility** is derived from `sidePanelStore.activePanel === panelId`.
- **Cross-panel navigation** (e.g. "Back to AI Scope" in VerseHeader, "Ask more" in verse detail opening AI Scope) calls `sidePanelStore.open(targetPanel)`.
- **Store-level auto-opens** (e.g. search results opening Discovery, `openMushaf` opening Mushaf) also call `useSidePanelStore.getState().open(...)` alongside setting their internal data flags.

### Important: old flags still exist
The per-store booleans (`isDiscoveryOpen`, `isMushafOpen`, etc.) still exist in their respective stores for internal data tracking and workspace save/restore. But **visibility** is entirely driven by `sidePanelStore.activePanel`. This avoids a massive refactor of the data layer while fixing the UX.

### Files changed
- `src/store/sidePanelStore.ts` (new)
- `src/features/toolbar/AIScopeToggle.tsx`
- `src/features/toolbar/DiscoveryToggle.tsx`
- `src/features/toolbar/MushafToggle.tsx`
- `src/features/toolbar/WorkspaceToggle.tsx`
- `src/features/toolbar/TextSearch.tsx`
- `src/features/workspace/useWorkspaceKeyboard.ts`
- `src/features/workspace/WorkspacePanel.tsx`
- `src/features/discovery/DiscoveryPanel.tsx`
- `src/features/mushaf/MushafPanel.tsx`
- `src/features/aiScope/AIScopePanel.tsx`
- `src/features/verseDetail/VerseDetailPanel.tsx`
- `src/features/verseDetail/sections/VerseHeader.tsx`
- `src/features/graph/VerseNode/NodeActions.tsx`
- `src/store/index.ts`
- `src/store/verseDetailStore.ts`
- `src/store/workspaceStore.ts`

---

## 3. Verse Detail Panel — verse data persistence

### Problem
After the side panel refactor, the Verse Detail panel stopped showing the verse key and surah name. The `close()` action in `verseDetailStore` was setting `verse: null`, which made `VerseHeader` return null (early return on `!verse`). Since visibility is now controlled by `sidePanelStore`, the verse data needs to persist for display even when the detail store's internal `isOpen` is false.

### Solution
Changed `verseDetailStore.close()` to only reset `isOpen` and `previousPanel`, keeping the `verse` object intact. Same for `askMoreAboutVerse` and `askMoreAboutWord` which transition to AI Scope.

### Files changed
- `src/store/verseDetailStore.ts`

---

## 4. Note Nodes on the Canvas

### Problem
Users wanted to add freeform text notes to the graph canvas and connect them to verse nodes via edges.

### Solution
- Created `NoteNode` component (`src/features/graph/NoteNode/NoteNode.tsx`) — a styled card with editable text, random color accent, visible connection handles on left/right/bottom, and a delete button.
- Created `NoteEdge` component (`src/features/graph/NoteEdge/NoteEdge.tsx`) — a dashed edge with a visible × delete button at the midpoint, using ReactFlow's `useReactFlow().deleteElements()` API.
- Added `addNoteNode` action to the main store — places a note at the center of the current viewport.
- Added `AddNoteButton` to the toolbar.
- Updated `deleteNode` in the store to handle note nodes (they aren't tracked by the `VerseExplorer`).
- Registered `note` node type and `note` edge type in `flow-config.ts`.
- `onConnect` in the store detects note edges (source or target starts with `note-`) and assigns `type: 'note'`.

### Architecture note
Note nodes live in the same `nodes` array as verse nodes (ReactFlow requires a single array). The store's `nodes` and `edges` arrays are typed as `any[]` to accommodate mixed node types without fighting the type system. The `NoteNodeData` interface is defined in both `src/types/graph.ts` and the component file.

### Files changed
- `src/features/graph/NoteNode/NoteNode.tsx` (new)
- `src/features/graph/NoteEdge/NoteEdge.tsx` (new)
- `src/features/toolbar/AddNoteButton.tsx` (new)
- `src/app/flow-config.ts`
- `src/features/toolbar/Toolbar.tsx`
- `src/features/graph/GraphCanvas.tsx`
- `src/store/index.ts`
- `src/types/graph.ts`

---

## 5. Note Nodes Breaking Verse Lookups

### Problem
After adding note nodes, any code that iterated over `nodes` and accessed `.data.verse` would crash on note nodes (which have `{ text, color }` instead of `{ verse }`). The error manifested as:
```
TypeError: Cannot read properties of undefined (reading 'verse_key')
```
at `DiscoveryItem.tsx` and would also affect `AIScopeVerseCard`, `AIScopeResponse`, `SimilarPhrasesSection`, and several store functions.

### Root cause
7 locations across the codebase did `nodes.some(n => n.data.verse.verse_key === ...)` or `nodes.map(n => n.data.verse.verse_key)` without filtering for verse nodes first.

### Solution
Added `n.type === 'verse'` guard at each location before accessing `.data.verse`.

### Files changed
- `src/features/discovery/DiscoveryItem.tsx`
- `src/features/aiScope/AIScopeVerseCard.tsx`
- `src/features/aiScope/AIScopeResponse.tsx`
- `src/features/verseDetail/sections/SimilarPhrasesSection.tsx`
- `src/store/index.ts` (4 locations: `addSequentialVerse`, `focusNode`, and 2 `existingVerseKeys` sets)

---

## 6. Canvas Zoom

### Change
Added `minZoom={0.1}` to the `<ReactFlow>` component (default was `0.5`), allowing ~5x more zoom-out range.

### Files changed
- `src/features/graph/GraphCanvas.tsx`

---

## Remaining Issues / Known Gaps

1. **Workspace save/restore doesn't persist note nodes.** The `captureCurrentState` and `restoreState` functions in `workspaceStore.ts` serialize the `nodes` and `edges` arrays, so notes should survive save/restore. However, the `VerseExplorer` doesn't know about notes, so any explorer-level state reconstruction won't include them. This hasn't been tested.

2. **Undo/redo with notes.** The history system snapshots `nodes` and `edges`, so notes should be included. Not explicitly tested.

3. **Old panel booleans are redundant.** `isDiscoveryOpen`, `isMushafOpen`, `aiScopeStore.isOpen`, `verseDetailStore.isOpen`, and `workspaceStore.isPanelOpen` still exist and are still set in various places. They're no longer read for visibility (that's `sidePanelStore`), but they add confusion. A future cleanup could remove them entirely, though `isDiscoveryOpen` and `isMushafOpen` are used in workspace save/restore logic.

4. **Note nodes aren't included in auto-layout.** The `_applyAutoLayout` function in the store passes nodes to `getLayoutedElements`, which likely assumes verse node dimensions. Notes may get weird positioning if auto-layout is enabled.

5. **No persistence of note text edits in history.** Editing a note's text calls `updateNodeData` but doesn't call `pushHistory()`, so text changes aren't undo-able.

6. **`previousPanel` tracking in verseDetailStore.** The back button in VerseHeader still uses `previousPanel` to know where to navigate back to. This works but only tracks `'aiScope'` and `'discovery'` — if verse detail is opened from another context, the back button just closes the panel.
