# Muddakir - Visual Quran Exploration

**Live demo:** [muddakir-kck8.vercel.app](https://muddakir-kck8.vercel.app)

Muddakir is an interactive Quran exploration workspace. You place verses on a canvas, click any Arabic word to instantly find every verse across the Quran that shares it, and keep building a visual map of connections. The more you explore, the more the Quran reveals.

---

## What makes it different

Most Quran apps are built for retrieval - you know what you want, you search, you get a list. Muddakir is built for discovery - you start somewhere and the Quran takes you further. Because everything lives on a persistent canvas, you can see two verses side by side, trace a concept across surahs, add notes, and share the whole workspace with someone else.

---

## Features

- **Canvas workspace** - place verses as nodes, connect them, build your own map
- **Multi-mode search** - exact, lemma, root, fuzzy, semantic, regex, boolean, phonetic, range
- **Word builder** - select adjacent words from a verse and run them as a phrase query
- **Verse detail panel** - word-by-word morphology, translations, classical tafsīr, similar phrases, AI explanation
- **AI Scope** - ask questions grounded in Quran.com sources via MCP server, every answer includes a verification nonce and full source chain
- **Audio** - verse playback with word-by-word highlighting, multiple reciters
- **Mushaf reader** - traditional page view, navigate directly from canvas nodes
- **Bookmarks** - synced with your Quran.com Favorites collection
- **Streaks & activity** - reading activity tracked via Quran Foundation User APIs
- **Arabic & English** - full RTL support
- **Workspaces** - save, name, share by URL, export as JSON

---

## Tech stack

- React + TypeScript + Vite
- ReactFlow (canvas)
- Zustand (state)
- Tailwind CSS
- Vercel (hosting + serverless functions)
- Gemini AI via MCP (AI Scope)

### Key dependencies

| Package | Purpose |
|---|---|
| `@xyflow/react` | Canvas graph engine |
| `quran-search-engine` | Advanced Arabic search (lemma, root, semantic, regex) |
| `@quranjs/api` | Quran Foundation SDK |
| `zustand` | State management |
| `react-i18next` | Arabic / English localization |

---

## Quran Foundation APIs used

**Content APIs** - verses, translations, tafsir, recitations, audio timing, search

**User APIs** - OAuth 2.0 (PKCE), bookmarks, collections, activity days, streaks

All authenticated requests are proxied through Vercel serverless functions. No credentials are ever exposed to the browser.

---

## Running locally

```bash
npm install
cp .env.example .env
npm run dev
```

The app requires:

- **Quran Foundation API credentials** for verse content, search, and user features. Request access at [api-docs.quran.foundation](https://api-docs.quran.foundation)
- **Gemini API key** if you want to use the AI Scope features. Set `GEMINI_API_KEY` in your environment

---

## Attribution

This project is built on the shoulders of others. Full credit to:

- **quran-search-engine** by [adelpro](https://github.com/adelpro/quran-search-engine) - powers all advanced search modes
- **Quran Foundation** ([quran.com](https://quran.com)) - all Quranic content, user data, and APIs
- **Quran.com MCP server** - grounds AI responses in verified sources

---

## License

GNU General Public License v3.0 - see [LICENSE](LICENSE)

You are free to use, study, modify, and distribute this project. Any derivative work must also be released under GPL v3. This ensures the work and everything built on it remains open.

---

Not affiliated with Quran Foundation or Quran.com. All Quranic content is provided by and belongs to the Quran Foundation.
