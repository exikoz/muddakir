# Undo/Redo System Fix

## Problem Summary

The undo/redo system was only snapshotting ReactFlow visual state (`nodes[]`, `edges[]`) but not the business logic layer (`VerseExplorer`) or the per-node discovery cache (`discoveryCacheStore`). This caused a cascade of bugs after any undo or redo operation.

## Architecture Context

The app uses a three-layer architecture:

```
┌──────────────────────────────────────────────────┐
│              UI Layer (React)                    │
│   VerseNode, NodeActions, UndoRedo buttons       │
└──────────────────┬───────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────┐
│           Adapter Layer (Zustand Store)           │
│   nodes[], edges[], pushHistory, undo, redo      │
│   Bridges VerseExplorer ↔ ReactFlow              │
└──────────────────┬───────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────┐
│        Core Business Logic (VerseExplorer)        │
│   Map<id, ExplorationNode>, parent-child tree,   │
│   lastSearchSourceId, currentSearchTerm          │
└──────────────────────────────────────────────────┘
```

The undo/redo system sits in the Adapter Layer but was only capturing its own state, not the Core layer beneath it.

## Bugs Fixed

### Bug 1+2: Explorer Desync (Critical)

**Before:** Undo restored visual nodes/edges, but `VerseExplorer` still had the post-action state. Deleting a restored node failed silently because `explorer.getNode(id)` returned `undefined`. Edges appeared disconnected because the explorer's parent-child tree was stale.

**After:** `undo()` and `redo()` now call `explorer.importState(snapshot.explorerState)` to sync the business logic layer with the visual state.

```
BEFORE                              AFTER
──────                              ─────
Snapshot: { nodes, edges }          Snapshot: { nodes, edges,
                                               explorerState,
undo() → set nodes/edges                      discoveryCache }
         (explorer stale!)
                                    undo() → set nodes/edges
                                           + explorer.importState()
                                           + discoveryCacheStore.restoreSnapshot()
```

### Bug 3: Discovery Cache Lost on Undo

**Before:** `deleteNode()` called `discoveryCacheStore.evict()` permanently. Undo restored the node visually but the "Show search results" button (Layers icon) was gone.

**After:** Discovery cache state is captured in each snapshot and restored on undo/redo.

### Bug 6: Multiple History Entries Per Action

**Before:** One word click triggered `searchFromWord` which added 3 nodes. Each `_addReactFlowNode` call pushed a separate history entry. User had to press Ctrl+Z three times for what felt like one action.

**After:** Added a batching mechanism (`_beginHistoryBatch` / `_endHistoryBatch`). Multi-node operations produce a single history entry.

```
BEFORE: Word click → 3 pushHistory() calls → 3 undo steps
AFTER:  Word click → 1 pushHistory() call  → 1 undo step
```

## What Changed

### `src/types/graph.ts`
- Expanded `Snapshot` interface to include `explorerState` and `discoveryCache`
- Added `ExplorerSnapshot` and `DiscoveryCacheSnapshot` types

### `src/store/discoveryCacheStore.ts`
- Added `exportSnapshot()` — serializes cache Map + activeNodeId
- Added `restoreSnapshot()` — restores cache from a snapshot

### `src/store/index.ts`
- `pushHistory()` — now captures explorer state + discovery cache in each snapshot
- `undo()` / `redo()` — now restores explorer state + discovery cache
- `_addReactFlowNode()` — no longer auto-pushes history (callers handle it)
- `_beginHistoryBatch()` / `_endHistoryBatch()` — new batching mechanism
- `searchFromWord()` — wrapped in batch, produces single history entry
- `executeMultiWordSearch()` — wrapped in batch, produces single history entry
- `addVerseNode()` — explicit `pushHistory()` at end of operation
- `addSequentialVerse()` — explicit `pushHistory()` at end of operation

### `src/store/workspaceStore.ts`
- Updated `restoreState()` to create initial snapshot with new format (includes `explorerState` and `discoveryCache`)

## Data Flow Diagrams

### Snapshot Capture (pushHistory)

```
pushHistory()
    │
    ├─► Read nodes[] and edges[] from Zustand store
    │
    ├─► Read explorer.exportState()
    │     └─► { nodes: Map entries, lastSearchSourceId, currentSearchTerm }
    │
    ├─► Read discoveryCacheStore.exportSnapshot()
    │     └─► { cache: Map entries, activeNodeId }
    │
    └─► Push combined Snapshot to history[]
          └─► { nodes, edges, explorerState, discoveryCache, timestamp }
```

### Undo/Redo Restore

```
undo() / redo()
    │
    ├─► Get target snapshot from history[newIndex]
    │
    ├─► explorer.importState(snapshot.explorerState)
    │     └─► Rebuilds internal Map, restores search context
    │
    ├─► discoveryCacheStore.restoreSnapshot(snapshot.discoveryCache)
    │     └─► Rebuilds cache Map, restores activeNodeId
    │
    └─► set({ nodes, edges, historyIndex, canUndo, canRedo })
          └─► ReactFlow re-renders with restored visual state
```

### Batched Operations (searchFromWord example)

```
searchFromWord(nodeId, wordIndex)
    │
    ├─► _beginHistoryBatch()          ← sets _historyBatching = true
    │
    ├─► _addReactFlowNode(node1)      ← pushHistory() is a no-op (batching)
    ├─► _addReactFlowEdge(edge1)
    ├─► _addReactFlowNode(node2)      ← pushHistory() is a no-op (batching)
    ├─► _addReactFlowEdge(edge2)
    ├─► _addReactFlowNode(node3)      ← pushHistory() is a no-op (batching)
    ├─► _addReactFlowEdge(edge3)
    │
    ├─► Update discovery panel + cache
    │
    └─► _endHistoryBatch()            ← sets _historyBatching = false
          └─► pushHistory()           ← ONE snapshot for the entire operation
```

## Scope

The undo/redo system is scoped to canvas state only:
- Nodes (verse nodes + note nodes)
- Edges (search edges + sequential edges)
- Explorer business logic (parent-child relationships, search context)
- Per-node discovery cache (search results tied to nodes)

Explicitly out of scope:
- Side panel open/close state
- Mushaf panel state
- Audio player state
- UI preferences (search options, layout mode)
