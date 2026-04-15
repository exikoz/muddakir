/**
 * AI Query Endpoint — Vercel Serverless Function
 * Route: /api/query
 *
 * Orchestrates: MCP grounding nonce → Gemini tool-calling loop → response.
 * All secrets (Gemini key) stay server-side.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI, FunctionCallingMode } from '@google/generative-ai'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

const MCP_URL = 'https://mcp.quran.ai'
const NONCE_RE = /<grounding_nonce>(.*?)<\/grounding_nonce>/
const NONCE_REQUIRED_TOOLS = new Set(['fetch_quran', 'fetch_tafsir', 'search_quran'])

// ── MCP Client (reused across warm invocations) ─────────────────────────────

let mcpClient: Client | null = null

async function getMCPClient(): Promise<Client> {
  if (mcpClient) return mcpClient

  // Try Streamable HTTP first, fall back to SSE
  try {
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL))
    mcpClient = new Client({ name: 'muddakir', version: '1.0.0' })
    await mcpClient.connect(transport)
  } catch {
    mcpClient = null
    const sseTransport = new SSEClientTransport(new URL(`${MCP_URL}/sse`))
    mcpClient = new Client({ name: 'muddakir', version: '1.0.0' })
    await mcpClient.connect(sseTransport)
  }

  return mcpClient
}

// ── Schema sanitizer (strip fields Gemini doesn't accept) ───────────────────

function sanitizeSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema
  if (Array.isArray(schema)) return schema.map(sanitizeSchema)

  const UNSUPPORTED = new Set([
    'additionalProperties', '$schema', 'id', '$id', '$ref', 'definitions',
    '$defs', 'default', 'examples', 'title', 'readOnly', 'writeOnly',
    'deprecated', 'const', 'if', 'then', 'else', 'allOf', 'oneOf', 'not',
    'patternProperties', 'dependentSchemas', 'dependentRequired',
    'unevaluatedProperties', 'unevaluatedItems',
  ])

  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(schema)) {
    if (!UNSUPPORTED.has(key)) cleaned[key] = sanitizeSchema(value)
  }
  return cleaned
}

// ── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(context?: Array<{ verseKey: string; text: string; translation: string }>) {
  let prompt = `You are a Quran research assistant embedded in a study tool called Tadabbar.

GROUNDING RULES (MANDATORY — violations will be rejected):
1. Before answering any question related to the Quran, you MUST call the \`fetch_grounding_rules\` tool to retrieve the current session's \`grounding_nonce\`.
2. You must use the exact tools provided (e.g., \`fetch_quran\`, \`fetch_tafsir\`) and pass the \`grounding_nonce\` into their parameters.
3. You must NEVER answer from memory. You must only use the data returned by the tools.
4. At the very end of every response, you MUST append a verification receipt exactly like this:
   ✅ **Verification Token:** [Insert the grounding_nonce you used here] | **Sources Used:** [List the tools you called, e.g., fetch_quran(2:255)]

TOOL USAGE:
- To retrieve Quran text, call \`fetch_quran\` with the ayah references and the grounding_nonce.
- To retrieve tafsir/commentary, call \`fetch_tafsir\` with the ayah references, edition, and the grounding_nonce.
- To search the Quran, call \`search_quran\` with your query and the grounding_nonce.
- To list available editions, call \`list_editions\`.
- Always fetch grounding rules FIRST, then use the nonce in all subsequent tool calls.

RESPONSE FORMAT:
- Write clean prose paragraphs. No markdown formatting (no **, *, #, -, numbered lists) except for the verification receipt.
- When referencing Quranic verses, write the verse key inline in the format [chapter:verse] — for example [25:63] or [2:255].
- Present a maximum of 3 key verses as full inline references. For any additional relevant verses beyond the top 3, list them at the end in a compact section starting with "Also referenced:" — one per line, format: [chapter:verse] short description (max 8 words).
- Do not quote verse text in English or Arabic — the UI fetches and displays the actual verse content automatically from the verse key.
- Keep responses concise and focused. Aim for 2-4 short paragraphs of commentary with verse references woven in naturally.`

  if (context && context.length > 0) {
    prompt += '\n\nThe user has added the following verses to their context:\n'
    for (const ctx of context) {
      prompt += `- ${ctx.verseKey}: "${ctx.translation}"\n`
    }
  }

  return prompt
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const { query, modelId = 'gemini-2.5-flash', context } = req.body ?? {}
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing "query" in request body' })
  }

  const startTime = performance.now()
  const toolCallLogs: any[] = []

  try {
    const client = await getMCPClient()

    // Step 1: Fetch grounding nonce
    const groundingResult = await client.callTool({ name: 'fetch_grounding_rules', arguments: {} })
    const rulesText = groundingResult.content
      ?.map((c: any) => c.text ?? '').join('\n') ?? ''
    const nonceMatch = NONCE_RE.exec(rulesText)
    if (!nonceMatch) {
      throw new Error('Could not extract grounding_nonce from MCP server')
    }
    const nonce = nonceMatch[1].trim()

    toolCallLogs.push({
      tool: 'fetch_grounding_rules', input: {},
      output: { nonce: nonce.slice(0, 16) + '...', rulesLength: rulesText.length },
      durationMs: 0, status: 'success',
    })

    // Step 2: Get MCP tools as Gemini function declarations
    const { tools } = await client.listTools()
    const geminiTools = tools.map(t => ({
      name: t.name,
      description: t.description ?? '',
      parameters: sanitizeSchema(t.inputSchema) ?? { type: 'object', properties: {} },
    }))

    // Step 3: Call Gemini with tools
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: buildSystemPrompt(context),
      tools: [{ functionDeclarations: geminiTools }],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
    })

    const chat = model.startChat()
    const groundingPrefix =
      `[System: Grounding nonce for this session is "${nonce}". ` +
      `You MUST include this nonce in all tool calls. ` +
      `Rules summary: ${rulesText.slice(0, 300)}...]\n\n`

    let response = await chat.sendMessage(groundingPrefix + query)
    let result = response.response

    // Step 4: Tool-calling loop
    const MAX_ROUNDS = 10
    let round = 0

    while (round < MAX_ROUNDS) {
      const parts = result.candidates?.[0]?.content?.parts ?? []
      const functionCalls = parts.filter((p: any) => p.functionCall)
      if (functionCalls.length === 0) break

      round++
      const functionResponses: any[] = []

      for (const part of functionCalls) {
        const { name, args } = (part as any).functionCall
        const toolStart = performance.now()
        const finalArgs = { ...args }

        if (NONCE_REQUIRED_TOOLS.has(name)) {
          finalArgs.grounding_nonce = nonce
        }

        try {
          const mcpResult = await client.callTool({ name, arguments: finalArgs })
          const outputText = mcpResult.content
            ?.map((c: any) => c.text ?? JSON.stringify(c)).join('\n') ?? ''

          toolCallLogs.push({
            tool: name, input: finalArgs,
            output: outputText.slice(0, 500),
            durationMs: performance.now() - toolStart, status: 'success',
          })

          functionResponses.push({
            functionResponse: { name, response: { content: outputText } },
          })
        } catch (err: any) {
          toolCallLogs.push({
            tool: name, input: finalArgs, output: null,
            durationMs: performance.now() - toolStart,
            status: 'error', error: err.message,
          })
          functionResponses.push({
            functionResponse: { name, response: { error: err.message } },
          })
        }
      }

      response = await chat.sendMessage(functionResponses)
      result = response.response
    }

    // Step 5: Extract final text
    const content = result.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text).filter(Boolean).join('\n') ?? ''

    return res.status(200).json({
      content, modelId,
      durationMs: performance.now() - startTime,
      toolCalls: toolCallLogs,
      nonce: nonce.slice(0, 16) + '...',
    })
  } catch (err: any) {
    mcpClient = null // Reset on error so next invocation reconnects
    return res.status(500).json({
      error: err.message,
      durationMs: performance.now() - startTime,
      toolCalls: toolCallLogs,
    })
  }
}
