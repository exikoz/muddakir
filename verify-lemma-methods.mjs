/**
 * Debug script: Verify lemma extraction methods.
 * Run: node verify-lemma-methods.mjs
 */
import {
  loadQuranData,
  loadMorphology,
  loadWordMap,
  normalizeArabic
} from 'quran-search-engine'

async function main() {
  console.log('Loading datasets...\n')
  const [quranData, morphologyMap, wordMap] = await Promise.all([
    loadQuranData(),
    loadMorphology(),
    loadWordMap(),
  ])

  // Simulate our UI context: Verse 27:17
  // quranData is a Map<gid, QuranText>, not an array — find by iterating
  let targetVerse = null
  for (const [gid, v] of quranData.entries()) {
    if (v.sura_id === 27 && v.aya_id === 17) {
      targetVerse = { ...v, gid }
      break
    }
  }
  
  console.log('='.repeat(70))
  console.log(`UI Context: User is viewing Verse ${targetVerse.sura_id}:${targetVerse.aya_id}`)
  console.log(`Uthmani text: ${targetVerse.uthmani}`)
  
  // Simulate a user clicking the second word: "لِسُلَیۡمَٰنَ"
  const words = targetVerse.uthmani.split(/\s+/)
  const clickedWordIndex = 1 // 0-based index (0 = وَحُشِرَ, 1 = لِسُلَیۡمَٰنَ)
  const clickedWordRaw = words[clickedWordIndex]

  console.log(`\n🖱️ User clicked word [Index ${clickedWordIndex}]: "${clickedWordRaw}"`)
  console.log('='.repeat(70))

  // ---------------------------------------------------------
  // METHOD 1: The Global Word Map (String-based lookup)
  // ---------------------------------------------------------
  console.log('\n--- Method 1: Using Global WordMap ---')
  // We must normalize the Uthmani text to pure Arabic letters first
  const normalizedClickedWord = normalizeArabic(clickedWordRaw)
  const wordMapEntry = wordMap.get ? wordMap.get(normalizedClickedWord) : wordMap[normalizedClickedWord]
  
  console.log(`1. Raw text clicked: "${clickedWordRaw}"`)
  console.log(`2. Normalized text:  "${normalizedClickedWord}"`)
  
  if (wordMapEntry) {
    console.log(`3. Lemma from Map:   "${wordMapEntry.lemma}" ✅`)
  } else {
    console.log(`3. Lemma from Map:   Not Found ❌`)
  }

  // ---------------------------------------------------------
  // METHOD 2: The Exact Verse Position (Morphology Map)
  // ---------------------------------------------------------
  console.log('\n--- Method 2: Using Verse Morphology Map (Index-based) ---')
  // Look up the exact morphological data for this specific verse using its GID
  const verseMorphology = morphologyMap.get(targetVerse.gid)
  
  console.log(`1. Verse GID:        ${targetVerse.gid}`)
  console.log(`2. Clicked Index:    ${clickedWordIndex}`)
  
  if (verseMorphology && verseMorphology.lemmas) {
    // Grab the lemma at the exact same index as the clicked word
    const exactLemma = verseMorphology.lemmas[clickedWordIndex]
    console.log(`3. Exact Lemma:      "${exactLemma}" ✅`)
    console.log(`4. All lemmas:       [${verseMorphology.lemmas.join(', ')}]`)
  } else {
    console.log(`3. Exact Lemma:      Not Found ❌`)
    if (verseMorphology) {
      console.log(`   Available keys:   [${Object.keys(verseMorphology).join(', ')}]`)
    }
  }

  // ---------------------------------------------------------
  // TEST MORE VERSES — all the Sulayman lemma variants
  // ---------------------------------------------------------
  console.log('\n\n' + '='.repeat(70))
  console.log('TESTING ALL SULAYMAN VERSES')
  console.log('='.repeat(70))

  const testCases = [
    { sura: 4, aya: 163, wordIdx: 21, label: 'وَسُلَيْمَانَ (with و prefix)' },
    { sura: 2, aya: 102, wordIdx: 6, label: 'سُلَيْمَانَ (bare, first occurrence)' },
    { sura: 2, aya: 102, wordIdx: 9, label: 'سُلَيْمَانُ (bare, second occurrence)' },
    { sura: 21, aya: 81, wordIdx: 0, label: 'وَلِسُلَيْمَانَ (with و+ل prefix)' },
    { sura: 27, aya: 17, wordIdx: 1, label: 'لِسُلَيْمَانَ (with ل prefix)' },
  ]

  for (const tc of testCases) {
    let verse = null
    for (const [gid, v] of quranData.entries()) {
      if (v.sura_id === tc.sura && v.aya_id === tc.aya) {
        verse = { ...v, gid }
        break
      }
    }
    if (!verse) { console.log(`\n❌ ${tc.sura}:${tc.aya} not found`); continue }

    const uthmaniWords = verse.uthmani.split(/\s+/)
    const rawWord = uthmaniWords[tc.wordIdx]
    const normalized = normalizeArabic(rawWord)
    const wmEntry = wordMap.get ? wordMap.get(normalized) : wordMap[normalized]
    const morph = morphologyMap.get(verse.gid)

    console.log(`\n--- ${tc.sura}:${tc.aya} word[${tc.wordIdx}]: ${tc.label} ---`)
    console.log(`  Raw:        "${rawWord}"`)
    console.log(`  Normalized: "${normalized}"`)
    console.log(`  WordMap:    ${wmEntry ? `lemma="${wmEntry.lemma}", root="${wmEntry.root}"` : 'NOT FOUND'}`)
    if (morph && morph.lemmas) {
      console.log(`  Morphology: lemma="${morph.lemmas[tc.wordIdx]}"`)
    } else {
      console.log(`  Morphology: NOT FOUND`)
      if (morph) console.log(`    Keys: [${Object.keys(morph).join(', ')}]`)
    }
  }
}

main().catch(console.error)