/**
 * Debug script: Compare API word count (minus 'end' markers) vs morphologyMap lemma count.
 * Also do a side-by-side for specific verses to see if positions align.
 *
 * Uses the public api.quran.com (no auth needed) to get word objects.
 *
 * Run: node test-api-vs-morph.mjs
 */
import {
  loadQuranData,
  loadMorphology,
} from 'quran-search-engine'

const API_BASE = 'https://api.quran.com'

async function fetchApiWords(verseKey) {
  const url = `${API_BASE}/api/v4/verses/by_key/${verseKey}?words=true&word_fields=text_imlaei,text_imlaei_simple`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  return json.verse?.words ?? null
}

async function main() {
  console.log('Loading engine datasets...\n')
  const [quranData, morphologyMap] = await Promise.all([
    loadQuranData(),
    loadMorphology(),
  ])

  // Build verse_key → gid lookup
  const verseKeyToGid = new Map()
  for (const [gid, v] of quranData.entries()) {
    verseKeyToGid.set(`${v.sura_id}:${v.aya_id}`, gid)
  }

  // Test specific Sulayman verses with side-by-side comparison
  const detailVerses = ['27:17', '2:102', '21:78', '21:81', '4:163', '38:30', '38:34']

  for (const vk of detailVerses) {
    const gid = verseKeyToGid.get(vk)
    const morph = morphologyMap.get(gid)
    const apiWords = await fetchApiWords(vk)

    if (!apiWords || !morph?.lemmas) {
      console.log(`\n❌ ${vk}: missing data (api=${!!apiWords}, morph=${!!morph?.lemmas})`)
      continue
    }

    // Filter out 'end' markers from API words
    const contentWords = apiWords.filter(w => w.char_type_name !== 'end')

    console.log(`\n${'='.repeat(80)}`)
    console.log(`Verse ${vk} (gid: ${gid})`)
    console.log(`API content words: ${contentWords.length}  |  Morphology lemmas: ${morph.lemmas.length}  |  ${contentWords.length === morph.lemmas.length ? '✅ MATCH' : '❌ MISMATCH (' + (contentWords.length - morph.lemmas.length) + ')'}`)
    console.log(`${'='.repeat(80)}`)

    const maxLen = Math.max(contentWords.length, morph.lemmas.length)
    console.log(`  ${'Idx'.padEnd(5)} ${'API text_imlaei'.padEnd(25)} ${'API simple'.padEnd(20)} ${'Morph lemma'.padEnd(20)}`)
    console.log(`  ${'-'.repeat(5)} ${'-'.repeat(25)} ${'-'.repeat(20)} ${'-'.repeat(20)}`)

    for (let i = 0; i < maxLen; i++) {
      const apiW = contentWords[i]
      const imlaei = apiW?.text_imlaei ?? '—'
      const simple = apiW?.text_imlaei_simple ?? '—'
      const lemma = morph.lemmas[i] ?? '—'
      console.log(`  ${String(i).padEnd(5)} ${imlaei.padEnd(25)} ${simple.padEnd(20)} ${lemma}`)
    }
  }

  // Bulk comparison: check 50 verses across different surahs
  console.log(`\n\n${'='.repeat(80)}`)
  console.log('BULK COMPARISON: API word count vs Morphology lemma count')
  console.log('='.repeat(80))

  const bulkVerses = [
    '1:1','1:2','1:3','1:4','1:5','1:6','1:7',
    '2:1','2:2','2:3','2:4','2:5','2:10','2:25','2:74','2:102','2:255','2:266',
    '3:1','3:2','3:14','3:185',
    '4:1','4:163',
    '21:78','21:79','21:81',
    '27:15','27:16','27:17','27:18','27:30','27:36','27:44',
    '34:12',
    '36:1','36:2','36:3',
    '38:30','38:34',
    '112:1','112:2','112:3','112:4',
  ]

  let matchCount = 0
  let mismatchCount = 0
  const mismatches = []

  for (const vk of bulkVerses) {
    const gid = verseKeyToGid.get(vk)
    if (!gid) continue
    const morph = morphologyMap.get(gid)
    if (!morph?.lemmas) continue

    const apiWords = await fetchApiWords(vk)
    if (!apiWords) continue

    const contentWords = apiWords.filter(w => w.char_type_name !== 'end')
    const apiCount = contentWords.length
    const morphCount = morph.lemmas.length

    if (apiCount === morphCount) {
      matchCount++
    } else {
      mismatchCount++
      mismatches.push({ vk, apiCount, morphCount, diff: apiCount - morphCount })
    }
  }

  console.log(`\nChecked ${matchCount + mismatchCount} verses:`)
  console.log(`  Matching:    ${matchCount}`)
  console.log(`  Mismatching: ${mismatchCount}`)
  if (mismatches.length > 0) {
    console.log(`\n  Mismatches:`)
    mismatches.forEach(m => {
      console.log(`    ${m.vk}: API=${m.apiCount}, morph=${m.morphCount}, diff=${m.diff}`)
    })
  }
}

main().catch(console.error)
