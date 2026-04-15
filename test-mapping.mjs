/**
 * Debug script: Investigate the mapping between
 * - quranData (gid, uthmani words)
 * - morphologyMap (gid, lemmas array)
 * - API word positions (verse_key, word position/index)
 *
 * Goal: Can we go from API verse_key + word index → morphologyMap lemma?
 *
 * Run: node test-mapping.mjs
 */
import {
  loadQuranData,
  loadMorphology,
  removeTashkeel,
} from 'quran-search-engine'

async function main() {
  console.log('Loading datasets...\n')
  const [quranData, morphologyMap] = await Promise.all([
    loadQuranData(),
    loadMorphology(),
  ])

  // Build a verse_key → gid lookup
  const verseKeyToGid = new Map()
  for (const [gid, v] of quranData.entries()) {
    verseKeyToGid.set(`${v.sura_id}:${v.aya_id}`, gid)
  }

  // Test verses with known Sulayman word positions from the API
  // API word positions are from the Postman/quran.com response
  const testCases = [
    { verseKey: '27:17', apiWordTexts: ['وَحُشِرَ', 'لِسُلَيْمَانَ', 'جُنُودُهُ', 'مِنَ', 'الْجِنِّ', 'وَالْإِنسِ', 'وَالطَّيْرِ', 'فَهُمْ', 'يُوزَعُونَ'], sulaymanIdx: 1 },
    { verseKey: '2:102', sulaymanIdx: 6, apiWordTexts: null },  // long verse, just check idx 6
    { verseKey: '21:78', sulaymanIdx: 1, apiWordTexts: null },
    { verseKey: '21:81', sulaymanIdx: 0, apiWordTexts: null },
    { verseKey: '38:30', sulaymanIdx: 2, apiWordTexts: null },
    { verseKey: '4:163', sulaymanIdx: 21, apiWordTexts: null },
  ]

  for (const tc of testCases) {
    const gid = verseKeyToGid.get(tc.verseKey)
    if (!gid) { console.log(`\n❌ ${tc.verseKey}: no gid found`); continue }

    const verse = quranData.get(gid)
    const morph = morphologyMap.get(gid)

    console.log(`\n${'='.repeat(70)}`)
    console.log(`Verse ${tc.verseKey} (gid: ${gid})`)
    console.log(`${'='.repeat(70)}`)

    // Show uthmani words (engine side)
    const uthmaniWords = verse.uthmani.split(/\s+/)
    console.log(`\nUthmani word count: ${uthmaniWords.length}`)
    console.log(`Morphology lemma count: ${morph?.lemmas?.length ?? 'N/A'}`)

    // Show side-by-side: uthmani word vs lemma at same index
    const maxLen = Math.max(uthmaniWords.length, morph?.lemmas?.length ?? 0)
    console.log(`\n  ${'Idx'.padEnd(5)} ${'Uthmani Word'.padEnd(30)} ${'Stripped'.padEnd(20)} Lemma`)
    console.log(`  ${'-'.repeat(5)} ${'-'.repeat(30)} ${'-'.repeat(20)} ${'-'.repeat(20)}`)

    for (let i = 0; i < maxLen; i++) {
      const uw = uthmaniWords[i] ?? '—'
      const stripped = uw !== '—' ? removeTashkeel(uw).trim() : '—'
      const lemma = morph?.lemmas?.[i] ?? '—'
      const marker = i === tc.sulaymanIdx ? ' ← API Sulayman word' : ''
      console.log(`  ${String(i).padEnd(5)} ${uw.padEnd(30)} ${stripped.padEnd(20)} ${lemma}${marker}`)
    }

    // Check if the lemma at the API's Sulayman index is correct
    const lemmaAtIdx = morph?.lemmas?.[tc.sulaymanIdx]
    console.log(`\n  API word index ${tc.sulaymanIdx} → lemma: "${lemmaAtIdx}"`)
    if (lemmaAtIdx && lemmaAtIdx.includes('سل')) {
      console.log(`  ✅ Lemma contains سل — likely Sulayman`)
    } else {
      console.log(`  ❌ Lemma does NOT look like Sulayman — INDEX MISMATCH`)
    }
  }

  // Also check: does the morphologyMap word count match the API word count?
  // The API returns words with char_type_name, where 'end' markers are extra.
  // Let's see if morph lemma count = uthmani word count for a few verses
  console.log(`\n\n${'='.repeat(70)}`)
  console.log('WORD COUNT COMPARISON: Uthmani split vs Morphology lemmas')
  console.log('='.repeat(70))

  let matchCount = 0
  let mismatchCount = 0
  const mismatches = []

  // Check first 100 verses
  let checked = 0
  for (const [gid, v] of quranData.entries()) {
    if (checked >= 200) break
    const morph = morphologyMap.get(gid)
    if (!morph?.lemmas) continue

    const uthmaniCount = v.uthmani.split(/\s+/).length
    const lemmaCount = morph.lemmas.length

    if (uthmaniCount === lemmaCount) {
      matchCount++
    } else {
      mismatchCount++
      if (mismatches.length < 10) {
        mismatches.push({ key: `${v.sura_id}:${v.aya_id}`, gid, uthmaniCount, lemmaCount, diff: uthmaniCount - lemmaCount })
      }
    }
    checked++
  }

  console.log(`\nChecked ${checked} verses:`)
  console.log(`  Matching counts:    ${matchCount}`)
  console.log(`  Mismatching counts: ${mismatchCount}`)
  if (mismatches.length > 0) {
    console.log(`\n  First ${mismatches.length} mismatches:`)
    mismatches.forEach(m => {
      console.log(`    ${m.key} (gid ${m.gid}): uthmani=${m.uthmaniCount}, lemmas=${m.lemmaCount}, diff=${m.diff}`)
    })
  }
}

main().catch(console.error)
