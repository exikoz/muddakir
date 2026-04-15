# Internationalization (i18n) Implementation

## Overview

Full i18n support added to muddakir using `react-i18next` + `i18next` with Arabic as the first additional language. The implementation covers string extraction, RTL layout flipping, a language switcher UI, and automated translation completeness tests.

## Architecture & Design Choices

### Library: `react-i18next` + `i18next`

Chosen for industry-standard React/TypeScript support, 13M+ weekly npm downloads, first-class RTL handling, and namespace-based organization. Three packages total:

- `i18next` — core translation engine
- `react-i18next` — React bindings (`useTranslation` hook)
- `i18next-browser-languagedetector` — auto-detects and persists language in localStorage

### Static imports over lazy loading (YAGNI)

All translation JSON files are statically imported in `src/i18n/config.ts`. With only 2 languages and ~120 keys each, the bundle impact is negligible. Lazy loading can be added later via `i18next-http-backend` if the translation files grow significantly.

### Namespace-per-feature pattern

Translations are split into 8 namespaces matching the app's feature structure:

| Namespace     | Scope                                      |
|---------------|--------------------------------------------|
| `common`      | App-wide strings (app name)                |
| `toolbar`     | All toolbar components                     |
| `discovery`   | Discovery panel and items                  |
| `mushaf`      | Mushaf panel and verse rows                |
| `workspace`   | Workspace panel                            |
| `verseDetail` | Verse detail panel and all tab sections    |
| `aiScope`     | AI Scope panel, messages, context, debug   |
| `graph`       | Verse nodes, node actions, mini player     |

### RTL via Tailwind `rtl:` variant

Instead of maintaining separate RTL stylesheets, the `dir="rtl"` attribute is set on `<html>` and Tailwind v4's built-in `rtl:` variant handles all directional flipping. Panels, dropdowns, badges, borders, and padding all use `rtl:` classes inline.

### What is NOT translated

- Quran Arabic text (comes from API, already Arabic)
- Verse keys like `2:255` (universal notation)
- Surah names in `surahNames.ts` (proper nouns from API)
- API response content (translations, tafsir — API handles language)
- Debug console internals (developer-facing)

## File Structure

```
src/i18n/
├── config.ts              # i18next initialization, all namespace imports
├── useDirection.ts         # Hook: syncs <html dir> and lang attributes
├── locales/
│   ├── en/
│   │   ├── common.json
│   │   ├── toolbar.json
│   │   ├── discovery.json
│   │   ├── mushaf.json
│   │   ├── workspace.json
│   │   ├── verseDetail.json
│   │   ├── aiScope.json
│   │   └── graph.json
│   └── ar/
│       ├── common.json
│       ├── toolbar.json
│       ├── discovery.json
│       ├── mushaf.json
│       ├── workspace.json
│       ├── verseDetail.json
│       ├── aiScope.json
│       └── graph.json
└── __tests__/
    └── translations.test.ts  # Key completeness + empty value checks
```

## Affected Components (28 files modified)

### Foundation
- `src/main.tsx` — imports `./i18n/config` before React renders
- `src/app/providers.tsx` — calls `useDirection()` for HTML attribute sync

### Toolbar (10 files)
- `SeedInput.tsx` — placeholder, button label, error alert
- `TextSearch.tsx` — placeholder, button label
- `ModeToggle.tsx` — mode hint text
- `MultiWordToggle.tsx` — toggle labels (Multi, Adj, Free)
- `UndoRedo.tsx` — tooltip titles
- `AdvancedToggle.tsx` — menu item labels, tooltip
- `AIScopeToggle.tsx` — tooltip
- `DiscoveryToggle.tsx` — tooltip with count interpolation
- `MushafToggle.tsx` — tooltip
- `WorkspaceToggle.tsx` — tooltip
- `Toolbar.tsx` — imports and renders `LanguageToggle`
- `LanguageToggle.tsx` — **new component**, cycles EN/AR with globe icon

### Discovery (2 files)
- `DiscoveryPanel.tsx` — title, search placeholder, result counts, mode info
- `DiscoveryItem.tsx` — error text, add button title

### Mushaf (2 files)
- `MushafPanel.tsx` — surah info, loading states, navigation labels
- `VerseRow.tsx` — copy/explorer button labels

### Workspace (1 file)
- `WorkspacePanel.tsx` — all labels, error messages, confirm dialog, empty state

### Verse Detail (7 files)
- `VerseDetailPanel.tsx` — tab labels
- `VerseHeader.tsx` — back button text (direction-aware arrow icon)
- `WordByWordSection.tsx` — hint text, loading state, ask-more placeholder
- `TranslationsSection.tsx` — selector label, loading/error states, empty states
- `TafsirSection.tsx` — loading/error states, expand/collapse labels
- `VerseExplanationSection.tsx` — loading, attribution, ask-more
- `ArabicTextSection.tsx` — expand/collapse labels
- `ReflectionsSection.tsx` — section title, loading, expand/collapse, attribution

### AI Scope (6 files)
- `AIScopePanel.tsx` — title, subtitle, suggestions, input placeholder, loading
- `AIScopeMessageItem.tsx` — role labels, tool call counts
- `AIScopeContextBar.tsx` — context label, clear button
- `AIScopeVerseCard.tsx` — add/added labels, loading/error states, mushaf link
- `AIScopeResponse.tsx` — "also referenced" label, add-all button
- `MCPDebugPanel.tsx` — log count label, empty state

### Graph (3 files)
- `VerseNode.tsx` — previous/next labels, verse label, mushaf link
- `NodeActions.tsx` — tooltip titles (detail, AI scope, remove)
- `MiniPlayer.tsx` — play label, reciter menu title

## Key Methods & Patterns

### `useTranslation(namespace)` — per-component hook
```tsx
const { t } = useTranslation('toolbar')
// Usage: t('go'), t('verse_placeholder')
```

### Interpolation for dynamic values
```tsx
t('results_found', { count: results.length })
// EN: "{{count}} related verses found"
// AR: "{{count}} آية ذات صلة"
```

### RTL panel flipping pattern
```tsx
className={`fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 ...
  ${isOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}`}
```

### Direction-aware icons
```tsx
const { t, i18n } = useTranslation('verseDetail')
const isRtl = i18n.dir() === 'rtl'
// ...
{isRtl ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
```

### Language cycling
```tsx
const idx = supportedLanguages.indexOf(currentLang)
const next = supportedLanguages[(idx + 1) % supportedLanguages.length]
i18n.changeLanguage(next) // auto-persists to localStorage
```

## Adding a New Language

1. Create `src/i18n/locales/{code}/` with all 8 namespace JSON files (copy from `en/`)
2. Import them in `src/i18n/config.ts` and add to the `resources` object
3. Add the language code to `supportedLanguages` array
4. If RTL, add to `rtlLanguages` array
5. Add a label in `LanguageToggle.tsx` `LANGUAGE_LABELS`
6. Run `npx vitest run src/i18n/__tests__/translations.test.ts` to verify completeness

## Testing

32 automated tests verify:
- Every English key exists in Arabic (and vice versa)
- No extra/orphaned keys in any locale
- No empty string values

Run: `npx vitest run src/i18n/__tests__/translations.test.ts`
