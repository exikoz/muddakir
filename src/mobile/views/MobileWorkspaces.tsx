/**
 * Mobile workspace management — list, save, load, delete workspaces.
 */

import { useState, useCallback } from 'react'
import { Save, Trash2, FolderOpen, Plus, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useStore } from '../../store'

export default function MobileWorkspaces() {
  const { t } = useTranslation('workspace')
  const workspaces = useWorkspaceStore(s => s.workspaces)
  const activeId = useWorkspaceStore(s => s.activeWorkspaceId)
  const saveCurrentWorkspace = useWorkspaceStore(s => s.saveCurrentWorkspace)
  const switchWorkspace = useWorkspaceStore(s => s.switchWorkspace)
  const removeWorkspace = useWorkspaceStore(s => s.removeWorkspace)
  const createWorkspace = useWorkspaceStore(s => s.createWorkspace)
  const newBlankWorkspace = useWorkspaceStore(s => s.newBlankWorkspace)
  const hasNodes = useStore(s => s.nodes.length > 0)

  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      if (activeId) {
        await saveCurrentWorkspace()
      } else {
        await createWorkspace(`Workspace ${new Date().toLocaleDateString()}`)
      }
    } finally { setSaving(false) }
  }, [activeId, saveCurrentWorkspace, createWorkspace])

  const handleLoad = useCallback(async (id: string) => {
    setLoadingId(id)
    try { await switchWorkspace(id) } finally { setLoadingId(null) }
  }, [switchWorkspace])

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-100">
        <button
          onClick={() => newBlankWorkspace()}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold hover:bg-emerald-100"
        >
          <Plus size={14} /> {t('new', 'New')}
        </button>
        {hasNodes && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('save', 'Save')}
          </button>
        )}
      </div>

      {/* Workspace list */}
      <div className="divide-y divide-slate-100">
        {workspaces.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400">
            {t('no_workspaces', 'No saved workspaces yet')}
          </div>
        ) : (
          workspaces.map(ws => (
            <div
              key={ws.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                ws.id === activeId ? 'bg-emerald-50/50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  ws.id === activeId ? 'text-emerald-700' : 'text-slate-700'
                }`}>
                  {ws.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  {ws.nodeCount} nodes · {new Date(ws.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <button
                onClick={() => handleLoad(ws.id)}
                disabled={loadingId === ws.id || ws.id === activeId}
                className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 disabled:opacity-30"
              >
                {loadingId === ws.id ? <Loader2 size={16} className="animate-spin" /> : <FolderOpen size={16} />}
              </button>

              <button
                onClick={() => removeWorkspace(ws.id)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
