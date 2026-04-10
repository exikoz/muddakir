import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { VerseNodeData } from '../../../types/graph'
import ArabicText from './ArabicText'
import NodeActions from './NodeActions'

function VerseNode({ id, data }: NodeProps<VerseNodeData>) {
  const { verse, activeWordIndex, matchedTokens, tokenTypes } = data

  return (
    <div className="min-w-[300px] max-w-[500px] bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl group">
      {/* Handles - completely invisible, no dots */}
      <Handle
        id="top-src"
        type="source"
        position={Position.Top}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="top-tgt"
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="left-src"
        type="source"
        position={Position.Left}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="left-tgt"
        type="target"
        position={Position.Left}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />

      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 border-b border-slate-50 pb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Verse {verse.verse_key}
          </span>
          <NodeActions nodeId={id} />
        </div>

        {/* Arabic Text */}
        <ArabicText 
          verse={verse} 
          sourceNodeId={id} 
          activeWordIndex={activeWordIndex}
          matchedTokens={matchedTokens}
          tokenTypes={tokenTypes}
        />

        {/* Translation */}
        {verse.translation && (
          <p className="text-sm text-slate-600 leading-relaxed mt-4 pt-4 border-t border-slate-50">
            {verse.translation}
          </p>
        )}
      </div>

      <Handle
        id="right-src"
        type="source"
        position={Position.Right}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="right-tgt"
        type="target"
        position={Position.Right}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="bottom-src"
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
      <Handle
        id="bottom-tgt"
        type="target"
        position={Position.Bottom}
        className="!bg-transparent !border-transparent !w-[1px] !h-[1px] !min-w-0 !min-h-0 !opacity-0"
      />
    </div>
  )
}

export default memo(VerseNode)
