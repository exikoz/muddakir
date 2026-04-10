import { useEffect } from 'react'
import Providers from './providers'
import Toolbar from '../features/toolbar/Toolbar'
import GraphCanvas from '../features/graph/GraphCanvas'
import DiscoveryPanel from '../features/discovery/DiscoveryPanel'
import DevModeToggle from '../components/DevModeToggle'
import { preload } from '../services/quranSearch'
import './App.css'

function AppContent() {
  useEffect(() => { preload() }, [])

  return (
    <div className="workspace">
      <Toolbar />
      <GraphCanvas />
      <DiscoveryPanel />
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
