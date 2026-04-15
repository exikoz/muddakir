import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AIScopeMessage } from '../../types/aiScope'
import { AI_SCOPE_MODELS } from '../../types/aiScope'
import AIScopeResponse from './AIScopeResponse'

interface Props {
  message: AIScopeMessage
}

export default function AIScopeMessageItem({ message }: Props) {
  const { t } = useTranslation('aiScope')
  const [showToolCalls, setShowToolCalls] = useState(false)

  const isUser = message.role === 'user'
  const modelMeta = message.modelId ? AI_SCOPE_MODELS[message.modelId] : null

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Role indicator */}
      <div className={`flex items-center gap-1 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
        {isUser ? (
          <User size={10} className="text-slate-400" />
        ) : (
          <Sparkles size={10} className="text-purple-400" />
        )}
        <span className="text-[10px] text-slate-400 font-medium">
          {isUser ? t('you') : t('title')}
        </span>
      </div>

      {/* Message content */}
      {isUser ? (
        /* User bubble — purple, right-aligned */
        <div className="max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed bg-purple-500 text-white rounded-br-md">
          {message.content}
        </div>
      ) : (
        /* Assistant — structured response, full width */
        <div className="w-full">
          <AIScopeResponse content={message.content} />
        </div>
      )}

      {/* Model metadata (assistant only) */}
      {!isUser && modelMeta && (
        <span className="text-[9px] text-slate-400 mt-1 ml-1">
          via {modelMeta.description}
        </span>
      )}

      {/* Tool call debug toggle (assistant only) */}
      {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
        <button
          onClick={() => setShowToolCalls(!showToolCalls)}
          className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 hover:text-amber-600 transition-colors"
        >
          {showToolCalls ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {message.toolCalls.length} {message.toolCalls.length > 1 ? t('tool_calls_plural', { count: message.toolCalls.length }) : t('tool_calls', { count: message.toolCalls.length })}
        </button>
      )}

      {showToolCalls && message.toolCalls && (
        <div className="mt-1 w-full space-y-1">
          {message.toolCalls.map(tc => (
            <details key={tc.id} className="bg-slate-50 border border-slate-100 rounded-lg text-[10px] overflow-hidden">
              <summary className="px-2 py-1 cursor-pointer hover:bg-slate-100 flex items-center gap-1.5">
                <span className={tc.status === 'success' ? 'text-emerald-500' : 'text-red-500'}>
                  {tc.status === 'success' ? '✅' : '❌'}
                </span>
                <span className="font-mono font-medium text-slate-600">{tc.tool}</span>
                {tc.modelId && (
                  <span className="text-[8px] px-1 py-0.5 rounded bg-purple-50 text-purple-500 font-medium">
                    {AI_SCOPE_MODELS[tc.modelId]?.label}
                  </span>
                )}
                <span className="text-slate-400 ml-auto">{tc.durationMs.toFixed(0)}ms</span>
              </summary>
              <div className="px-2 py-1.5 border-t border-slate-100 space-y-1">
                <div>
                  <span className="text-slate-400">Input:</span>
                  <pre className="mt-0.5 bg-white rounded p-1.5 overflow-x-auto text-[9px] text-slate-600 font-mono whitespace-pre-wrap">
                    {JSON.stringify(tc.input, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="text-slate-400">Output:</span>
                  <pre className="mt-0.5 bg-white rounded p-1.5 overflow-x-auto text-[9px] text-slate-600 font-mono whitespace-pre-wrap max-h-40">
                    {JSON.stringify(tc.output, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
