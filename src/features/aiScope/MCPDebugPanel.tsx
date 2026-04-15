import { useSyncExternalStore } from 'react'
import { Trash2 } from 'lucide-react'
import { getLogSnapshot, subscribeToLogs, clearLogs } from '../../services/aiScopeService'
import { AI_SCOPE_MODELS } from '../../types/aiScope'

export default function MCPDebugPanel() {
  const logs = useSyncExternalStore(subscribeToLogs, getLogSnapshot)

  return (
    <div className="border-b border-slate-100 bg-amber-50/40 max-h-48 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between px-3 py-1.5 sticky top-0 bg-amber-50/80 backdrop-blur-sm">
        <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
          MCP Logs ({logs.length})
        </span>
        {logs.length > 0 && (
          <button
            onClick={clearLogs}
            className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <p className="px-3 py-2 text-[10px] text-slate-400">No MCP tool calls yet.</p>
      ) : (
        <div className="px-3 pb-2 space-y-1">
          {logs.map(log => (
            <details key={log.id} className="bg-white border border-amber-100 rounded-lg text-[10px] overflow-hidden">
              <summary className="px-2 py-1 cursor-pointer hover:bg-amber-50 flex items-center gap-1.5">
                <span className={log.status === 'success' ? 'text-emerald-500' : 'text-red-500'}>
                  {log.status === 'success' ? '✅' : '❌'}
                </span>
                <span className="font-mono font-medium text-slate-600">{log.tool}</span>
                {log.modelId && (
                  <span className="text-[8px] px-1 py-0.5 rounded bg-purple-50 text-purple-500 font-medium">
                    {AI_SCOPE_MODELS[log.modelId]?.label ?? log.modelId}
                  </span>
                )}
                <span className="text-slate-400 ml-auto">{log.durationMs.toFixed(0)}ms</span>
                <span className="text-slate-300">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </summary>
              <div className="px-2 py-1.5 border-t border-amber-100 space-y-1">
                <div>
                  <span className="text-amber-600 font-medium">Input:</span>
                  <pre className="mt-0.5 bg-amber-50 rounded p-1.5 overflow-x-auto text-[9px] text-slate-600 font-mono whitespace-pre-wrap">
                    {JSON.stringify(log.input, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="text-amber-600 font-medium">Output:</span>
                  <pre className="mt-0.5 bg-amber-50 rounded p-1.5 overflow-x-auto text-[9px] text-slate-600 font-mono whitespace-pre-wrap max-h-32">
                    {JSON.stringify(log.output, null, 2)}
                  </pre>
                </div>
                {log.modelId && (
                  <div>
                    <span className="text-purple-600 font-medium">Model:</span>
                    <span className="ml-1 text-slate-600">{log.modelId}</span>
                  </div>
                )}
                {log.error && (
                  <div>
                    <span className="text-red-600 font-medium">Error:</span>
                    <pre className="mt-0.5 bg-red-50 rounded p-1.5 text-[9px] text-red-600 font-mono">
                      {log.error}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
