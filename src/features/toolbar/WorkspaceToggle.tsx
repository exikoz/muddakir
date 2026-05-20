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
          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-600'
          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600'
      }`}
      title={t('workspaces')}
    >
      <FolderOpen size={14} />
      <span>{t('workspaces_label')}</span>
    </button>
  )
}
