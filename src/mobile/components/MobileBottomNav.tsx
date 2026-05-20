/**
 * Bottom tab navigation for mobile.
 * Includes a Discovery button that opens the full-screen discovery panel.
 */

import { GitBranch, BookOpen, Sparkles, FolderOpen, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { useMobileStore, type MobileTab } from '../store/mobileStore'

const TABS: { id: MobileTab; Icon: typeof GitBranch; labelKey: string }[] = [
  { id: 'explorer', Icon: GitBranch, labelKey: 'tab_explorer' },
  { id: 'mushaf', Icon: BookOpen, labelKey: 'tab_mushaf' },
  { id: 'ai', Icon: Sparkles, labelKey: 'tab_ai' },
  { id: 'workspaces', Icon: FolderOpen, labelKey: 'tab_workspaces' },
]

export default function MobileBottomNav() {
  const { t } = useTranslation('mobile')
  const activeTab = useMobileStore(s => s.activeTab)
  const setActiveTab = useMobileStore(s => s.setActiveTab)
  const panel = useMobileStore(s => s.panel)
  const openPanel = useMobileStore(s => s.openPanel)
  const resultsCount = useStore(s => s.discoveryResults.length)

  const isDiscoveryOpen = panel?.type === 'discovery'

  return (
    <nav className="sticky bottom-0 z-50 flex items-stretch bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-700/80 safe-area-bottom">
      {TABS.map(({ id, Icon, labelKey }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
              active ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{t(labelKey, id)}</span>
          </button>
        )
      })}

      {/* Discovery toggle — opens full-screen discovery panel */}
      <button
        onClick={() => openPanel({ type: 'discovery' })}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors relative ${
          isDiscoveryOpen ? 'text-teal-600' : resultsCount > 0 ? 'text-teal-500' : 'text-slate-400'
        }`}
      >
        <Layers size={20} />
        <span className="text-[10px] font-medium">{t('tab_discovery', 'Discovery')}</span>
        {resultsCount > 0 && (
          <span className="absolute top-1 right-1/2 translate-x-3 min-w-[14px] h-[14px] rounded-full bg-teal-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
            {resultsCount}
          </span>
        )}
      </button>
    </nav>
  )
}
