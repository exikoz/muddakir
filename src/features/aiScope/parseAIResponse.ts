/**
 * Parse AI Scope response text into structured blocks.
 *
 * The AI is instructed to use [chapter:verse] for references.
 * This parser splits the response into:
 *   - 'text' blocks (commentary paragraphs)
 *   - 'verse' blocks (individual verse references to render as cards)
 *   - 'reflist' block (the compact "Also referenced:" overflow list)
 */

export type ResponseBlock =
  | { type: 'text'; content: string }
  | { type: 'verse'; verseKey: string }
  | { type: 'reflist'; items: Array<{ verseKey: string; description: string }> }

/**
 * Expand a verse range like "23:1-2" into individual keys ["23:1", "23:2"].
 * Single verses like "25:63" return ["25:63"].
 */
function expandVerseRange(raw: string): string[] {
  const rangeMatch = raw.match(/^(\d+):(\d+)-(\d+)$/)
  if (rangeMatch) {
    const chapter = rangeMatch[1]
    const start = parseInt(rangeMatch[2], 10)
    const end = parseInt(rangeMatch[3], 10)
    if (end > start && end - start < 20) {
      const keys: string[] = []
      for (let i = start; i <= end; i++) keys.push(`${chapter}:${i}`)
      return keys
    }
  }
  return [raw]
}

/** Regex for inline verse references: [2:255], [23:1-2], etc. */
const VERSE_REF_PATTERN = /\[(\d{1,3}:\d{1,3}(?:-\d{1,3})?)\]/g

/** Detect the "Also referenced:" section at the end */
const ALSO_REFERENCED_PATTERN = /(?:^|\n)\s*Also referenced:\s*\n([\s\S]+)$/i

export function parseAIResponse(raw: string): ResponseBlock[] {
  const blocks: ResponseBlock[] = []
  const seen = new Set<string>()

  // 1. Check for "Also referenced:" section and split it off
  let mainText = raw
  let refListItems: Array<{ verseKey: string; description: string }> = []

  const alsoMatch = raw.match(ALSO_REFERENCED_PATTERN)
  if (alsoMatch) {
    mainText = raw.slice(0, alsoMatch.index!).trimEnd()
    const refLines = alsoMatch[1].trim().split('\n')
    for (const line of refLines) {
      const lineMatch = line.match(/\[(\d{1,3}:\d{1,3}(?:-\d{1,3})?)\]\s*(.*)/)
      if (lineMatch) {
        const keys = expandVerseRange(lineMatch[1])
        const desc = lineMatch[2].trim().replace(/^[-–—]\s*/, '')
        for (const key of keys) {
          if (!seen.has(key)) {
            seen.add(key)
            refListItems.push({ verseKey: key, description: desc })
          }
        }
      }
    }
  }

  // 2. Strip markdown artifacts from main text
  mainText = mainText
    .replace(/\*\*(.*?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.*?)\*/g, '$1')        // *italic* → italic
    .replace(/^#{1,6}\s+/gm, '')        // # headings → plain
    .replace(/^[-*]\s+/gm, '')          // - bullets → plain
    .replace(/^\d+\.\s+/gm, '')         // 1. numbered → plain

  // 3. Walk through main text, splitting on verse references
  let lastIndex = 0
  let match: RegExpExecArray | null

  // Reset regex state
  VERSE_REF_PATTERN.lastIndex = 0

  while ((match = VERSE_REF_PATTERN.exec(mainText)) !== null) {
    // Text before this reference
    const textBefore = mainText.slice(lastIndex, match.index).trim()
    if (textBefore) {
      blocks.push({ type: 'text', content: textBefore })
    }

    // Expand range and add verse blocks
    const keys = expandVerseRange(match[1])
    for (const key of keys) {
      if (!seen.has(key)) {
        seen.add(key)
        blocks.push({ type: 'verse', verseKey: key })
      }
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text after last reference
  const remaining = mainText.slice(lastIndex).trim()
  if (remaining) {
    blocks.push({ type: 'text', content: remaining })
  }

  // 4. Append the "Also referenced" list if present
  if (refListItems.length > 0) {
    blocks.push({ type: 'reflist', items: refListItems })
  }

  // 5. If no blocks were created (no verse refs found), treat as plain text
  // but still try to detect bare verse patterns like "25:63" without brackets
  if (blocks.length === 0 && mainText.trim()) {
    blocks.push({ type: 'text', content: mainText.trim() })
  }

  return blocks
}

/** Extract all unique verse keys from parsed blocks */
export function extractVerseKeys(blocks: ResponseBlock[]): string[] {
  const keys: string[] = []
  for (const block of blocks) {
    if (block.type === 'verse') keys.push(block.verseKey)
    if (block.type === 'reflist') {
      for (const item of block.items) keys.push(item.verseKey)
    }
  }
  return keys
}
