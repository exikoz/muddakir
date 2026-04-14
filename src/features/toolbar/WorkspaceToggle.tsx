import { FolderOpen } from 'lucide-react'
import { useWorkspaceStore } from '../../store/workspaceStore'

export default function WorkspaceToggle() {
  const isPanelOpen = useWorkspaceStore((s) => s.isPanelOpen)
  const setPanelOpen = useWorkspaceStore((s) => s.setPanelOpen)
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const workspaces = useWorkspaceStore((s) => s.workspaces)

  const activeName = activeId
    ? workspaces.find((w) => w.id === activeId)?.name
    : null

  return (
    <button
      onClick={() => setPanelOpen(!isPanelOpen)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
        isPanelOpen
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white/80 backdrop-blur-md text-slate-700 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
      }`}
      title="Workspaces"
    >
      <FolderOpen size={14} />
      {activeName ? activeName : 'Workspaces'}
    </button>
  )
}
