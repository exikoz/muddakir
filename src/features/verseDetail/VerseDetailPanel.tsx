import { Sparkles } from 'lucide-react'
import { useVerseDetailStore } from '../../store/verseDetailStore'
import { useAIScopeStore } from '../../store/aiScopeStore'
import VerseHeader from './sections/VerseHeader'
import ArabicTextSection from './sections/ArabicTextSection'
import WordByWordSection from './sections/WordByWordSection'
import TranslationsSection from './sections/TranslationsSection'
import TafsirSection from './sections/TafsirSection'
import ReflectionsSection from './sections/ReflectionsSection'

export default function VerseDetailPanel() {
  const isOpen = useVerseDetailStore(s => s.isOpen)
  const verse = useVerseDetailStore(s => s.verse)
  const close = useVerseDetailStore(s => s.close)
  const addContextItem = useAIScopeStore(s => s.addContextItem)
  const setAIScopeOpen = useAIScopeStore(s => s.setOpen)

  function handleExploreWithAI() {
    if (!verse) return
    addContextItem({
      verseKey: verse.verse_key,
      text: verse.text_arabic,
      translation: verse.translation,
      addedAt: Date.now(),
    })
    close()
    setAIScopeOpen(true)
  }

  return (
    <div
      className={`fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <VerseHeader />

      <div className="flex-1 overflow-y-auto">
        <ArabicTextSection />
        <WordByWordSection />
        <TranslationsSection />
        <TafsirSection />
        <ReflectionsSection />

        {/* Explore Further CTA */}
        {verse && (
          <div className="px-4 py-4">
            <button
              onClick={handleExploreWithAI}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-600 text-sm font-medium hover:bg-purple-100 transition-colors"
            >
              <Sparkles size={14} />
              Explore this verse with AI Scope →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
