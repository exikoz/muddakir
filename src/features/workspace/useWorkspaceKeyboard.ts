import { useEffect } from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useSidePanelStore } from '../../store/sidePanelStore'

/**
 * Keyboard shortcuts for workspace management:
 *   Ctrl+S — save current workspace (or prompt to create one)
 */
export function useWorkspaceKeyboard() {
  const saveCurrentWorkspace = useWorkspaceStore((s) => s.saveCurrentWorkspace)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const openPanel = useSidePanelStore((s) => s.open)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()

        if (activeWorkspaceId) {
          saveCurrentWorkspace()
        } else {
          // No active workspace — open the panel so user can name & save
          openPanel('workspace')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeWorkspaceId, saveCurrentWorkspace, openPanel])
}
