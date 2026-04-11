import { useEffect } from 'react'
import Providers from './providers'
import Toolbar from '../features/toolbar/Toolbar'
import GraphCanvas from '../features/graph/GraphCanvas'
import DiscoveryPanel from '../features/discovery/DiscoveryPanel'
import { MushafPanel } from '../features/mushaf/MushafPanel'
import DevModeToggle from '../components/DevModeToggle'
import { preload } from '../services/quranSearch'
import { useStore } from '../store'
import './App.css'

function AppContent() {
  const openMushafToVerse = useStore(s => s.openMushafToVerse)
  
  useEffect(() => { 
    preload()
    // Expose mushaf opener to VerseNode components via window
    ;(window as any).__mushafOpener = openMushafToVerse
  }, [openMushafToVerse])

  return (
    <div className="workspace">
      <Toolbar />
      <GraphCanvas />
      <DiscoveryPanel />
      <MushafPanel />
      <DevModeToggle />
    </div>
  )
}

export default function App() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  )
}
