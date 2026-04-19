/**
 * Mobile thread view — vertical timeline of verse cards with connectors.
 * Replaces the ReactFlow canvas on mobile.
 *
 * All cards are full-width. The connector lines between them show
 * the relationship — no cascading indentation.
 */

import { useStore } from '../../store'
import { useThreadTree, type ThreadNode, type ThreadGroup } from '../hooks/useThreadTree'
import MobileVerseCard from '../components/MobileVerseCard'
import MobileNoteCard from '../components/MobileNoteCard'
import MobileConnector from '../components/MobileConnector'
import MobileWelcome from '../components/MobileWelcome'

function renderThreadNode(node: ThreadNode): React.ReactNode {
  return (
    <div key={node.id} className="space-y-2">
      {/* The node itself — always full width */}
      {node.type === 'verse' ? (
        <MobileVerseCard
          nodeId={node.id}
          verse={node.data.verse}
          matchType={node.data.matchType}
          matchedTokens={node.data.matchedTokens}
          searchQuery={node.data.searchQuery}
          activeWordIndex={node.data.activeWordIndex}
          activeWordMatchType={node.data.activeWordMatchType}
        />
      ) : node.type === 'note' ? (
        <MobileNoteCard
          nodeId={node.id}
          title={node.data.title}
          text={node.data.text}
          color={node.data.color}
        />
      ) : null}

      {/* Sequential next (inline, no connector) */}
      {node.sequentialNext && renderThreadNode(node.sequentialNext)}

      {/* Search groups — connector + children, all full width */}
      {node.searchGroups.map((group: ThreadGroup, gi: number) => (
        <div key={`${node.id}-group-${gi}`} className="space-y-2">
          <MobileConnector
            searchTerm={group.searchTerm}
            matchType={group.matchType}
            sourceVerseKey={node.type === 'verse' ? node.data.verse?.verse_key : undefined}
          />

          {group.addedNodes.map(child => renderThreadNode(child))}
        </div>
      ))}
    </div>
  )
}

export default function MobileThreadView() {
  const hasNodes = useStore(s => s.nodes.length > 0)
  const roots = useThreadTree()

  if (!hasNodes) {
    return <MobileWelcome />
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {roots.map(root => renderThreadNode(root.node))}
    </div>
  )
}
