/**
 * Verse Detail store — manages the detail panel state and AI explanation cache.
 */

import { create } from 'zustand'
import type { Verse } from '../types/quran'
import { generateInsight } from '../services/aiScopeService'
import { useAIScopeStore } from './aiScopeStore'
import { VERSE_EXPLANATION_PROMPT, WORD_EXPLANATION_PROMPT } from '../features/verseDetail/detailConfig'
import i18n from '../i18n/config'

interface VerseDetailState {
  isOpen: boolean
  verse: Verse | null
  previousPanel: 'aiScope' | 'discovery' | null

  // Verse explanation cache: verseKey → explanation text
  verseExplanations: Record<string, string>
  verseExplanationLoading: boolean

  // Word explanation cache: "verseKey:position" → explanation text
  wordExplanations: Record<string, string>
  wordExplanationLoading: string | null  // key currently loading

  openDetail: (verse: Verse, previousPanel?: 'aiScope' | 'discovery' | null) => void
  close: () => void
  fetchVerseExplanation: () => Promise<void>
  fetchWordExplanation: (wordPosition: number) => Promise<void>
  askMoreAboutVerse: (question?: string) => void
  askMoreAboutWord: (wordPosition: number, question?: string) => void
}

export const useVerseDetailStore = create<VerseDetailState>((set, get) => ({
  isOpen: false,
  verse: null,
  previousPanel: null,
  verseExplanations: {},
  verseExplanationLoading: false,
  wordExplanations: {},
  wordExplanationLoading: null,

  openDetail: (verse, previousPanel = null) => {
    set({ isOpen: true, verse, previousPanel })
  },

  close: () => set({ isOpen: false, verse: null, previousPanel: null }),

  fetchVerseExplanation: async () => {
    const { verse, verseExplanations } = get()
    if (!verse) return

    // Already cached
    if (verseExplanations[verse.verse_key]) return

    set({ verseExplanationLoading: true })

    try {
      const modelId = useAIScopeStore.getState().selectedModel
      const prompt = VERSE_EXPLANATION_PROMPT(verse.verse_key, verse.text_arabic, verse.translation, i18n.language)

      const response = await generateInsight({
        query: prompt,
        modelId,
        context: [{ verseKey: verse.verse_key, text: verse.text_arabic, translation: verse.translation }],
        language: i18n.language,
      })

      // Strip any markdown that slipped through
      const clean = response.content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^[-*]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')

      set({
        verseExplanations: { ...get().verseExplanations, [verse.verse_key]: clean },
        verseExplanationLoading: false,
      })
    } catch (err) {
      console.error('[VerseDetail] Verse explanation failed:', err)
      set({
        verseExplanations: {
          ...get().verseExplanations,
          [verse.verse_key]: 'Could not generate explanation. Please try again.',
        },
        verseExplanationLoading: false,
      })
    }
  },

  fetchWordExplanation: async (wordPosition) => {
    const { verse, wordExplanations } = get()
    if (!verse) return

    const cacheKey = `${verse.verse_key}:${wordPosition}`
    if (wordExplanations[cacheKey]) return

    set({ wordExplanationLoading: cacheKey })

    const word = verse.words.find(w => w.position === wordPosition)
    if (!word) { set({ wordExplanationLoading: null }); return }

    try {
      const modelId = useAIScopeStore.getState().selectedModel
      const prompt = WORD_EXPLANATION_PROMPT(
        word.text,
        word.transliteration ?? '',
        word.translation ?? '',
        verse.verse_key,
        verse.text_arabic,
        verse.translation,
        i18n.language,
      )

      const response = await generateInsight({
        query: prompt,
        modelId,
        context: [{ verseKey: verse.verse_key, text: verse.text_arabic, translation: verse.translation }],
        language: i18n.language,
      })

      const clean = response.content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^[-*]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')

      set({
        wordExplanations: { ...get().wordExplanations, [cacheKey]: clean },
        wordExplanationLoading: null,
      })
    } catch (err) {
      console.error('[VerseDetail] Word explanation failed:', err)
      set({
        wordExplanations: {
          ...get().wordExplanations,
          [cacheKey]: 'Could not generate explanation. Please try again.',
        },
        wordExplanationLoading: null,
      })
    }
  },

  askMoreAboutVerse: (question) => {
    const { verse } = get()
    if (!verse) return

    const aiScope = useAIScopeStore.getState()
    aiScope.addContextItem({
      verseKey: verse.verse_key,
      text: verse.text_arabic,
      translation: verse.translation,
      addedAt: Date.now(),
    })

    // Close detail, open AI Scope
    set({ isOpen: false, verse: null, previousPanel: null })
    aiScope.setOpen(true)

    if (question?.trim()) {
      aiScope.sendQuery(question.trim())
    }
  },

  askMoreAboutWord: (wordPosition, question) => {
    const { verse } = get()
    if (!verse) return

    const word = verse.words.find(w => w.position === wordPosition)
    if (!word) return

    const aiScope = useAIScopeStore.getState()
    aiScope.addContextItem({
      verseKey: verse.verse_key,
      text: verse.text_arabic,
      translation: verse.translation,
      addedAt: Date.now(),
    })

    set({ isOpen: false, verse: null, previousPanel: null })
    aiScope.setOpen(true)

    const q = question?.trim()
      || `Tell me more about the word "${word.text}" (${word.transliteration ?? ''}) in verse ${verse.verse_key}.`
    aiScope.sendQuery(q)
  },
}))
