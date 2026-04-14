import { useEffect } from 'react'
import Providers from './providers'
import Toolbar from '../features/toolbar/Toolbar'
import GraphCanvas from '../features/graph/GraphCanvas'
import DiscoveryPanel from '../features/discovery/DiscoveryPanel'
import { MushafPanel } from '../features/mushaf/MushafPanel'
import WorkspacePanel from '../features/workspace/WorkspacePanel'
import DevModeToggle from '../components/DevModeToggle'
import UIDebugToggle from '../components/UIDebugToggle'
import { preload } from '../services/quranSearch'
import { useStore } from '../store'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useWorkspaceKeyboard } from '../features/workspace/useWorkspaceKeyboard'
import './App.css'

function AppContent() {
  const openMushafToVerse = useStore(s => s.openMushafToVerse)
  const initWorkspaces = useWorkspaceStore(s => s.init)
  
  useWorkspaceKeyboard()
  
  useEffect(() => { 
    preload()
    initWorkspaces()
    // Expose mushaf opener to VerseNode components via window
    ;(window as any).__mushafOpener = openMushafToVerse
  }, [openMushafToVerse, initWorkspaces])

  return (
    <div className="workspace">
      <Toolbar />
      <GraphCanvas />
      <DiscoveryPanel />
      <MushafPanel />
      <WorkspacePanel />
      <DevModeToggle />
      <UIDebugToggle />
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
