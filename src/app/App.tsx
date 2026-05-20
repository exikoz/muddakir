import { useEffect, useCallback, lazy, Suspense } from 'react'
import Providers from './providers'
import MobileProviders from '../mobile/MobileProviders'
import { isMobileDevice } from '../lib/deviceDetect'
import Toolbar from '../features/toolbar/Toolbar'
import GraphCanvas from '../features/graph/GraphCanvas'
import WordBuilder from '../features/wordBuilder/WordBuilder'
import DiscoveryPanel from '../features/discovery/DiscoveryPanel'
import { MushafPanel } from '../features/mushaf/MushafPanel'
import WorkspacePanel from '../features/workspace/WorkspacePanel'
import AIScopePanel from '../features/aiScope/AIScopePanel'
import VerseDetailPanel from '../features/verseDetail/VerseDetailPanel'
import UserPanel from '../features/user/UserPanel'
import ToastContainer from '../components/ToastContainer'
import WelcomeState from '../features/welcome/WelcomeState'
import { useAudioPlayer } from '../features/audio/useAudioPlayer'
import { preload } from '../services/quranSearch'
import { useStore } from '../store'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useUserStore } from '../store/userStore'
import { useToastStore } from '../store/toastStore'
import { useSidePanelStore } from '../store/sidePanelStore'
import { useWorkspaceKeyboard } from '../features/workspace/useWorkspaceKeyboard'
import { useActivityTracker } from '../features/user/useActivityTracker'
import './App.css'

const AuthCallback = lazy(() => import('../features/user/AuthCallback'))
const MobileShell = lazy(() => import('../mobile/MobileShell'))
const LandingPage = lazy(() => import('../landing/LandingPage'))

/** Desktop app content — ReactFlow graph canvas + side panels */
function DesktopContent() {
  const openMushafToVerse = useStore(s => s.openMushafToVerse)
  const hasVerseNodes = useStore(s => s.nodes.some((n: { type: string }) => n.type === 'verse'))
  const nodeCount = useStore(s => s.nodes.length)
  const initWorkspaces = useWorkspaceStore(s => s.init)
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId)
  const restoreSession = useUserStore(s => s.restoreSession)
  const showToast = useToastStore(s => s.show)
  
  useWorkspaceKeyboard()
  // Initialize singleton audio player
  useAudioPlayer()
  // Track reading activity for streak
  useActivityTracker()
  
  useEffect(() => { 
    preload()
    initWorkspaces()
    restoreSession()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as Record<string, any>).__mushafOpener = openMushafToVerse
  }, [openMushafToVerse, initWorkspaces, restoreSession])

  // ── Unsaved work warning on page unload ─────────────────────────────────
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    // Only warn if there are nodes on the canvas (user has done work)
    const currentNodeCount = useStore.getState().nodes.length
    if (currentNodeCount > 0) {
      e.preventDefault()
      // Modern browsers show a generic message, but we set returnValue for compat
      e.returnValue = ''
    }
  }, [])

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [handleBeforeUnload])

  // Show a toast reminder to save if there are unsaved nodes and no active workspace
  useEffect(() => {
    if (nodeCount > 0 && !activeWorkspaceId) {
      const timer = setTimeout(() => {
        showToast({
          type: 'warning',
          message: 'You have unsaved work on the canvas. Save it as a workspace to keep it.',
          action: {
            label: 'Save workspace',
            onClick: () => {
              // Open workspace panel for saving
              const { open } = useSidePanelStore.getState()
              open('workspace')
            },
          },
          duration: 8000,
        })
      }, 60000) // Remind after 1 minute of unsaved work
      return () => clearTimeout(timer)
    }
  }, [nodeCount > 0 && !activeWorkspaceId]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <UserPanel />
      </div>
      <ToastContainer />
    </div>
  )
}

/** Detect device once at module level */
const IS_MOBILE = isMobileDevice()

export default function App() {
  const path = window.location.pathname

  // Handle OAuth callback route
  if (path === '/auth/callback') {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><p className="text-sm text-slate-400">Loading…</p></div>}>
        <AuthCallback />
      </Suspense>
    )
  }

  // Landing page at root
  if (path === '/' || path === '') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#0f1219]" />}>
        <LandingPage />
      </Suspense>
    )
  }

  // Mobile companion view — no ReactFlowProvider needed
  if (IS_MOBILE) {
    return (
      <MobileProviders>
        <Suspense fallback={<div className="min-h-dvh flex items-center justify-center bg-slate-50 dark:bg-slate-900"><p className="text-sm text-slate-400">Loading…</p></div>}>
          <MobileShell />
        </Suspense>
      </MobileProviders>
    )
  }

  // Desktop — full ReactFlow experience
  return (
    <Providers>
      <DesktopContent />
    </Providers>
  )
}
