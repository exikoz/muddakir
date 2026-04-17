import { FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSidePanelStore } from '../../store/sidePanelStore'

export default function WorkspaceToggle() {
  const { t } = useTranslation('toolbar')
  const isOpen = useSidePanelStore(s => s.rightPanel === 'workspace')
  const toggle = useSidePanelStore(s => s.toggle)

  return (
    <button
      onClick={() => toggle('workspace')}
      className={`h-8 px-2.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold ${
        isOpen
          ? 'bg-indigo-50 text-indigo-600 border-indigo-300'
          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300'
      }`}
      title={t('workspaces')}
    >
      <FolderOpen size={14} />
      <span>{t('workspaces_label')}</span>
    </button>
  )
}
