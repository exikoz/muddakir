import { useState, lazy, Suspense } from 'react'
import { Sparkles, Type, Languages, BookOpen, Repeat } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSidePanelStore } from '../../store/sidePanelStore'
import VerseHeader from './sections/VerseHeader'
import VerseExplanationSection from './sections/VerseExplanationSection'
import WordByWordSection from './sections/WordByWordSection'
import TranslationsSection from './sections/TranslationsSection'
import TafsirSection from './sections/TafsirSection'

const SimilarPhrasesSection = lazy(() => import('./sections/SimilarPhrasesSection'))

const TAB_IDS = ['words', 'translations', 'tafsir', 'similar', 'explain'] as const
type TabId = typeof TAB_IDS[number]

const TAB_CONFIG: Record<TabId, { Icon: typeof Type; accent: boolean }> = {
  words:        { Icon: Type,      accent: false },
  translations: { Icon: Languages, accent: false },
  tafsir:       { Icon: BookOpen,  accent: false },
  similar:      { Icon: Repeat,    accent: false },
  explain:      { Icon: Sparkles,  accent: true },
}

const TAB_LABEL_KEYS: Record<TabId, string> = {
  words: 'tab_words',
  translations: 'tab_translations',
  tafsir: 'tab_tafsir',
  similar: 'tab_similar',
  explain: 'tab_explain',
}

export default function VerseDetailPanel() {
  const { t } = useTranslation('verseDetail')
  const isOpen = useSidePanelStore(s => s.rightPanel === 'verseDetail')
  const [activeTab, setActiveTab] = useState<TabId>('words')

  return (
    <div
      dir="ltr"
      className={`fixed top-12 bottom-0 right-0 w-[420px] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header only — no Arabic text, no audio */}
      <VerseHeader />

      {/* Tab bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 px-2 shrink-0 bg-white dark:bg-slate-900">
        {TAB_IDS.map(tabId => {
          const { Icon, accent } = TAB_CONFIG[tabId]
          const isActive = activeTab === tabId
          return (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`flex items-center gap-1 px-2.5 py-2 text-[11px] font-medium transition-colors relative ${
                isActive
                  ? accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'
                  : accent ? 'text-emerald-400 hover:text-emerald-600' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={11} />
              {t(TAB_LABEL_KEYS[tabId])}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content — scrollable, fills remaining space */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'explain' && <VerseExplanationSection />}
        {activeTab === 'words' && <WordByWordSection />}
        {activeTab === 'translations' && <TranslationsSection />}
        {activeTab === 'tafsir' && <TafsirSection />}
        {activeTab === 'similar' && (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><span className="text-xs text-slate-300">Loading…</span></div>}>
            <SimilarPhrasesSection />
          </Suspense>
        )}
      </div>
    </div>
  )
}
