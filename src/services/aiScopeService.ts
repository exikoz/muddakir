/**
 * AI Scope Service — Gemini client, structured MCP logging, and response parsing.
 *
 * Responsibilities:
 * 1. Validate and expose the Gemini API key (VITE_GEMINI_API_KEY)
 * 2. Provide generateInsight() for calling Gemini with tool-use grounding
 * 3. Create structured log entries for every MCP tool call
 * 4. Parse MCP search_quran responses into AIScopeVerseResult[]
 * 5. Manage the debug log buffer
 */

import type { MCPToolCallLog, AIScopeVerseResult, AIScopeModelId } from '../types/aiScope'

// ── Gemini API key (Vite env) ───────────────────────────────────────────────

function getGeminiApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!key) {
    throw new Error(
      '[AI Scope] Missing VITE_GEMINI_API_KEY. ' +
      'Add it to your .env file: VITE_GEMINI_API_KEY=your_key_here'
    )
  }
  return key
}

// ── Generation config (shared across models) ───────────────────────────────

const GENERATION_CONFIG = {
  temperature: 0.1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 2048,
} as const

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
  raw: unknown
}

/**
 * Call Gemini to generate an AI-grounded insight.
 *
 * This function calls the Gemini REST API directly. The model is expected to
 * use tool calls (search_quran via MCP) for grounding — the caller is
 * responsible for orchestrating tool execution and feeding results back.
 *
 * Both models use the same strict generationConfig (temperature: 0.1) to
 * ensure grounded, deterministic tool use.
 */
export async function generateInsight(request: InsightRequest): Promise<InsightResponse> {
  const apiKey = getGeminiApiKey()
  const startTime = performance.now()

  // Build the prompt with optional context
  let systemPrompt = `You are a Quran research assistant embedded in a study tool called Tadabbar.

RESPONSE FORMAT RULES:
- Write clean prose paragraphs. No markdown formatting (no **, *, #, -, numbered lists).
- When referencing Quranic verses, write the verse key inline in the format [chapter:verse] — for example [25:63] or [2:255]. The UI will render these as interactive verse cards automatically.
- Present a maximum of 3 key verses as full inline references. For any additional relevant verses beyond the top 3, list them at the end in a compact section starting with "Also referenced:" — one per line, format: [chapter:verse] short description (max 8 words). Example:
  Also referenced:
  [7:13] Satan expelled for arrogance
  [16:23] Allah dislikes the arrogant
- Do not quote verse text in English or Arabic — the UI fetches and displays the actual verse content automatically from the verse key.
- Keep responses concise and focused. Aim for 2-4 short paragraphs of commentary with verse references woven in naturally.
- Never answer from memory alone. Ground every claim in specific verse references.`

  if (request.context && request.context.length > 0) {
    systemPrompt += '\n\nThe user has added the following verses to their context:\n'
    for (const ctx of request.context) {
      systemPrompt += `- ${ctx.verseKey}: "${ctx.translation}"\n`
    }
  }

  const body = {
    contents: [
      { role: 'user', parts: [{ text: request.query }] },
    ],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: GENERATION_CONFIG,
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.modelId}:generateContent?key=${apiKey}`

  console.group(`🤖 [AI Scope] generateInsight (${request.modelId})`)
  console.log('📥 Request:', { query: request.query, modelId: request.modelId, contextCount: request.context?.length ?? 0 })

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Gemini API ${res.status}: ${errorText}`)
    }

    const json = await res.json()
    const durationMs = performance.now() - startTime

    // Extract text content from response
    const candidates = json.candidates ?? []
    const content = candidates[0]?.content?.parts
      ?.map((p: any) => p.text)
      .filter(Boolean)
      .join('\n') ?? ''

    console.log('📤 Response:', { contentLength: content.length, durationMs: durationMs.toFixed(0) })
    console.groupEnd()

    // Log this as a tool call for debug visibility
    logToolCall({
      timestamp: Date.now(),
      tool: `generateInsight:${request.modelId}`,
      input: { query: request.query, modelId: request.modelId, contextCount: request.context?.length ?? 0 },
      output: { contentLength: content.length, candidateCount: candidates.length },
      durationMs,
      status: 'success',
      modelId: request.modelId,
    })

    return { content, modelId: request.modelId, durationMs, raw: json }
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

  // Structured console output for developer inspection
  const icon = log.status === 'success' ? '✅' : '❌'
  const modelTag = log.modelId ? ` [${log.modelId}]` : ''
  console.group(`${icon} [MCP]${modelTag} ${log.tool} (${log.durationMs.toFixed(0)}ms)`)
  console.log('📥 Input:', JSON.stringify(log.input, null, 2))
  console.log('📤 Output:', JSON.stringify(log.output, null, 2))
  if (log.modelId) console.log('🤖 Model:', log.modelId)
  if (log.error) console.error('⚠️ Error:', log.error)
  console.groupEnd()

  // Notify subscribers
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
 * Handles various response shapes gracefully.
 */
export function parseSearchQuranResponse(raw: unknown): AIScopeVerseResult[] {
  if (!raw) return []

  // Handle array of results
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
