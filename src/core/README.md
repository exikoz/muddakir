# Core Business Logic

This directory contains framework-agnostic business logic for Quran verse exploration.

## VerseExplorer

The `VerseExplorer` class manages the core functionality without any dependency on UI frameworks.

### Features

- Add verses to exploration
- Search from words in verses
- Auto-add top search results
- Delete nodes with cascade
- Prevent duplicates
- Track parent-child relationships
- Manage highlights and search context
- Export/import state

### Usage Examples

#### Desktop (ReactFlow)

```typescript
import { VerseExplorer } from './core/verseExplorer'
import { useStore } from './store'

// In your store
const explorer = new VerseExplorer()

// Add verse
const node = await explorer.addVerse('1:1')

// Convert to ReactFlow format
const reactFlowNode = {
  id: node.id,
  type: 'verse',
  position: { x: 200, y: 200 },
  data: { verse: node.verse }
}

// Search from word
const result = await explorer.searchFromWord(nodeId, wordIndex, searchOptions)

// Convert results to ReactFlow nodes and add to canvas
result.nodesToAdd.forEach(node => {
  // Add to ReactFlow with positioning logic
})
```

#### Mobile (List View)

```typescript
import { VerseExplorer } from './core/verseExplorer'
import { useState } from 'react'

function MobileExplorer() {
  const [explorer] = useState(() => new VerseExplorer())
  const [nodes, setNodes] = useState([])
  
  async function handleAddVerse(verseKey) {
    await explorer.addVerse(verseKey)
    setNodes(explorer.getAllNodes())
  }
  
  async function handleWordClick(nodeId, wordIndex) {
    const result = await explorer.searchFromWord(nodeId, wordIndex, searchOptions)
    setNodes(explorer.getAllNodes())
    // Show discovery results in modal
  }
  
  return (
    <div>
      {nodes.map(node => (
        <VerseCard
          key={node.id}
          verse={node.verse}
          onWordClick={(idx) => handleWordClick(node.id, idx)}
          onDelete={() => {
            explorer.deleteNode(node.id)
            setNodes(explorer.getAllNodes())
          }}
        />
      ))}
    </div>
  )
}
```

#### CLI Tool

```typescript
import { VerseExplorer } from './core/verseExplorer'

const explorer = new VerseExplorer()

// Add verse
const node = await explorer.addVerse('1:1')
console.log(`Added: ${node.verse.text_arabic}`)

// Search from first word
const result = await explorer.searchFromWord(node.id, 0, {
  lemma: true,
  root: true,
  fuzzy: true,
  semantic: false
})

console.log(`Found ${result.nodesToAdd.length} related verses:`)
result.nodesToAdd.forEach(n => {
  console.log(`- ${n.verse.verse_key}: ${n.verse.text_arabic}`)
})

// Export state
const state = explorer.exportState()
fs.writeFileSync('exploration.json', JSON.stringify(state))
```

#### Testing

```typescript
import { VerseExplorer } from './core/verseExplorer'

describe('My feature', () => {
  it('should explore verses', async () => {
    const explorer = new VerseExplorer()
    
    const node = await explorer.addVerse('1:1')
    expect(node).toBeTruthy()
    
    const result = await explorer.searchFromWord(node.id, 0, searchOptions)
    expect(result.nodesToAdd.length).toBeGreaterThan(0)
  })
})
```

## Benefits

### Single Source of Truth
- All business logic in one place
- No duplication between desktop and mobile
- Easy to test without UI

### Framework Agnostic
- Works with ReactFlow, React Native, Vue, Svelte, etc.
- Can be used in Node.js, CLI tools, web workers
- No UI framework dependencies

### Easy to Test
- Pure TypeScript classes
- No mocking of React hooks or ReactFlow
- Fast unit tests

### Easy to Extend
- Add new features in one place
- Both desktop and mobile get updates automatically
- Clear separation of concerns

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (Any Framework)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Desktop    │  │    Mobile    │  │     CLI      │  │
│  │  (ReactFlow) │  │  (List View) │  │    Tool      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Core Business Logic (This Layer)            │
│                    VerseExplorer                         │
│  • Add/delete verses                                     │
│  • Search from words                                     │
│  • Manage relationships                                  │
│  • Prevent duplicates                                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Services Layer                         │
│  ┌──────────────┐              ┌──────────────┐         │
│  │  quranApi.ts │              │quranSearch.ts│         │
│  │ (Fetch data) │              │ (Search)     │         │
│  └──────────────┘              └──────────────┘         │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

1. ✅ Phase 1: Create `VerseExplorer` (Done)
2. Phase 2: Update desktop store to use it
3. Phase 3: Create mobile view using it
4. Phase 4: Add tests

See `REFACTORING_PLAN.md` for full migration plan.
