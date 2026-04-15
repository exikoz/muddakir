// // test.mjs
// import { search, loadQuranData, loadMorphology, loadWordMap } from 'quran-search-engine';

// async function compareSearches() {
//   console.log("Loading datasets (v0.3.x)...");
  
//   // Load data in parallel for speed
//   const [quranData, morphologyMap, wordMap] = await Promise.all([
//     loadQuranData(),
//     loadMorphology(),
//     loadWordMap()
//   ]);
  
//   // The new context object required by v0.3.x
//   const context = { quranData, morphologyMap, wordMap };
//   const query = "وسليمان";
  
//   console.log(`\n🔍 Searching for: "${query}"\n`);

//   // 1. EXACT SEARCH
//   // We disable lemma, root, and fuzzy to force exact text matching
//   const exactSearch = search(query, context, { 
//     lemma: false, 
//     root: false,
//     fuzzy: false 
//   });
  
//   console.log("====================================");
//   console.log("🎯 EXACT SEARCH RESULTS");
//   console.log("====================================");
//   console.log(`Total Found: ${exactSearch.pagination.totalResults}`);
  
//   if (exactSearch.results.length > 0) {
//     console.log(`Top Result Type:  ${exactSearch.results[0].matchType}`);
//     console.log(`Top Result Score: ${exactSearch.results[0].matchScore}`);
//     console.log(`Top Result Text:  ${exactSearch.results[0].uthmani}`);
//   }

//   // 2. LEMMA SEARCH
//   // We enable lemma. Let's see if it finds more!
//   const lemmaSearch = search(query, context, { 
//     lemma: true, 
//     root: false,
//     fuzzy: false 
//   });

//   console.log("\n====================================");
//   console.log("📖 LEMMA SEARCH RESULTS");
//   console.log("====================================");
//   console.log(`Total Found: ${lemmaSearch.pagination.totalResults}`);
  
//   if (lemmaSearch.results.length > 0) {
//     console.log(`Top Result Type:  ${lemmaSearch.results[0].matchType}`);
//     console.log(`Top Result Score: ${lemmaSearch.results[0].matchScore}`);
//     console.log(`Top Result Text:  ${lemmaSearch.results[0].uthmani}`);
//   }
// }

// compareSearches();

//------------------------------------

// test.mjs
// import { search, loadQuranData, loadMorphology, loadWordMap, getHighlightRanges } from 'quran-search-engine';

// async function testHighlighting() {
//   console.log("Loading datasets...\n");
//   const [quranData, morphologyMap, wordMap] = await Promise.all([
//     loadQuranData(), loadMorphology(), loadWordMap()
//   ]);
//   const context = { quranData, morphologyMap, wordMap };

//   // ==========================================
//   // TEST 1: STANDARD SINGLE WORD
//   // ==========================================
//   const standardQuery = "سليمان";
//   console.log(`====================================`);
//   console.log(`🔍 TEST 1: Standard Search ("${standardQuery}")`);
//   console.log(`====================================`);
//   const standardSearch = search(standardQuery, context, { 
//       lemma: false, root: false, fuzzy: false 
//   });
//   analyzeHighlights(standardSearch.results);

//   // ==========================================
//   // TEST 2: REGEX SEARCH (Straight from the docs)
//   // ==========================================
//   const regexQuery = 'الله.*الرحمن';
//   console.log(`\n====================================`);
//   console.log(`🔍 TEST 2: Regex Search ("${regexQuery}" in Sura 1)`);
//   console.log(`====================================`);
//   const regexSearch = search(regexQuery, context, { 
//       lemma: false, root: false, isRegex: true, suraId: 1 
//   });
//   analyzeHighlights(regexSearch.results);
// }

// // Helper function to print out the exact highlighting data
// function analyzeHighlights(results) {
//     if (results.length === 0) {
//         console.log("❌ 0 results found.");
//         return;
//     }

//     const topResults = results.slice(0, 3);
    
//     topResults.forEach((res, index) => {
//         console.log(`\n--- Result #${index + 1} ---`);
//         console.log(`Verse: ${res.uthmani}`);
//         console.log(`Matched Tokens:`, res.matchedTokens);
        
//         try {
//             // This is the function that builds the UI highlight array
//             const ranges = getHighlightRanges(res.uthmani, res.matchedTokens, res.tokenTypes);
//             console.log(`Highlight Ranges:`, ranges);
//         } catch (error) {
//             console.log(`Highlight Ranges: ❌ FAILED - ${error.message}`);
//         }
//     });
// }

// testHighlighting();

//----------------------------

// test.mjs
// import { search, loadQuranData, loadMorphology, loadWordMap, getHighlightRanges } from 'quran-search-engine';

// async function diagnoseHighlightBug() {
//   console.log("Loading datasets (v0.3.2)...\n");
//   const [quranData, morphologyMap, wordMap] = await Promise.all([
//     loadQuranData(), loadMorphology(), loadWordMap()
//   ]);
//   const context = { quranData, morphologyMap, wordMap };

//   const query = "وسليمان";
//   console.log(`🔍 Searching for: "${query}" (Lemma mode)\n`);

//   // Run the lemma search
//   const lemmaSearch = search(query, context, { lemma: true, root: false, fuzzy: false });

//   // Filter down to the specific verse from your screenshot (4:163)
//   // Using the exact property names from the v0.3.2 docs
//   const targetVerse = lemmaSearch.results.find(r => r.sura_id === 4 && r.aya_id === 163);

//   if (!targetVerse) {
//       console.log("❌ Verse 4:163 not found in the search results.");
//       return;
//   }

//   console.log(`====================================`);
//   console.log(`📖 VERSE ${targetVerse.sura_id}:${targetVerse.aya_id} (Al-Nisa)`);
//   console.log(`====================================`);
//   console.log(`Raw Uthmani Text: ${targetVerse.uthmani}\n`);
//   console.log(`Matched Tokens:  `, targetVerse.matchedTokens);
  
//   try {
//       // Run the package's highlight utility
//       const ranges = getHighlightRanges(targetVerse.uthmani, targetVerse.matchedTokens, targetVerse.tokenTypes);
//       console.log(`Highlight Ranges:`, ranges);
      
//       console.log(`\n✂️ SLICING THE TEXT BASED ON RANGES:`);
//       ranges.forEach((range, i) => {
//           // We slice the package's own Uthmani text using the calculated ranges
//           const highlightedText = targetVerse.uthmani.substring(range.start, range.end);
//           console.log(`  -> Range [${i}]: "${highlightedText}"`);
//       });
//   } catch (error) {
//       console.log(`Highlight Ranges: ❌ FAILED - ${error.message}`);
//   }
// }

// diagnoseHighlightBug();