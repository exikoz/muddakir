# Discovery Panel: Per-Node Result Caching

## Problem

When searching from a verse node, the discovery panel showed overflow results (those not auto-added to the graph). But if you then searched from a different node, the first node's results were lost — no way to revisit them. Additionally, clicking "Add" on a discovery result always connected the new node to whichever verse was searched *most recently*, not the one whose results were currently displayed.

## Solution

### 1. Per-Node Discovery Cache (`src/store/discoveryCacheStore.ts`)

A dedicated Zustand store that caches discovery results keyed by source node ID:

- **`cache`**: `Map<nodeId, { results, searchTerm, searchMode, timestamp }>`
- **`activeNodeId`**: Tracks which node's results are currently shown in the panel (`null` for manual/free searches)
- **`evict(nodeIds)`**: Cleans up cache when nodes are deleted

### 2. Cache Integration (`src/store/index.ts`)

- `searchFromWord` and `executeMultiWordSearch` now cache overflow results after every search
- `deleteNode` evicts cache entries for deleted nodes
- New `showNodeDiscovery(nodeId)` action restores a node's cached results into the discovery panel and syncs the explorer's search term for correct highlighting
- Manual searches from the discovery panel input clear `activeNodeId`

### 3. Node "Show Results" Button (`src/features/graph/VerseNode/NodeActions.tsx`)

A `Layers` icon button (matching the toolbar's discovery toggle) appears on any verse node that has cached results. Clicking it restores that node's results in the discovery panel. The button highlights cyan when active.

### 4. Correct Edge Connections (`src/features/discovery/DiscoveryItem.tsx`)

`handleAdd` now reads `activeNodeId` from the discovery cache store instead of `explorer.getLastSearchSourceId()`. This ensures that when you're viewing node A's cached results and click "Add", the new verse connects to node A — not to whichever node was searched last.

### 5. Source Node Display (`src/features/discovery/DiscoveryPanel.tsx`)

The info badge in the panel header now shows which source verse the results came from (e.g., "from 2:255").

## Files Changed

| File | Change |
|---|---|
| `src/store/discoveryCacheStore.ts` | New store for per-node result caching |
| `src/store/index.ts` | Cache integration, `showNodeDiscovery` action |
| `src/features/graph/VerseNode/NodeActions.tsx` | "Show results" button on nodes |
| `src/features/discovery/DiscoveryItem.tsx` | Use `activeNodeId` for correct parent edge |
| `src/features/discovery/DiscoveryPanel.tsx` | Show source node in header, import cache store |
