import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react'
import {
  X,
  Send,
  Sparkles,
  Loader2,
  Trash2,
  Bug,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAIScopeStore } from '../../store/aiScopeStore'
import { useSidePanelStore } from '../../store/sidePanelStore'
import { getLogSnapshot, subscribeToLogs } from '../../services/aiScopeService'
import { AI_SCOPE_MODELS } from '../../types/aiScope'
import type { AIScopeModelId } from '../../types/aiScope'
import AIScopeMessageItem from './AIScopeMessageItem'
import AIScopeContextBar from './AIScopeContextBar'
import MCPDebugPanel from './MCPDebugPanel'

const MODEL_OPTIONS: { id: AIScopeModelId; label: string }[] = [
  { id: 'gemini-2.5-flash', label: 'Lite' },
  { id: 'gemini-3.1-pro-preview', label: 'Deep' },
]

export default function AIScopePanel() {
  const { t } = useTranslation('aiScope')
  const isOpen = useSidePanelStore(s => s.rightPanel === 'aiScope')
  const closePanel = useSidePanelStore(s => s.close)
  const messages = useAIScopeStore(s => s.messages)
  const isLoading = useAIScopeStore(s => s.isLoading)
  const sendQuery = useAIScopeStore(s => s.sendQuery)
  const clearChat = useAIScopeStore(s => s.clearChat)
  const contextItems = useAIScopeStore(s => s.contextItems)
  const showDebugLogs = useAIScopeStore(s => s.showDebugLogs)
  const setShowDebugLogs = useAIScopeStore(s => s.setShowDebugLogs)
  const selectedModel = useAIScopeStore(s => s.selectedModel)
  const setSelectedModel = useAIScopeStore(s => s.setSelectedModel)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    sendQuery(trimmed)
    setInput('')
  }, [input, isLoading, sendQuery])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  const logs = useSyncExternalStore(subscribeToLogs, getLogSnapshot)

  return (
    <div
      dir="ltr"
      className={`fixed top-12 bottom-0 right-0 w-[420px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0 space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            <div>
              <h2 className="font-semibold text-slate-800 text-sm leading-tight">{t('title')}</h2>
              <p className="text-[10px] text-slate-400">{t('subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDebugLogs(!showDebugLogs)}
              className={`p-1.5 rounded-lg transition-colors relative ${
                showDebugLogs
                  ? 'bg-amber-50 text-amber-600'
                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              }`}
              title={t('toggle_debug')}
            >
              <Bug size={14} />
              {logs.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-[12px] rounded-full bg-amber-500 text-white text-[7px] font-bold flex items-center justify-center px-0.5">
                  {logs.length}
                </span>
              )}
            </button>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                title={t('clear_chat')}
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={() => closePanel('aiScope')}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Model selector — segment control */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          {MODEL_OPTIONS.map(opt => {
            const isActive = selectedModel === opt.id
            const meta = AI_SCOPE_MODELS[opt.id]
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedModel(opt.id)}
                className={`flex-1 text-[11px] font-semibold py-1 rounded-md transition-all ${
                  isActive
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title={meta.description}
              >
                {opt.label}
                <span className="ml-1 text-[9px] font-normal opacity-60">{meta.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Context bar */}
      {contextItems.length > 0 && <AIScopeContextBar />}

      {/* Debug panel (collapsible) */}
      {showDebugLogs && <MCPDebugPanel />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Sparkles size={32} className="text-purple-200 mb-3" />
            <p className="text-sm font-medium text-slate-500 mb-1">{t('empty_title')}</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('empty_description')}
            </p>
            <div className="mt-4 space-y-1.5 w-full">
              {[
                t('suggestion_1'),
                t('suggestion_2'),
                t('suggestion_3'),
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion)
                    inputRef.current?.focus()
                  }}
                  className="w-full text-left text-xs text-slate-500 hover:text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-lg border border-slate-100 hover:border-purple-200 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <AIScopeMessageItem key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-purple-500 text-xs py-2">
            <Loader2 size={14} className="animate-spin" />
            <span>{t('searching')}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-slate-100 shrink-0">
        <div className="flex items-end gap-2 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-purple-300 focus-within:bg-white transition-all px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('input_placeholder')}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 resize-none max-h-24"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-1.5 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  )
}
