import UnifiedSearch from './UnifiedSearch'
import DiscoveryToggle from './DiscoveryToggle'
import MushafToggle from './MushafToggle'
import WorkspaceToggle from './WorkspaceToggle'
import UndoRedo from './UndoRedo'
import AddNoteButton from './AddNoteButton'
import AIScopeToggle from './AIScopeToggle'
import AdvancedToggle from './AdvancedToggle'
import LanguageToggle from './LanguageToggle'
import UserMenu from '../user/UserMenu'

export default function Toolbar() {
  return (
    <div
      dir="ltr"
      className="relative z-[60] flex items-center h-12 px-3 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shrink-0"
    >
      {/* ── Left: canvas actions ── */}
      <div className="flex items-center gap-1">
        <UndoRedo />
        <AddNoteButton />
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-2" />

      {/* ── Center: unified search with built-in mode filter ── */}
      <UnifiedSearch />

      {/* Spacer */}
      <div className="flex-1 min-w-2" />

      {/* ── Right: panels, then utilities ── */}
      <div className="flex items-center gap-1">
        <AIScopeToggle />
        <DiscoveryToggle />
        <MushafToggle />
        <WorkspaceToggle />

        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />

        <AdvancedToggle />
        <LanguageToggle />

        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />

        <UserMenu />
      </div>
    </div>
  )
}
