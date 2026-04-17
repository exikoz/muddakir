import type { MatchType, SearchOptions } from '../types/quran'

/**
 * Centralized color configuration for search modes.
 * Change colors here and they will apply everywhere in the app.
 */
export const MODE_COLORS = {
  exact: {
    name: 'Exact',
    // Dot color in mode toggle
    dot: 'bg-emerald-500',
    // Active state in mode toggle dropdown
    active: 'text-emerald-700 bg-emerald-50 border-emerald-300',
    // Hover color on words in verse nodes
    hover: 'hover:bg-emerald-50 hover:text-emerald-700',
    // Clicked/active word background in source node
    clickedBg: 'bg-emerald-100',
    clickedText: 'text-emerald-900',
    clickedBorder: 'border-emerald-300',
    // Matched word highlight in result nodes
    matchHighlight: 'bg-emerald-100 text-emerald-900',
    // Edge color (hex for SVG)
    edge: '#10b981', // emerald-500
    // Discovery panel badge
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  lemma: {
    name: 'Lemma',
    dot: 'bg-blue-500',
    active: 'text-blue-700 bg-blue-50 border-blue-300',
    hover: 'hover:bg-blue-50 hover:text-blue-700',
    clickedBg: 'bg-blue-100',
    clickedText: 'text-blue-900',
    clickedBorder: 'border-blue-300',
    matchHighlight: 'bg-blue-100 text-blue-900',
    edge: '#3b82f6', // blue-500
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  root: {
    name: 'Root',
    dot: 'bg-violet-500',
    active: 'text-violet-700 bg-violet-50 border-violet-300',
    hover: 'hover:bg-violet-50 hover:text-violet-700',
    clickedBg: 'bg-violet-100',
    clickedText: 'text-violet-900',
    clickedBorder: 'border-violet-300',
    matchHighlight: 'bg-violet-100 text-violet-900',
    edge: '#8b5cf6', // violet-500
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  fuzzy: {
    name: 'Fuzzy',
    dot: 'bg-amber-500',
    active: 'text-amber-700 bg-amber-50 border-amber-300',
    hover: 'hover:bg-amber-50 hover:text-amber-700',
    clickedBg: 'bg-amber-100',
    clickedText: 'text-amber-900',
    clickedBorder: 'border-amber-300',
    matchHighlight: 'bg-amber-100 text-amber-900',
    edge: '#f59e0b', // amber-500
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  semantic: {
    name: 'Semantic',
    dot: 'bg-cyan-500',
    active: 'text-cyan-700 bg-cyan-50 border-cyan-300',
    hover: 'hover:bg-cyan-50 hover:text-cyan-700',
    clickedBg: 'bg-cyan-100',
    clickedText: 'text-cyan-900',
    clickedBorder: 'border-cyan-300',
    matchHighlight: 'bg-cyan-100 text-cyan-900',
    edge: '#06b6d4', // cyan-500
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
  none: {
    name: 'None',
    dot: 'bg-slate-400',
    active: 'text-slate-700 bg-slate-50 border-slate-300',
    hover: 'hover:bg-slate-50 hover:text-slate-700',
    clickedBg: 'bg-red-100',
    clickedText: 'text-red-900',
    clickedBorder: 'border-red-300',
    matchHighlight: 'bg-slate-100 text-slate-900',
    edge: '#94a3b8', // slate-400
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
} as const

/**
 * When true, all search-related colors (highlights, edges, clicked words, badges)
 * use the mode-specific palette (blue for lemma, violet for root, etc.).
 * When false, everything uses the emerald (exact) palette uniformly.
 * 
 * Flip this to `true` to re-enable per-mode colors — all the logic is in place.
 */
const USE_MODE_COLORS = false

/**
 * Get the active search mode from SearchOptions
 */
export function getActiveMode(searchOptions: SearchOptions): MatchType {
  if (searchOptions.lemma) return 'lemma'
  if (searchOptions.root) return 'root'
  if (searchOptions.fuzzy) return 'fuzzy'
  if (searchOptions.semantic) return 'semantic'
  return 'exact'
}

/**
 * Get colors for a specific match type.
 * When USE_MODE_COLORS is false, always returns emerald (exact) palette.
 */
export function getModeColors(matchType: MatchType) {
  if (!USE_MODE_COLORS) return MODE_COLORS.exact
  return MODE_COLORS[matchType as keyof typeof MODE_COLORS] || MODE_COLORS.exact
}

/**
 * Get edge color for a specific match type
 */
export function getEdgeColor(matchType: MatchType): string {
  return getModeColors(matchType).edge
}

/**
 * Get hover classes for the current active mode
 */
export function getHoverClasses(searchOptions: SearchOptions): string {
  const mode = getActiveMode(searchOptions)
  return getModeColors(mode).hover
}

/**
 * Get clicked word classes for a specific match type
 */
export function getClickedWordClasses(matchType: MatchType): string {
  const colors = getModeColors(matchType)
  return `${colors.clickedBg} ${colors.clickedText} border ${colors.clickedBorder} shadow-sm`
}

/**
 * Get match highlight classes for a specific match type
 */
export function getMatchHighlightClasses(matchType: MatchType): string {
  return getModeColors(matchType).matchHighlight
}

/**
 * Get badge classes for discovery panel
 */
export function getBadgeClasses(matchType: MatchType): string {
  return getModeColors(matchType).badge
}
