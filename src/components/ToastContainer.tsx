/**
 * Toast notification container — renders at the bottom-right of the viewport.
 * Non-blocking, dismissible notifications with optional action buttons.
 */

import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'
import { useToastStore, type ToastType } from '../store/toastStore'

const ICON_MAP: Record<ToastType, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
}

const COLOR_MAP: Record<ToastType, { bg: string; border: string; icon: string }> = {
  info: { bg: 'bg-slate-800', border: 'border-slate-600', icon: 'text-blue-400' },
  success: { bg: 'bg-slate-800', border: 'border-emerald-600', icon: 'text-emerald-400' },
  warning: { bg: 'bg-slate-800', border: 'border-amber-500', icon: 'text-amber-400' },
  error: { bg: 'bg-slate-800', border: 'border-red-500', icon: 'text-red-400' },
}

export default function ToastContainer() {
  const toasts = useToastStore(s => s.toasts)
  const dismiss = useToastStore(s => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => {
        const Icon = ICON_MAP[toast.type]
        const colors = COLOR_MAP[toast.type]

        return (
          <div
            key={toast.id}
            className={`${colors.bg} ${colors.border} border rounded-xl px-4 py-3 shadow-2xl flex items-start gap-3 animate-in slide-in-from-right-5 fade-in duration-200`}
            role="alert"
          >
            <Icon size={16} className={`${colors.icon} mt-0.5 shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white leading-snug">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick()
                    dismiss(toast.id)
                  }}
                  className="mt-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-slate-400 hover:text-white transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
