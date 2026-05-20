/**
 * MobileShell — the top-level mobile app layout.
 *
 * Replaces the desktop AppContent when on a mobile device.
 * Uses the same Zustand stores but renders a vertical thread UI
 * instead of the ReactFlow canvas.
 */

import { useEffect } from 'react'
import { useStore } from '../store'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useUserStore } from '../store/userStore'
import { preload } from '../services/quranSearch'
import { useAudioPlayer } from '../features/audio/useAudioPlayer'
import { useMobileStore } from './store/mobileStore'
import MobileToolbar from './components/MobileToolbar'
import MobileBottomNav from './components/MobileBottomNav'
import MobileWordBuilder from './components/MobileWordBuilder'
import MobileThreadView from './views/MobileThreadView'
import MobileMushafReader from './views/MobileMushafReader'
import MobileWorkspaces from './views/MobileWorkspaces'
import MobileVerseDetail from './views/MobileVerseDetail'
import MobileDiscoveryPanel from './views/MobileDiscoveryPanel'
import MobileFullScreenPanel from './views/MobileFullScreenPanel'

// Lazy-load AI scope (heavy dependency)
import { lazy, Suspense } from 'react'
const AIScopePanel = lazy(() => import('../features/aiScope/AIScopePanel'))

export default function MobileShell() {
  const initWorkspaces = useWorkspaceStore(s => s.init)
  const restoreSession = useUserStore(s => s.restoreSession)
  const openMushafToVerse = useStore(s => s.openMushafToVerse)
  const activeTab = useMobileStore(s => s.activeTab)
  const panel = useMobileStore(s => s.panel)

  useAudioPlayer()

  useEffect(() => {
    preload()
    initWorkspaces()
    restoreSession()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as Record<string, any>).__mushafOpener = openMushafToVerse
  }, [openMushafToVerse, initWorkspaces, restoreSession])

  return (
    <div className="flex flex-col h-dvh bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Top toolbar (only on explorer tab) */}
      {activeTab === 'explorer' && <MobileToolbar />}

      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'explorer' && <MobileThreadView />}
        {activeTab === 'mushaf' && <MobileMushafReader />}
        {activeTab === 'ai' && (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading AI…</div>}>
            <div className="flex-1 overflow-hidden">
              <AIScopePanel />
            </div>
          </Suspense>
        )}
        {activeTab === 'workspaces' && <MobileWorkspaces />}
      </div>

      {/* Floating word builder */}
      <MobileWordBuilder />

      {/* Bottom navigation */}
      <MobileBottomNav />

      {/* Full-screen panels (overlay) */}
      {panel?.type === 'verseDetail' && (
        <MobileVerseDetail verseKey={panel.verseKey} />
      )}
      {panel?.type === 'mushaf' && (
        <MobileFullScreenPanel title="Mushaf">
          <MobileMushafReader chapter={panel.chapter} highlightVerse={panel.highlightVerse} />
        </MobileFullScreenPanel>
      )}
      {panel?.type === 'ai' && (
        <MobileFullScreenPanel title="AI Scope">
          <Suspense fallback={<div className="flex items-center justify-center py-20 text-sm text-slate-400">Loading…</div>}>
            <AIScopePanel />
          </Suspense>
        </MobileFullScreenPanel>
      )}
      {panel?.type === 'discovery' && (
        <MobileDiscoveryPanel />
      )}
    </div>
  )
}
