import { memo } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../../store'

interface Props {
  nodeId: string
}

function NodeActions({ nodeId }: Props) {
  const deleteNode = useStore(s => s.deleteNode)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        deleteNode(nodeId)
      }}
      className="p-1.5 rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
      title="Remove verse"
    >
      <X size={14} />
    </button>
  )
}

export default memo(NodeActions)
