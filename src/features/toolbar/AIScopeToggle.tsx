import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAIScopeStore } from '../../store/aiScopeStore'
import { useSidePanelStore } from '../../store/sidePanelStore'

export default function AIScopeToggle() {
  const { t } = useTranslation('toolbar')
  const isOpen = useSidePanelStore(s => s.rightPanel === 'aiScope')
  const toggle = useSidePanelStore(s => s.toggle)
  const messageCount = useAIScopeStore(s => s.messages.length)

  return (
    <button
      onClick={() => toggle('aiScope')}
      className={`h-8 px-2.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold relative ${
        isOpen
          ? 'bg-violet-50 text-violet-600 border-violet-300'
          : messageCount > 0
            ? 'bg-slate-50 text-violet-600 border-slate-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300'
            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-300'
      }`}
      title={t('ai_scope_title')}
    >
      <Sparkles size={14} />
      <span>{t('ai_label')}</span>
      {messageCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-violet-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
          {messageCount > 9 ? '9+' : messageCount}
        </span>
      )}
    </button>
  )
}
