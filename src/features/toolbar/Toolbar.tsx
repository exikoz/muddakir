import SeedInput from './SeedInput'
import TextSearch from './TextSearch'
import ModeToggle from './ModeToggle'
import DiscoveryToggle from './DiscoveryToggle'
import MushafToggle from './MushafToggle'
import MultiWordToggle from './MultiWordToggle'
import WorkspaceToggle from './WorkspaceToggle'

export default function Toolbar() {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      <div className="flex gap-2 items-center">
        <ModeToggle />
        <MultiWordToggle />
        <SeedInput />
        <TextSearch />
        <DiscoveryToggle />
        <MushafToggle />
        <WorkspaceToggle />
      </div>
    </div>
  )
}
