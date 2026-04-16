import SeedInput from './SeedInput'
import TextSearch from './TextSearch'
import ModeToggle from './ModeToggle'
import DiscoveryToggle from './DiscoveryToggle'
import MushafToggle from './MushafToggle'
import MultiWordToggle from './MultiWordToggle'
import WorkspaceToggle from './WorkspaceToggle'
import UndoRedo from './UndoRedo'
import AddNoteButton from './AddNoteButton'
import AIScopeToggle from './AIScopeToggle'
import AdvancedToggle from './AdvancedToggle'
import LanguageToggle from './LanguageToggle'

export default function Toolbar() {
  return (
    <div className="relative z-[60] flex items-center h-12 px-3 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shrink-0 gap-1">
      {/* Left group: search inputs */}
      <div className="flex items-center gap-1.5">
        <SeedInput />
        <TextSearch />
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-200 mx-2 shrink-0" />

      {/* Center group: mode & multi-word */}
      <div className="flex items-center gap-1.5">
        <ModeToggle />
        <MultiWordToggle />
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-4" />

      {/* Right group: actions & panel toggles */}
      <div className="flex items-center gap-1">
        <UndoRedo />
        <AddNoteButton />
        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />
        <LanguageToggle />
        <AdvancedToggle />
        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />
        <AIScopeToggle />
        <DiscoveryToggle />
        <MushafToggle />
        <WorkspaceToggle />
      </div>
    </div>
  )
}
