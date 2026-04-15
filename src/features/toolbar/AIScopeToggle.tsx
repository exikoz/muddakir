import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAIScopeStore } from '../../store/aiScopeStore'

export default function AIScopeToggle() {
  const { t } = useTranslation('toolbar')
  const isOpen = useAIScopeStore(s => s.isOpen)
  const toggle = useAIScopeStore(s => s.toggle)
  const messageCount = useAIScopeStore(s => s.messages.length)

  return (
    <button
      onClick={toggle}
      className={`h-8 w-8 rounded-lg border transition-all flex items-center justify-center relative ${
        isOpen
          ? 'bg-purple-50 text-purple-600 border-purple-300'
          : messageCount > 0
            ? 'bg-slate-50 text-purple-600 border-slate-200 hover:border-purple-300 hover:bg-purple-50'
            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:text-slate-600 hover:border-slate-300'
      }`}
      title={t('ai_scope_title')}
    >
      <Sparkles size={14} />
      {messageCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 rtl:-right-auto rtl:-left-1 min-w-[14px] h-[14px] rounded-full bg-purple-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
          {messageCount > 9 ? '9+' : messageCount}
        </span>
      )}
    </button>
  )
}
