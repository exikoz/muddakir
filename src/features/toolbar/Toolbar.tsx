import { Search } from 'lucide-react'
import SeedInput from './SeedInput'
import ModeToggle from './ModeToggle'
import DiscoveryToggle from './DiscoveryToggle'

export default function Toolbar() {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      <div className="flex gap-2 items-center">
        <ModeToggle />
        <SeedInput />
        <DiscoveryToggle />
      </div>
    </div>
  )
}
