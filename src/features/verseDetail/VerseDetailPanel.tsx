import { useState } from 'react'
import { Sparkles, Type, Languages, BookOpen } from 'lucide-react'
import { useVerseDetailStore } from '../../store/verseDetailStore'
import VerseHeader from './sections/VerseHeader'
import VerseExplanationSection from './sections/VerseExplanationSection'
import WordByWordSection from './sections/WordByWordSection'
import TranslationsSection from './sections/TranslationsSection'
import TafsirSection from './sections/TafsirSection'

const TABS = [
  { id: 'words',        label: 'Words',        Icon: Type,      accent: false },
  { id: 'translations', label: 'Translations', Icon: Languages, accent: false },
  { id: 'tafsir',       label: 'Tafsir',       Icon: BookOpen,  accent: false },
  { id: 'explain',      label: '✦ AI Insight', Icon: Sparkles,  accent: true },
] as const

type TabId = typeof TABS[number]['id']

export default function VerseDetailPanel() {
  const isOpen = useVerseDetailStore(s => s.isOpen)
  const [activeTab, setActiveTab] = useState<TabId>('words')

  return (
    <div
      className={`fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header only — no Arabic text, no audio */}
      <VerseHeader />

      {/* Tab bar */}
      <div className="flex border-b border-slate-200 px-2 shrink-0 bg-white">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-2 text-[11px] font-medium transition-colors relative ${
                isActive
                  ? tab.accent ? 'text-emerald-600' : 'text-emerald-600'
                  : tab.accent ? 'text-emerald-400 hover:text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.Icon size={11} />
              {tab.label}
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
      </div>
    </div>
  )
}
