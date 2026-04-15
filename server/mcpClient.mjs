/**
 * MCP Client — Pattern B connection to https://mcp.quran.ai
 *
 * Uses @modelcontextprotocol/sdk to connect as a client.
 * Tries Streamable HTTP first, falls back to SSE transport.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

const MCP_URL = 'https://mcp.quran.ai'

/** @type {Client | null} */
let client = null

/**
 * Get or create the singleton MCP client connected to quran.ai.
 * Tries Streamable HTTP first, falls back to SSE.
 * @returns {Promise<Client>}
 */
export async function getMCPClient() {
  if (client) return client

  // Attempt 1: Streamable HTTP (current MCP spec)
  try {
    console.log('[MCP] Trying Streamable HTTP →', MCP_URL)
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL))
    client = new Client({ name: 'muddakir', version: '1.0.0' })
    await client.connect(transport)
    console.log('[MCP] Connected via Streamable HTTP')
  } catch (err) {
    console.warn('[MCP] Streamable HTTP failed:', err.message)
    client = null

    // Attempt 2: SSE (legacy transport, some servers still use it)
    try {
      const sseUrl = MCP_URL.replace(/\/$/, '') + '/sse'
      console.log('[MCP] Trying SSE →', sseUrl)
      const sseTransport = new SSEClientTransport(new URL(sseUrl))
      client = new Client({ name: 'muddakir', version: '1.0.0' })
      await client.connect(sseTransport)
      console.log('[MCP] Connected via SSE')
    } catch (sseErr) {
      console.error('[MCP] SSE also failed:', sseErr.message)
      throw new Error(
        `Could not connect to MCP server at ${MCP_URL}. ` +
        `Streamable HTTP: ${err.message}. SSE: ${sseErr.message}`
      )
    }
  }

  // List available tools on first connect
  const { tools } = await client.listTools()
  console.log('[MCP] Available tools:', tools.map(t => t.name).join(', '))

  return client
}

/**
 * Call an MCP tool by name.
 * @param {string} toolName
 * @param {Record<string, unknown>} args
 * @returns {Promise<import('@modelcontextprotocol/sdk/types.js').CallToolResult>}
 */
export async function callMCPTool(toolName, args = {}) {
  const c = await getMCPClient()
  return c.callTool({ name: toolName, arguments: args })
}

/**
 * Disconnect the MCP client (for graceful shutdown).
 */
export async function disconnectMCP() {
  if (client) {
    await client.close()
    client = null
    console.log('[MCP] Disconnected')
  }
}
