import { useState, useRef } from 'react'
import {
  X,
  Plus,
  Save,
  Trash2,
  Download,
  Upload,
  Pencil,
  Check,
  FolderOpen,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '../../store/workspaceStore'
import type { WorkspaceMeta } from '../../types/workspace'

export default function WorkspacePanel() {
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const loading = useWorkspaceStore((s) => s.loading)
  const isPanelOpen = useWorkspaceStore((s) => s.isPanelOpen)
  const setPanelOpen = useWorkspaceStore((s) => s.setPanelOpen)
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace)
  const saveCurrentWorkspace = useWorkspaceStore((s) => s.saveCurrentWorkspace)
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace)
  const newBlankWorkspace = useWorkspaceStore((s) => s.newBlankWorkspace)
  const renameWorkspace = useWorkspaceStore((s) => s.renameWorkspace)
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace)
  const exportWorkspace = useWorkspaceStore((s) => s.exportWorkspace)
  const importWorkspace = useWorkspaceStore((s) => s.importWorkspace)

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation('workspace')

  if (!isPanelOpen) return null

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setError(null)
    try {
      await createWorkspace(name)
      setNewName('')
    } catch (e) {
      setError(t('error_save'))
    }
  }

  async function handleSave() {
    setError(null)
    try {
      await saveCurrentWorkspace()
    } catch {
      setError(t('error_save_short'))
    }
  }

  async function handleSwitch(id: string) {
    if (id === activeWorkspaceId) return
    setError(null)
    try {
      await switchWorkspace(id)
    } catch {
      setError(t('error_load'))
    }
  }

  async function handleRename(id: string) {
    const name = editName.trim()
    if (!name) return
    await renameWorkspace(id, name)
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm(t('delete_confirm'))) return
    await removeWorkspace(id)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      await importWorkspace(file)
    } catch (err: any) {
      setError(err.message || t('error_import'))
    }
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function startEdit(meta: WorkspaceMeta) {
    setEditingId(meta.id)
    setEditName(meta.name)
  }

  return (
    <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0 z-50 h-full w-80 bg-white/95 backdrop-blur-md border-l rtl:border-l-0 rtl:border-r border-slate-200 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <FolderOpen size={16} />
          {t('title')}
        </div>
        <button
          onClick={() => setPanelOpen(false)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Actions bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-2">
        {/* Save current */}
        {activeWorkspaceId && (
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {t('save_current')}
          </button>
        )}

        {/* Save as new */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }}
          className="flex gap-1.5"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('name_placeholder')}
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
          />
          <button
            type="submit"
            disabled={!newName.trim() || loading}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <Plus size={14} />
          </button>
        </form>

        {/* New blank + Import */}
        <div className="flex gap-1.5">
          <button
            onClick={newBlankWorkspace}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <Plus size={12} />
            {t('new_blank')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <Upload size={12} />
            {t('import')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.muddakir.json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {workspaces.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">
            {t('no_workspaces')}
            <br />
            {t('no_workspaces_hint')}
          </p>
        )}

        {workspaces.map((meta) => (
          <WorkspaceItem
            key={meta.id}
            meta={meta}
            isActive={meta.id === activeWorkspaceId}
            isEditing={editingId === meta.id}
            editName={editName}
            loading={loading}
            onSwitch={() => handleSwitch(meta.id)}
            onStartEdit={() => startEdit(meta)}
            onEditNameChange={setEditName}
            onRename={() => handleRename(meta.id)}
            onCancelEdit={() => setEditingId(null)}
            onDelete={() => handleDelete(meta.id)}
            onExport={() => exportWorkspace(meta.id)}
          />
        ))}
      </div>
    </div>
  )
}


// ---------------------------------------------------------------------------
// Sub-component: single workspace row
// ---------------------------------------------------------------------------

function WorkspaceItem({
  meta,
  isActive,
  isEditing,
  editName,
  loading,
  onSwitch,
  onStartEdit,
  onEditNameChange,
  onRename,
  onCancelEdit,
  onDelete,
  onExport,
}: {
  meta: WorkspaceMeta
  isActive: boolean
  isEditing: boolean
  editName: string
  loading: boolean
  onSwitch: () => void
  onStartEdit: () => void
  onEditNameChange: (v: string) => void
  onRename: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onExport: () => void
}) {
  const date = new Date(meta.updatedAt)
  const { t } = useTranslation('workspace')
  const timeStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={`group rounded-lg mb-1.5 border transition-colors ${
        isActive
          ? 'border-indigo-300 bg-indigo-50/60'
          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Name / edit */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onRename()
              }}
              className="flex gap-1"
            >
              <input
                autoFocus
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && onCancelEdit()}
                className="flex-1 px-2 py-0.5 rounded border border-indigo-300 text-xs outline-none"
              />
              <button
                type="submit"
                className="text-emerald-600 hover:text-emerald-700"
              >
                <Check size={14} />
              </button>
            </form>
          ) : (
            <button
              onClick={onSwitch}
              disabled={loading || isActive}
              className="w-full text-left"
            >
              <div className="text-xs font-medium text-slate-800 truncate">
                {meta.name}
              </div>
              <div className="text-[10px] text-slate-400">
                {meta.nodeCount} nodes · {timeStr}
              </div>
            </button>
          )}
        </div>

        {/* Actions (visible on hover or when active) */}
        {!isEditing && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onStartEdit}
              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title={t('rename')}
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={onExport}
              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title={t('export_json')}
            >
              <Download size={12} />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title={t('delete')}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
