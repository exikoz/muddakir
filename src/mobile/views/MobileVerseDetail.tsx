/**
 * Mobile verse detail — full-screen version of VerseDetailPanel.
 * Reuses the same tab sections from the desktop version.
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { Type, Languages, BookOpen, Repeat, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useVerseDetailStore } from '../../store/verseDetailStore'
import { useStore } from '../../store'
import { fetchVerse } from '../../services/quranApi'
import MobileFullScreenPanel from './MobileFullScreenPanel'
import type { Verse } from '../../types/quran'

// Reuse desktop sections
import VerseHeader from '../../features/verseDetail/sections/VerseHeader'
import VerseExplanationSection from '../../features/verseDetail/sections/VerseExplanationSection'
import WordByWordSection from '../../features/verseDetail/sections/WordByWordSection'
import TranslationsSection from '../../features/verseDetail/sections/TranslationsSection'
import TafsirSection from '../../features/verseDetail/sections/TafsirSection'

const SimilarPhrasesSection = lazy(() => import('../../features/verseDetail/sections/SimilarPhrasesSection'))

const TAB_IDS = ['words', 'translations', 'tafsir', 'similar', 'explain'] as const
type TabId = typeof TAB_IDS[number]

const TAB_ICONS: Record<TabId, typeof Type> = {
  words: Type,
  translations: Languages,
  tafsir: BookOpen,
  similar: Repeat,
  explain: Sparkles,
}

interface Props {
  verseKey: string
}

export default function MobileVerseDetail({ verseKey }: Props) {
  const { t } = useTranslation('verseDetail')
  const [activeTab, setActiveTab] = useState<TabId>('words')
  const openDetail = useVerseDetailStore(s => s.openDetail)
  const verse = useVerseDetailStore(s => s.verse)

  // Load verse into detail store if not already there
  useEffect(() => {
    if (verse?.verse_key === verseKey) return

    // Try to find it in the graph nodes first
    const nodes = useStore.getState().nodes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = nodes.find((n: any) => n.type === 'verse' && n.data?.verse?.verse_key === verseKey)
    if (existing) {
      openDetail(existing.data.verse)
    } else {
      // Fetch from API
      fetchVerse(verseKey).then((v: Verse | null) => {
        if (v) openDetail(v)
      })
    }
  }, [verseKey, verse?.verse_key, openDetail])

  if (!verse) {
    return (
      <MobileFullScreenPanel title={verseKey}>
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading…</div>
      </MobileFullScreenPanel>
    )
  }

  return (
    <MobileFullScreenPanel title={`${verseKey} — ${t('verse_details', 'Verse Details')}`}>
      <VerseHeader />

      {/* Tab bar */}
      <div className="flex border-b border-slate-200 px-2 bg-white sticky top-0 z-10">
        {TAB_IDS.map(tabId => {
          const Icon = TAB_ICONS[tabId]
          const isActive = activeTab === tabId
          return (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`flex items-center gap-1 px-2.5 py-2.5 text-[11px] font-medium transition-colors relative ${
                isActive ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <Icon size={12} />
              {t(`tab_${tabId}`, tabId)}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t" />}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {activeTab === 'explain' && <VerseExplanationSection />}
        {activeTab === 'words' && <WordByWordSection />}
        {activeTab === 'translations' && <TranslationsSection />}
        {activeTab === 'tafsir' && <TafsirSection />}
        {activeTab === 'similar' && (
          <Suspense fallback={<div className="flex items-center justify-center py-12 text-xs text-slate-300">Loading…</div>}>
            <SimilarPhrasesSection />
          </Suspense>
        )}
      </div>
    </MobileFullScreenPanel>
  )
}
