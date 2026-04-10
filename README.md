Got it — here’s a **clean, minimal, developer-focused README** with:

* No unnecessary sections (install, contributing, etc.)
* Clear explanation of the project
* Proper attribution
* Professional GitHub style

---

# Muddakir - Quran Search & Exploration

Muddakir is a modern Quran search and exploration application built with React and TypeScript. It provides advanced search capabilities, real-time highlighting, and graph-based exploration of verses.

---

## Overview

The application enables deep exploration of the Quran through multiple search strategies and visual tools. It is designed as an internal/developer-focused project that leverages existing search engines and APIs rather than reimplementing core logic.

---

## Core Capabilities

### Advanced Search

Search across all 6,236 verses using:

* Exact text matching
* Lemma (morphological) search
* Root-based search
* Fuzzy matching
* Semantic search
* Regex patterns
* Boolean logic (AND, OR, NOT)
* Range queries (`2:255`, `1:1-7`, `2:`)
* Phonetic search (Latin transliteration)

### Visual Exploration

* Graph-based verse relationships
* Expandable discovery of related verses
* Node-based navigation

### Text Processing

* Arabic normalization
* Diacritics removal (tashkeel)
* Side-by-side comparison tools

### Debug & Inspection Tools

* Raw search response inspection
* Execution logs
* Performance metrics
* Data loading visibility

---

## Technical Stack

* React
* TypeScript
* Vite
* Tailwind CSS

### Key Libraries

* `quran-search-engine`
* `@quranjs/api`
* `@xyflow/react`
* `zustand`

---

## Attribution

This project is built almost entirely on top of existing tools and data providers. Full credit goes to the original creators:

### quran-search-engine

[https://github.com/adelpro/quran-search-engine](https://github.com/adelpro/quran-search-engine)

* Provides the full search engine powering the application
* Handles:

  * Arabic normalization
  * Lemma and root matching
  * Token scoring and ranking
  * Semantic search logic

Most of the search functionality in this project is directly powered by this library.

### Quran.com API

[https://quran.com](https://quran.com)
[https://api.quran.com](https://api.quran.com)

* Provides Quran text and structured data
* Supplies verses, surah metadata, and related content
* Maintained by the Quran Foundation

All Quranic content used in this application comes from this API.

---

## Notes

* This project is not affiliated with the above providers
* It is a UI and integration layer built on top of their work
* All credit for data and core logic belongs to their respective maintainers

---

Built for internal use and Quran exploration
