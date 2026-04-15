import { FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '../../store/workspaceStore'

export default function WorkspaceToggle() {
  const { t } = useTranslation('toolbar')
  const isPanelOpen = useWorkspaceStore((s) => s.isPanelOpen)
  const setPanelOpen = useWorkspaceStore((s) => s.setPanelOpen)

  return (
    <button
      onClick={() => setPanelOpen(!isPanelOpen)}
      className={`h-8 w-8 rounded-lg border transition-all flex items-center justify-center ${
        isPanelOpen
          ? 'bg-indigo-50 text-indigo-600 border-indigo-300'
          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:text-indigo-600 hover:border-slate-300'
      }`}
      title={t('workspaces')}
    >
      <FolderOpen size={14} />
    </button>
  )
}
