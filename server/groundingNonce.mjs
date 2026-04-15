/**
 * Grounding Nonce — fetch and extract the cryptographic nonce
 * from the quran.ai MCP server before any Quran tool calls.
 *
 * The nonce is session-scoped: we fetch it once per user query,
 * then inject it into every subsequent tool call for that query.
 */

import { callMCPTool } from './mcpClient.mjs'

const NONCE_RE = /<grounding_nonce>(.*?)<\/grounding_nonce>/

/**
 * Fetch grounding rules from the MCP server and extract the nonce.
 * @returns {Promise<{ nonce: string, rulesText: string }>}
 * @throws if the nonce cannot be extracted
 */
export async function fetchGroundingNonce() {
  const result = await callMCPTool('fetch_grounding_rules', {})

  // The result content is an array of content blocks
  const text = result.content
    ?.map(c => c.text ?? '')
    .join('\n') ?? ''

  const match = NONCE_RE.exec(text)
  if (!match) {
    throw new Error(
      '[Grounding] Could not extract grounding_nonce from fetch_grounding_rules response. ' +
      'Raw response: ' + text.slice(0, 500)
    )
  }

  const nonce = match[1].trim()
  console.log('[Grounding] Nonce acquired:', nonce.slice(0, 12) + '...')

  return { nonce, rulesText: text }
}
