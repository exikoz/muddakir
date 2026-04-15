/**
 * Muddakir Backend — Pattern B MCP Client + Gemini Tool-Calling Loop
 *
 * This server:
 * 1. Connects to https://mcp.quran.ai as an MCP client
 * 2. Fetches a grounding_nonce before every query
 * 3. Sends the user query to Gemini with MCP tools declared
 * 4. Executes tool calls via MCP, injecting the nonce automatically
 * 5. Loops until Gemini produces a final text response
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })
import express from 'express'
import cors from 'cors'
import { GoogleGenerativeAI, FunctionCallingMode } from '@google/generative-ai'
import { getMCPClient, callMCPTool, disconnectMCP } from './mcpClient.mjs'
import { fetchGroundingNonce } from './groundingNonce.mjs'
import { buildSystemPrompt } from './systemPrompt.mjs'

const PORT = process.env.PORT ?? 3001
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY in environment')
  process.exit(1)
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

const app = express()
app.use(cors())
app.use(express.json())

// ── Convert MCP tool schemas to Gemini function declarations ────────────────

/**
 * Recursively strip JSON Schema fields that Gemini doesn't understand.
 * Gemini function declarations only support a subset of JSON Schema.
 */
function sanitizeSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema
  if (Array.isArray(schema)) return schema.map(sanitizeSchema)

  const UNSUPPORTED_KEYS = new Set([
    'additionalProperties',
    '$schema',
    'id',
    '$id',
    '$ref',
    'definitions',
    '$defs',
    'default',
    'examples',
    'title',
    'readOnly',
    'writeOnly',
    'deprecated',
    'externalDocs',
    'xml',
    'discriminator',
    'const',
    'if',
    'then',
    'else',
    'allOf',
    'oneOf',
    'not',
    'patternProperties',
    'dependentSchemas',
    'dependentRequired',
    'unevaluatedProperties',
    'unevaluatedItems',
    'contentMediaType',
    'contentEncoding',
  ])

  const cleaned = {}
  for (const [key, value] of Object.entries(schema)) {
    if (UNSUPPORTED_KEYS.has(key)) continue
    cleaned[key] = sanitizeSchema(value)
  }
  return cleaned
}

/**
 * Fetch tool definitions from the MCP server and convert them
 * to Gemini-compatible function declarations.
 */
async function getGeminiTools() {
  const client = await getMCPClient()
  const { tools } = await client.listTools()

  return tools.map(tool => ({
    name: tool.name,
    description: tool.description ?? '',
    parameters: sanitizeSchema(tool.inputSchema) ?? { type: 'object', properties: {} },
  }))
}

// ── Quran tools that require a grounding nonce ──────────────────────────────

const NONCE_REQUIRED_TOOLS = new Set([
  'fetch_quran',
  'fetch_tafsir',
  'search_quran',
])

// ── Main query endpoint ─────────────────────────────────────────────────────

app.post('/api/query', async (req, res) => {
  const { query, modelId = 'gemini-2.5-flash', context } = req.body

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing "query" in request body' })
  }

  const startTime = performance.now()
  const toolCallLogs = []

  try {
    // ── Step 1: Fetch grounding nonce FIRST ─────────────────────────────
    console.log('\n═══ New Query ═══')
    console.log('Query:', query)
    console.log('Model:', modelId)

    const { nonce, rulesText } = await fetchGroundingNonce()
    toolCallLogs.push({
      tool: 'fetch_grounding_rules',
      input: {},
      output: { nonce: nonce.slice(0, 16) + '...', rulesLength: rulesText.length },
      durationMs: 0,
      status: 'success',
    })

    // ── Step 2: Build Gemini model with MCP tools ───────────────────────
    const geminiTools = await getGeminiTools()
    const systemPrompt = buildSystemPrompt(context)

    const model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: geminiTools }],
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingMode.AUTO },
      },
    })

    // ── Step 3: Start chat and send user query ──────────────────────────
    const chat = model.startChat()

    // Prepend grounding context so the model knows the nonce
    const groundingPrefix =
      `[System: Grounding nonce for this session is "${nonce}". ` +
      `You MUST include this nonce in all tool calls. ` +
      `Rules summary: ${rulesText.slice(0, 300)}...]\n\n`

    let response = await chat.sendMessage(groundingPrefix + query)
    let result = response.response

    // ── Step 4: Tool-calling loop ───────────────────────────────────────
    const MAX_TOOL_ROUNDS = 10
    let round = 0

    while (round < MAX_TOOL_ROUNDS) {
      const candidate = result.candidates?.[0]
      const parts = candidate?.content?.parts ?? []

      // Check if there are function calls in the response
      const functionCalls = parts.filter(p => p.functionCall)
      if (functionCalls.length === 0) break // No more tool calls — done

      round++
      console.log(`\n── Tool round ${round} (${functionCalls.length} calls) ──`)

      const functionResponses = []

      for (const part of functionCalls) {
        const { name, args } = part.functionCall
        const toolStart = performance.now()

        console.log(`  → ${name}(${JSON.stringify(args)})`)

        // ── Nonce injection & validation ─────────────────────────────
        let finalArgs = { ...args }

        if (NONCE_REQUIRED_TOOLS.has(name)) {
          if (!finalArgs.grounding_nonce) {
            console.log(`  ⚠ Injecting grounding_nonce into ${name}`)
          }
          // Always override with the real nonce — never trust the model's value
          finalArgs.grounding_nonce = nonce
        }

        // ── Execute via MCP ─────────────────────────────────────────
        try {
          const mcpResult = await callMCPTool(name, finalArgs)
          const toolDuration = performance.now() - toolStart

          const outputText = mcpResult.content
            ?.map(c => c.text ?? JSON.stringify(c))
            .join('\n') ?? ''

          console.log(`  ✅ ${name} (${toolDuration.toFixed(0)}ms, ${outputText.length} chars)`)

          toolCallLogs.push({
            tool: name,
            input: finalArgs,
            output: outputText.slice(0, 500),
            durationMs: toolDuration,
            status: 'success',
          })

          functionResponses.push({
            functionResponse: {
              name,
              response: { content: outputText },
            },
          })
        } catch (err) {
          const toolDuration = performance.now() - toolStart
          const errorMsg = err instanceof Error ? err.message : String(err)
          console.error(`  ❌ ${name}: ${errorMsg}`)

          toolCallLogs.push({
            tool: name,
            input: finalArgs,
            output: null,
            durationMs: toolDuration,
            status: 'error',
            error: errorMsg,
          })

          functionResponses.push({
            functionResponse: {
              name,
              response: { error: errorMsg },
            },
          })
        }
      }

      // Send tool results back to Gemini
      response = await chat.sendMessage(functionResponses)
      result = response.response
    }

    if (round >= MAX_TOOL_ROUNDS) {
      console.warn('[Query] Hit max tool rounds — forcing text response')
    }

    // ── Step 5: Extract final text ──────────────────────────────────────
    const content = result.candidates?.[0]?.content?.parts
      ?.map(p => p.text)
      .filter(Boolean)
      .join('\n') ?? ''

    const durationMs = performance.now() - startTime
    console.log(`\n✅ Query complete (${durationMs.toFixed(0)}ms, ${content.length} chars)`)

    res.json({
      content,
      modelId,
      durationMs,
      toolCalls: toolCallLogs,
      nonce: nonce.slice(0, 16) + '...',
    })
  } catch (error) {
    const durationMs = performance.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Query] Error:', errorMsg)

    res.status(500).json({
      error: errorMsg,
      durationMs,
      toolCalls: toolCallLogs,
    })
  }
})

// ── Health check ────────────────────────────────────────────────────────────

app.get('/api/health', async (_req, res) => {
  try {
    const client = await getMCPClient()
    const { tools } = await client.listTools()
    res.json({
      status: 'ok',
      mcpConnected: true,
      availableTools: tools.map(t => t.name),
    })
  } catch (err) {
    res.status(503).json({
      status: 'error',
      mcpConnected: false,
      error: err instanceof Error ? err.message : String(err),
    })
  }
})

// ── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[Muddakir] Server running on http://localhost:${PORT}`)
  console.log('[Muddakir] Connecting to MCP server...')
  getMCPClient().catch(err => {
    console.error('[Muddakir] MCP connection failed:', err.message)
  })
})

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectMCP()
  process.exit(0)
})
