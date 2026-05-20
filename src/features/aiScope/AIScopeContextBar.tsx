import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAIScopeStore } from '../../store/aiScopeStore'

export default function AIScopeContextBar() {
  const { t } = useTranslation('aiScope')
  const contextItems = useAIScopeStore(s => s.contextItems)
  const removeContextItem = useAIScopeStore(s => s.removeContextItem)
  const clearContext = useAIScopeStore(s => s.clearContext)

  if (contextItems.length === 0) return null

  return (
    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-purple-50/50 dark:bg-purple-900/20 shrink-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">
          {t('context')} ({contextItems.length})
        </span>
        <button
          onClick={clearContext}
          className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
        >
          {t('clear_all')}
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {contextItems.map(item => (
          <span
            key={item.verseKey}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-700 rounded-full px-2 py-0.5"
            title={item.translation}
          >
            {item.verseKey}
            <button
              onClick={() => removeContextItem(item.verseKey)}
              className="hover:text-red-500 transition-colors"
            >
              <X size={8} />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
