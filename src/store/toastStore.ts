/**
 * Toast notification store — lightweight, non-blocking notifications.
 *
 * Used for:
 *   - Unsaved work warnings before navigation/redirect
 *   - Success/error feedback for user actions
 *   - Sign-in nudges
 */

import { create } from 'zustand'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  type: ToastType
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number // ms, 0 = persistent until dismissed
}

interface ToastState {
  toasts: Toast[]
  show: (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

let nextId = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (toast) => {
    const id = `toast-${++nextId}`
    const newToast: Toast = { ...toast, id }

    set({ toasts: [...get().toasts, newToast] })

    // Auto-dismiss after duration (default 5s, 0 = no auto-dismiss)
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        get().dismiss(id)
      }, duration)
    }

    return id
  },

  dismiss: (id) => {
    set({ toasts: get().toasts.filter(t => t.id !== id) })
  },

  dismissAll: () => {
    set({ toasts: [] })
  },
}))
