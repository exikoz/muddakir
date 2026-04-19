# Mobile Companion View — Design Document

## 1. Overview

A mobile-optimized companion view for Muddakir that shares the same data layer and workspace persistence as the desktop ReactFlow-based app. The mobile view replaces the graph canvas with a vertical timeline/thread UI inspired by GitHub issue threads, while preserving all core exploration features.

## 2. Device Detection Strategy

### Approach: User-Agent + Touch Capability (not viewport width)

We do NOT rely on `window.innerWidth` — resizing a desktop browser must never trigger mobile mode.

```ts
// src/lib/deviceDetect.ts
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  // 1. Check User-Agent for mobile OS identifiers
  const ua = navigator.userAgent || ''
  const mobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)

  // 2. Check for coarse pointer (touch-primary device)
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false

  // 3. Check maxTouchPoints (iPads in desktop mode report > 0)
  const hasTouchPoints = navigator.maxTouchPoints > 0

  // 4. Check platform for mobile OS
  const mobilePlatform = /Android|iPhone|iPad|iPod/i.test(navigator.platform || '')

  // Must match UA OR (coarse pointer + touch points + mobile platform)
  // This prevents desktop touchscreens from triggering mobile mode
  return mobileUA || (coarsePointer && hasTouchPoints && mobilePlatform)
}
```

Key properties:
- Desktop browser resized to 320px → stays desktop
- iPad in desktop-mode Safari → detected as mobile (via `maxTouchPoints` + platform)
- Desktop with touchscreen → stays desktop (UA won't match mobile OS)
- The detection runs once at app boot and is stored in a Zustand atom — no re-evaluation on resize

## 3. Routing Architecture

Single entry point, two shells. No separate build or URL.

```
App.tsx
├── /auth/callback → AuthCallback (unchanged)
├── isMobileDevice() === true → <MobileShell />
└── isMobileDevice() === false → <DesktopShell /> (current AppContent)
```

Both shells share:
- All Zustand stores (graphStore, workspaceStore, sidePanelStore, etc.)
- `VerseExplorer` core engine
- All services (quranApi, quranSearch, aiScopeService)
- i18n, auth, audio

The `MobileShell` does NOT use `ReactFlowProvider` — it renders its own components that read from the same store.

## 4. Workspace Protocol (Shared Data Format)

The existing `WorkspaceData` type is already the "protocol" — it's framework-agnostic:

```ts
interface WorkspaceData {
  version: 1
  meta: WorkspaceMeta
  nodes: VerseNode[]        // position data ignored on mobile
  edges: VerseEdge[]        // relationship data used for thread grouping
  searchOptions: SearchOptions
  multiWordMode: boolean
  adjacentMode: boolean
  useAutoLayout: boolean
  explorerState: ExplorerSnapshot
  history: Snapshot[]
  historyIndex: number
}
```

### What each "engine" uses:

| Field | Desktop | Mobile |
|-------|---------|--------|
| `nodes[].position` | ReactFlow positioning | Ignored (vertical layout) |
| `nodes[].data` | Full verse data | Full verse data |
| `edges[].data.edgeType` | Edge rendering | Thread grouping logic |
| `edges[].data.searchTerm` | Edge label | Connection label in thread |
| `edges[].data.matchType` | Edge color | Connection line color |
| `explorerState` | Core business logic | Core business logic |

### Sync behavior:
- Work on mobile → save workspace → open on desktop → nodes get auto-positioned (existing `toReactFlowNode` logic handles this)
- Work on desktop → save workspace → open on mobile → positions ignored, thread built from edges
- Both use the same IndexedDB store (`muddakir` database, `workspaces` object store)

## 5. Mobile UI Architecture

### 5.1 Thread View (replaces ReactFlow canvas)

Inspired by GitHub issue threads. Vertical scrollable timeline.

```
┌─────────────────────────────┐
│ 🔍 Search / Seed Input      │  ← Sticky top bar
├─────────────────────────────┤
│                             │
│  ┌─ Verse Card (2:255) ────┐│  ← Root node
│  │ بِسْمِ اللَّهِ ...       ││
│  │ [Translation]            ││
│  │ 🔖 ℹ️ ✨ 🗑️              ││
│  └──────────────────────────┘│
│         │                    │
│    ┌────┤ "الْكُرْسِيّ" (lemma)│  ← Search term label on connector
│    │    │                    │
│    │  ┌─ Results Group ─────┐│  ← Grouped results from this search
│    │  │ ┌ Verse (20:5) ────┐││
│    │  │ │ [Arabic + Trans] │││
│    │  │ │ 🔖 ℹ️ ✨ 🗑️       │││
│    │  │ └──────────────────┘││
│    │  │ ┌ Verse (7:54) ────┐││
│    │  │ │ [Arabic + Trans] │││
│    │  │ └──────────────────┘││
│    │  │ + 12 more results   ││  ← Tap to expand all
│    │  └─────────────────────┘│
│    │                         │
│    ├── "رَبّ" (root)         │  ← Another search from same parent
│    │  ┌─ Results Group ─────┐│
│    │  │ ...                 ││
│    │  └─────────────────────┘│
│         │                    │
│    ┌────┤ from (20:5)        │  ← Nested: search from a child node
│    │  ┌─ Results Group ─────┐│
│    │  │ ...                 ││
│    │  └─────────────────────┘│
│                              │
│  ┌─ 📝 Note ───────────────┐│  ← Note node (standalone)
│  │ My study notes...        ││
│  └──────────────────────────┘│
│                              │
│  ┌─ Verse Card (3:18) ─────┐│  ← Another root node
│  │ ...                      ││
│  └──────────────────────────┘│
│                              │
└─────────────────────────────┘
```

### 5.2 Connection Lines

Left-side vertical connector lines (like GitHub threads):
- Colored by `matchType` (same palette as desktop edge colors)
- Labeled with the search term (Arabic word)
- Indentation level shows depth (max 2-3 levels, then flatten with breadcrumb)
- Each group has a colored dot/icon at the branch point

### 5.3 Result Groups

When searching from a word on mobile:
- ALL results shown in a collapsible group (not just top 3 like desktop)
- Initially shows first 5, "Show N more" button to expand
- Each result has an "Add to workspace" button (adds to the thread)
- Added results appear inline in the group with full verse card treatment
- Non-added results show as compact rows (verse key + snippet)

### 5.4 Component Hierarchy

```
MobileShell
├── MobileToolbar          (search, workspace, settings)
├── MobileThreadView       (main scrollable content)
│   ├── MobileVerseCard    (verse display + actions)
│   ├── MobileConnector    (vertical line + label)
│   ├── MobileResultGroup  (collapsible search results)
│   ├── MobileNoteCard     (editable note)
│   └── MobileWelcome      (seed input when empty)
├── MobileBottomNav        (Mushaf, Search, Workspaces, AI)
└── MobileFullScreenPanel  (verse detail, mushaf reader, AI scope)
    ├── MobileVerseDetail
    ├── MobileMushafReader
    └── MobileAIScope
```

### 5.5 Navigation

Bottom navigation bar with 4 tabs:
1. **Explorer** — The thread view (default)
2. **Mushaf** — Full-screen Mushaf reader
3. **AI** — AI Scope chat
4. **Workspaces** — Save/load/switch

Full-screen panels (verse detail, mushaf from "open in mushaf") slide up from bottom with a back/close button.

### 5.6 Word Selection on Mobile

- Tap a word → immediate single-word search (shows results inline)
- Long-press a word → enters multi-word selection mode
  - Selected words highlighted with chips at top (like desktop WordBuilder)
  - Tap more words to add
  - "Search" FAB appears
- This replaces the desktop click-to-search behavior

## 6. Thread Building Algorithm

The mobile view needs to convert the flat `nodes[]` + `edges[]` into a tree structure for rendering:

```ts
interface ThreadTree {
  node: VerseNode | NoteNode
  searchTerm?: string        // from edge data
  matchType?: MatchType      // from edge data
  children: ThreadGroup[]    // grouped by search term
}

interface ThreadGroup {
  searchTerm: string
  matchType: MatchType
  sourceNodeId: string
  addedNodes: ThreadTree[]   // nodes added to workspace
  pendingResults: SearchResult[]  // from discovery cache, not yet added
}
```

Algorithm:
1. Find root nodes (nodes with no incoming `search` edges)
2. For each root, recursively build tree following edges
3. Group children by `edge.data.searchTerm` (same search = same group)
4. Sequential edges (prev/next) rendered as inline expansion, not separate groups
5. Note nodes without edges rendered as standalone items between roots
6. Orphan nodes (connected only via note edges) rendered at root level

## 7. Feature Parity Matrix

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Seed verse by key | ✅ Welcome + Toolbar | ✅ Welcome + Toolbar |
| Text search | ✅ UnifiedSearch | ✅ MobileToolbar |
| Word click → search | ✅ Click word | ✅ Tap word |
| Multi-word search | ✅ WordBuilder | ✅ Long-press + chips |
| Search modes (lemma/root/etc) | ✅ Mode selector | ✅ Mode selector |
| View all results | ✅ Discovery panel (overflow) | ✅ Inline result group (all) |
| Add result to workspace | ✅ Discovery "Add" button | ✅ Result group "Add" button |
| Node connections | ✅ ReactFlow edges | ✅ Thread connector lines |
| Bookmark | ✅ NodeActions | ✅ MobileVerseCard actions |
| Verse details | ✅ Side panel | ✅ Full-screen panel |
| AI Scope | ✅ Side panel | ✅ Full-screen / bottom tab |
| Mushaf reader | ✅ Side panel | ✅ Full-screen / bottom tab |
| Open in Mushaf | ✅ Button on node | ✅ Button on card |
| Notes | ✅ Draggable note nodes | ✅ Inline note cards |
| Audio playback | ✅ MiniPlayer on node | ✅ MiniPlayer on card |
| Workspaces (save/load) | ✅ WorkspacePanel | ✅ Bottom tab |
| Undo/Redo | ✅ Toolbar buttons | ✅ Toolbar buttons |
| Sequential verses | ✅ Up/down arrows | ✅ Up/down arrows on card |
| Drag/reposition nodes | ✅ ReactFlow drag | ❌ Not applicable |
| Zoom/pan canvas | ✅ ReactFlow zoom | ❌ Native scroll instead |
| Auto-layout | ✅ Dagre layout | ❌ Thread layout is automatic |

## 8. Implementation Plan

### Phase 1: Foundation
1. Create `src/lib/deviceDetect.ts` — device detection utility
2. Create `src/store/mobileStore.ts` — mobile-specific UI state (active tab, expanded groups, etc.)
3. Refactor `App.tsx` to branch on device type
4. Create `MobileShell.tsx` — the mobile app shell (no ReactFlowProvider)
5. Create `MobileProviders.tsx` — providers without ReactFlow

### Phase 2: Core Mobile Components
6. `MobileToolbar.tsx` — search + mode selector + actions
7. `MobileBottomNav.tsx` — tab navigation
8. `MobileWelcome.tsx` — seed input (adapted from WelcomeState)
9. `MobileVerseCard.tsx` — verse display with actions (adapted from VerseNode)
10. `MobileNoteCard.tsx` — editable note (adapted from NoteNode)

### Phase 3: Thread View
11. `MobileThreadView.tsx` — main scrollable thread
12. `MobileConnector.tsx` — vertical connection lines with labels
13. `MobileResultGroup.tsx` — collapsible search results
14. `useThreadTree.ts` — hook to build thread tree from nodes/edges
15. Thread building algorithm implementation

### Phase 4: Full-Screen Panels
16. `MobileFullScreenPanel.tsx` — slide-up panel container
17. `MobileVerseDetail.tsx` — verse detail (adapted from VerseDetailPanel)
18. `MobileMushafReader.tsx` — mushaf reader (adapted from MushafPanel)
19. `MobileAIScope.tsx` — AI chat (adapted from AIScopePanel)

### Phase 5: Interactions
20. Word tap → search integration
21. Long-press → multi-word selection
22. Result group expand/collapse
23. Add result to workspace from mobile
24. Audio playback on mobile cards

### Phase 6: Workspace Sync
25. Workspace save/load on mobile (same IndexedDB)
26. Mobile workspace panel
27. Test cross-device workflow (mobile → desktop, desktop → mobile)

## 9. File Structure

```
src/
├── lib/
│   └── deviceDetect.ts              # Device detection
├── mobile/
│   ├── MobileShell.tsx              # Mobile app shell
│   ├── MobileProviders.tsx          # Providers (no ReactFlow)
│   ├── components/
│   │   ├── MobileToolbar.tsx        # Top bar with search
│   │   ├── MobileBottomNav.tsx      # Bottom tab navigation
│   │   ├── MobileVerseCard.tsx      # Verse card with actions
│   │   ├── MobileNoteCard.tsx       # Editable note card
│   │   ├── MobileConnector.tsx      # Thread connection lines
│   │   ├── MobileResultGroup.tsx    # Collapsible search results
│   │   ├── MobileWelcome.tsx        # Empty state / seed input
│   │   └── MobileWordBuilder.tsx    # Multi-word selection chips
│   ├── views/
│   │   ├── MobileThreadView.tsx     # Main thread/timeline view
│   │   ├── MobileVerseDetail.tsx    # Full-screen verse detail
│   │   ├── MobileMushafReader.tsx   # Full-screen mushaf
│   │   ├── MobileAIScope.tsx        # Full-screen AI chat
│   │   └── MobileWorkspaces.tsx     # Workspace management
│   ├── hooks/
│   │   └── useThreadTree.ts         # Build thread from nodes/edges
│   └── store/
│       └── mobileStore.ts           # Mobile-specific UI state
├── store/
│   └── (existing stores — shared)
└── app/
    └── App.tsx                      # Updated with device branching
```

## 10. Key Design Decisions

1. **Same URL, same build** — No separate mobile app or route prefix. Detection at boot time.
2. **Same stores** — Mobile reads/writes the same Zustand stores. No data duplication.
3. **Position data is desktop-only** — Mobile ignores `node.position`, desktop auto-positions nodes that come from mobile (they'll have default positions).
4. **All results on mobile** — No 3-node limit. Mobile shows all results in collapsible groups since there's no canvas space constraint.
5. **Thread depth limit** — Flatten after 3 levels of nesting to prevent excessive indentation on narrow screens. Show breadcrumb trail for deep paths.
6. **No ReactFlow on mobile** — The `ReactFlowProvider` is only wrapped around the desktop shell, saving significant bundle size on mobile.
7. **Full-screen panels** — Side panels don't work on mobile. Everything that was a side panel becomes a full-screen view with back navigation.
