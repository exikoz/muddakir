/**
 * AI Scope Service — calls the Muddakir backend which orchestrates
 * Gemini + MCP tool calling with grounding nonce verification.
 *
 * The backend handles:
 * 1. Fetching grounding_nonce from quran.ai MCP
 * 2. Declaring MCP tools to Gemini as function declarations
 * 3. Executing the tool-calling loop (nonce injected server-side)
 * 4. Returning the final grounded response
 */

import type { MCPToolCallLog, AIScopeVerseResult, AIScopeModelId } from '../types/aiScope'

// ── Backend URL ─────────────────────────────────────────────────────────────

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string || 'http://localhost:3001'

// ── generateInsight ─────────────────────────────────────────────────────────

export interface InsightRequest {
  query: string
  modelId: AIScopeModelId
  context?: Array<{ verseKey: string; text: string; translation: string }>
}

export interface InsightResponse {
  content: string
  modelId: AIScopeModelId
  durationMs: number
  toolCalls: MCPToolCallLog[]
  raw: unknown
}

/**
 * Send a query to the Muddakir backend for grounded AI insight.
 *
 * The backend will:
 * 1. Fetch grounding_nonce from quran.ai MCP
 * 2. Send the query to Gemini with MCP tools
 * 3. Execute tool calls, injecting the nonce
 * 4. Return the final response with tool call logs
 */
export async function generateInsight(request: InsightRequest): Promise<InsightResponse> {
  const startTime = performance.now()

  console.group(`🤖 [AI Scope] generateInsight (${request.modelId})`)
  console.log('📥 Request:', {
    query: request.query,
    modelId: request.modelId,
    contextCount: request.context?.length ?? 0,
  })

  try {
    const res = await fetch(`${BACKEND_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: request.query,
        modelId: request.modelId,
        context: request.context,
      }),
    })

    if (!res.ok) {
      const errorBody = await res.text()
      throw new Error(`Backend ${res.status}: ${errorBody}`)
    }

    const json = await res.json()
    const durationMs = performance.now() - startTime

    console.log('📤 Response:', {
      contentLength: json.content?.length ?? 0,
      toolCalls: json.toolCalls?.length ?? 0,
      nonce: json.nonce,
      durationMs: durationMs.toFixed(0),
    })
    console.groupEnd()

    // Log each tool call from the backend for debug visibility
    if (json.toolCalls) {
      for (const tc of json.toolCalls) {
        logToolCall({
          timestamp: Date.now(),
          tool: tc.tool,
          input: tc.input ?? {},
          output: tc.output,
          durationMs: tc.durationMs ?? 0,
          status: tc.status ?? 'success',
          error: tc.error,
          modelId: request.modelId,
        })
      }
    }

    return {
      content: json.content ?? '',
      modelId: request.modelId,
      durationMs,
      toolCalls: json.toolCalls ?? [],
      raw: json,
    }
  } catch (error) {
    const durationMs = performance.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)

    console.error('❌ Error:', errorMsg)
    console.groupEnd()

    logToolCall({
      timestamp: Date.now(),
      tool: `generateInsight:${request.modelId}`,
      input: { query: request.query, modelId: request.modelId },
      output: null,
      durationMs,
      status: 'error',
      error: errorMsg,
      modelId: request.modelId,
    })

    throw error
  }
}

// ── Log buffer (in-memory, capped) ──────────────────────────────────────────

const MAX_LOGS = 100
let logBuffer: MCPToolCallLog[] = []
let listeners: Array<() => void> = []

/** Subscribe to log changes (for React components) */
export function subscribeToLogs(listener: () => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

/** Get current log snapshot */
export function getLogSnapshot(): MCPToolCallLog[] {
  return logBuffer
}

/** Record a new MCP tool call log entry */
export function logToolCall(entry: Omit<MCPToolCallLog, 'id'>): MCPToolCallLog {
  const log: MCPToolCallLog = {
    ...entry,
    id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }

  logBuffer = [log, ...logBuffer].slice(0, MAX_LOGS)

  const icon = log.status === 'success' ? '✅' : '❌'
  const modelTag = log.modelId ? ` [${log.modelId}]` : ''
  console.group(`${icon} [MCP]${modelTag} ${log.tool} (${log.durationMs.toFixed(0)}ms)`)
  console.log('📥 Input:', JSON.stringify(log.input, null, 2))
  console.log('📤 Output:', JSON.stringify(log.output, null, 2))
  if (log.modelId) console.log('🤖 Model:', log.modelId)
  if (log.error) console.error('⚠️ Error:', log.error)
  console.groupEnd()

  listeners.forEach(l => l())
  return log
}

/** Clear all logs */
export function clearLogs(): void {
  logBuffer = []
  listeners.forEach(l => l())
}

/**
 * Parse raw MCP search_quran output into typed verse results.
 */
export function parseSearchQuranResponse(raw: unknown): AIScopeVerseResult[] {
  if (!raw) return []
  const items = Array.isArray(raw) ? raw : (raw as any)?.results ?? (raw as any)?.verses ?? []
  if (!Array.isArray(items)) return []

  return items
    .map((item: any): AIScopeVerseResult | null => {
      const verseKey = item.verse_key ?? item.verseKey ?? item.key ?? item.reference
      if (!verseKey || typeof verseKey !== 'string') return null
      return {
        verseKey,
        text: item.text ?? item.text_arabic ?? item.arabic,
        translation: item.translation ?? item.english ?? item.text_english,
        score: item.score ?? item.matchScore ?? item.relevance,
        matchType: item.matchType ?? item.match_type ?? item.type,
        raw: item,
      }
    })
    .filter((v): v is AIScopeVerseResult => v !== null)
}
