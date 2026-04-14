import { FolderOpen } from 'lucide-react'
import { useWorkspaceStore } from '../../store/workspaceStore'

export default function WorkspaceToggle() {
  const isPanelOpen = useWorkspaceStore((s) => s.isPanelOpen)
  const setPanelOpen = useWorkspaceStore((s) => s.setPanelOpen)

  return (
    <button
      onClick={() => setPanelOpen(!isPanelOpen)}
      className={`h-9 w-9 rounded-full shadow-sm border text-xs font-bold transition-all flex items-center justify-center ${
        isPanelOpen
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white/80 text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
      }`}
      title="Workspaces"
    >
      <FolderOpen size={16} />
    </button>
  )
}
