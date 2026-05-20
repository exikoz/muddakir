/**
 * Full-screen panel container — slides up from bottom.
 * Used for verse detail, mushaf reader, and AI scope on mobile.
 */

import { ArrowLeft } from 'lucide-react'
import { useMobileStore } from '../store/mobileStore'

interface Props {
  title: string
  children: React.ReactNode
}

export default function MobileFullScreenPanel({ title, children }: Props) {
  const closePanel = useMobileStore(s => s.closePanel)

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        <button
          onClick={closePanel}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-sm font-semibold text-slate-700 truncate">{title}</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
