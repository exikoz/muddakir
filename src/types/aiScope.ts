/**
 * Types for the AI Scope layer — Free Mode Search via MCP.
 *
 * "Forensic" = internal quran-search-engine (exact/lemma/root/fuzzy/semantic)
 * "AI Scope" = AI-grounded search via quran.ai MCP (natural language queries)
 */

// ── Model definitions ───────────────────────────────────────────────────────

export const AI_SCOPE_MODELS = {
  'gemini-2.5-flash': { id: 'gemini-2.5-flash', label: 'Lite', description: '2.5 Flash' },
  'gemini-3.1-pro-preview': { id: 'gemini-3.1-pro-preview', label: 'Deep', description: '3.1 Pro' },
} as const

export type AIScopeModelId = keyof typeof AI_SCOPE_MODELS

/** A single verse result returned by the quran.ai MCP search_quran tool */
export interface AIScopeVerseResult {
  verseKey: string
  text?: string
  translation?: string
  score?: number
  matchType?: string
  /** Raw data from MCP for debug inspection */
  raw?: Record<string, unknown>
}

/** Structured log entry for every MCP tool call */
export interface MCPToolCallLog {
  id: string
  timestamp: number
  tool: string
  input: Record<string, unknown>
  output: unknown
  durationMs: number
  status: 'success' | 'error'
  error?: string
  /** Which model was active when this tool call was made */
  modelId?: AIScopeModelId
}

/** A single message in the AI Scope chat */
export interface AIScopeMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Verse results attached to assistant messages */
  verses?: AIScopeVerseResult[]
  /** MCP tool call logs for this message (for debug) */
  toolCalls?: MCPToolCallLog[]
  /** Which model generated this response */
  modelId?: AIScopeModelId
  timestamp: number
}

/** Context items explicitly added by the user via "Add to AI Scope" on nodes */
export interface AIScopeContextItem {
  verseKey: string
  text: string
  translation: string
  addedAt: number
}
