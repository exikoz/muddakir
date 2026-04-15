/**
 * Debug script: fetch verses from the quran.com API and inspect
 * word-level lemma_name, root_name, and text fields for Sulayman verses.
 *
 * Run: node test-api-lemma.mjs
 */

// These are the 16 verses the engine returns for lemma search "وسليمان"
const VERSE_KEYS = [
  '4:163', '6:84', '21:78', '27:15',   // exact matches
  '2:102', '21:79', '21:81', '27:16',   // lemma matches
  '27:17', '27:18', '27:30', '27:36',
  '27:44', '34:12', '38:30', '38:34',
]

const BASE = 'https://api.quran.com'
const WORD_FIELDS = 'text_imlaei,text_imlaei_simple,root_name,lemma_name'

async function main() {
  for (const vk of VERSE_KEYS) {
    const url = `${BASE}/api/v4/verses/by_key/${vk}?words=true&word_fields=${WORD_FIELDS}`
    const res = await fetch(url)
    if (!res.ok) {
      console.log(`❌ ${vk}: HTTP ${res.status}`)
      continue
    }
    const json = await res.json()
    const v = json.verse
    if (!v) {
      console.log(`❌ ${vk}: no verse in response`)
      continue
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log(`Verse ${vk}`)
    console.log(`${'='.repeat(60)}`)

    const words = v.words || []
    words.forEach((w, i) => {
      if (w.char_type_name === 'end') return
      const line = [
        `[${i}]`,
        `imlaei: "${w.text_imlaei}"`,
        `simple: "${w.text_imlaei_simple}"`,
        `lemma: "${w.lemma_name || '—'}"`,
        `root: "${w.root_name || '—'}"`,
      ].join('  |  ')
      console.log(line)
    })
  }
}

main().catch(console.error)
