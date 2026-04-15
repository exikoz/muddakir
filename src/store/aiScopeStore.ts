/**
 * AI Scope store — manages the AI Scope side panel state.
 *
 * Separated from the graph store to keep concerns clean:
 *   - graphStore owns the live canvas state (forensic layer)
 *   - aiScopeStore owns the AI chat, context items, and MCP logs (AI Scope layer)
 */

import { create } from 'zustand'
import type {
  AIScopeMessage,
  AIScopeContextItem,
  AIScopeVerseResult,
  AIScopeModelId,
  MCPToolCallLog,
} from '../types/aiScope'
import { generateInsight } from '../services/aiScopeService'
import i18n from '../i18n/config'

interface AIScopeState {
  // Panel visibility
  isOpen: boolean
  setOpen: (open: boolean) => void
  toggle: () => void

  // Model selection
  selectedModel: AIScopeModelId
  setSelectedModel: (model: AIScopeModelId) => void

  // Chat messages
  messages: AIScopeMessage[]
  isLoading: boolean

  // User-controlled context (via "Add to AI Scope" on nodes)
  contextItems: AIScopeContextItem[]
  addContextItem: (item: AIScopeContextItem) => void
  removeContextItem: (verseKey: string) => void
  clearContext: () => void

  // Actions
  sendQuery: (query: string) => Promise<void>
  addAssistantMessage: (content: string, verses?: AIScopeVerseResult[], toolCalls?: MCPToolCallLog[]) => void
  setLoading: (loading: boolean) => void
  clearChat: () => void

  // Debug log visibility
  showDebugLogs: boolean
  setShowDebugLogs: (show: boolean) => void
}

function makeId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useAIScopeStore = create<AIScopeState>((set, get) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
  toggle: () => set({ isOpen: !get().isOpen }),

  selectedModel: 'gemini-2.5-flash',
  setSelectedModel: (model) => set({ selectedModel: model }),

  messages: [],
  isLoading: false,

  contextItems: [],

  addContextItem: (item) => {
    const { contextItems } = get()
    if (contextItems.some(c => c.verseKey === item.verseKey)) return
    set({ contextItems: [...contextItems, item] })
  },

  removeContextItem: (verseKey) => {
    set({ contextItems: get().contextItems.filter(c => c.verseKey !== verseKey) })
  },

  clearContext: () => set({ contextItems: [] }),

  sendQuery: async (query) => {
    const { selectedModel, contextItems } = get()

    // 1. Add user message and set loading
    const userMessage: AIScopeMessage = {
      id: makeId(),
      role: 'user',
      content: query,
      timestamp: Date.now(),
    }
    set({ messages: [...get().messages, userMessage], isLoading: true })

    // 2. Call Gemini via the service
    try {
      const response = await generateInsight({
        query,
        modelId: selectedModel,
        context: contextItems.length > 0
          ? contextItems.map(c => ({ verseKey: c.verseKey, text: c.text, translation: c.translation }))
          : undefined,
        language: i18n.language,
      })

      // 3. Add assistant response with tool call logs
      get().addAssistantMessage(response.content, undefined, response.toolCalls)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[AI Scope] Query failed:', errorMsg)

      // Add error as assistant message so the user sees feedback
      get().addAssistantMessage(`Something went wrong: ${errorMsg}`)
    }
  },

  addAssistantMessage: (content, verses, toolCalls) => {
    const assistantMessage: AIScopeMessage = {
      id: makeId(),
      role: 'assistant',
      content,
      verses,
      toolCalls,
      modelId: get().selectedModel,
      timestamp: Date.now(),
    }
    set({
      messages: [...get().messages, assistantMessage],
      isLoading: false,
    })
  },

  setLoading: (loading) => set({ isLoading: loading }),

  clearChat: () => set({ messages: [], isLoading: false }),

  showDebugLogs: false,
  setShowDebugLogs: (show) => set({ showDebugLogs: show }),
}))
