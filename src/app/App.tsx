import { useEffect, lazy, Suspense } from 'react'
import Providers from './providers'
import Toolbar from '../features/toolbar/Toolbar'
import GraphCanvas from '../features/graph/GraphCanvas'
import WordBuilder from '../features/wordBuilder/WordBuilder'
import DiscoveryPanel from '../features/discovery/DiscoveryPanel'
import { MushafPanel } from '../features/mushaf/MushafPanel'
import WorkspacePanel from '../features/workspace/WorkspacePanel'
import AIScopePanel from '../features/aiScope/AIScopePanel'
import VerseDetailPanel from '../features/verseDetail/VerseDetailPanel'
import WelcomeState from '../features/welcome/WelcomeState'
import { useAudioPlayer } from '../features/audio/useAudioPlayer'
import { preload } from '../services/quranSearch'
import { useStore } from '../store'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useUserStore } from '../store/userStore'
import { useWorkspaceKeyboard } from '../features/workspace/useWorkspaceKeyboard'
import './App.css'

const AuthCallback = lazy(() => import('../features/user/AuthCallback'))

function AppContent() {
  const openMushafToVerse = useStore(s => s.openMushafToVerse)
  const hasVerseNodes = useStore(s => s.nodes.some((n: { type: string }) => n.type === 'verse'))
  const initWorkspaces = useWorkspaceStore(s => s.init)
  const restoreSession = useUserStore(s => s.restoreSession)
  
  useWorkspaceKeyboard()
  // Initialize singleton audio player
  useAudioPlayer()
  
  useEffect(() => { 
    preload()
    initWorkspaces()
    restoreSession()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as Record<string, any>).__mushafOpener = openMushafToVerse
  }, [openMushafToVerse, initWorkspaces, restoreSession])

  return (
    <div className="workspace">
      <Toolbar />
      <div className="workspace-canvas">
        <GraphCanvas />
        <WordBuilder />
        {!hasVerseNodes && <WelcomeState />}
        <DiscoveryPanel />
        <MushafPanel />
        <WorkspacePanel />
        <AIScopePanel />
        <VerseDetailPanel />
      </div>
    </div>
  )
}

export default function App() {
  // Handle OAuth callback route
  if (window.location.pathname === '/auth/callback') {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-sm text-slate-400">Loading…</p></div>}>
        <AuthCallback />
      </Suspense>
    )
  }

  return (
    <Providers>
      <AppContent />
    </Providers>
  )
}
