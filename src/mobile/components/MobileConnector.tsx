/**
 * Thread connector — vertical line with search term label.
 * Shows the relationship between a parent verse and its search results.
 * No indentation — always full width. The line itself is the visual cue.
 */

import { memo } from 'react'
import { ArrowDown } from 'lucide-react'
import { MODE_COLORS } from '../../lib/modeColors'
import type { MatchType } from '../../types/quran'

interface Props {
  searchTerm: string
  matchType: MatchType
  /** The verse key of the source node (for context) */
  sourceVerseKey?: string
}

function MobileConnector({ searchTerm, matchType, sourceVerseKey }: Props) {
  const color = MODE_COLORS[matchType]?.edge || '#94a3b8'
  const dotColor = MODE_COLORS[matchType]?.dot || 'bg-slate-400'

  return (
    <div className="flex items-stretch gap-2.5 py-1 px-2">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center w-5 shrink-0">
        <div className="w-0.5 h-3" style={{ backgroundColor: color }} />
        <div className={`w-3 h-3 rounded-full ${dotColor} shrink-0 ring-2 ring-white dark:ring-slate-900`} />
        <div className="w-0.5 h-3" style={{ backgroundColor: color }} />
      </div>

      {/* Label */}
      <div className="flex items-center gap-1.5 py-0.5 min-w-0">
        <ArrowDown size={10} style={{ color }} className="shrink-0" />
        <span className="text-xs font-arabic font-semibold text-slate-600 truncate" dir="rtl">
          {searchTerm}
        </span>
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {matchType}
        </span>
        {sourceVerseKey && (
          <span className="text-[9px] text-slate-400 shrink-0">
            {sourceVerseKey}
          </span>
        )}
      </div>
    </div>
  )
}

export default memo(MobileConnector)
