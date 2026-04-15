import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useStore } from '../../store'

export default function TextSearch() {
  const [input, setInput] = useState('')
  const discoveryLoading = useStore(s => s.discoveryLoading)
  const searchDiscovery = useStore(s => s.searchDiscovery)
  const setDiscoveryOpen = useStore(s => s.setDiscoveryOpen)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    setDiscoveryOpen(true)
    await searchDiscovery(trimmed)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center h-8 bg-slate-50 rounded-lg border border-slate-200 transition-all focus-within:border-emerald-400 focus-within:bg-white"
    >
      <div className="pl-2 text-slate-400">
        {discoveryLoading ? <Loader2 size={13} className="animate-spin text-emerald-500" /> : <Search size={13} />}
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Word (رحمة)"
        className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 w-24 text-xs px-1.5"
        dir="rtl"
      />
      <button
        type="submit"
        disabled={discoveryLoading || !input.trim()}
        className="h-full px-2.5 text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-l border-slate-200"
      >
        {discoveryLoading ? '…' : 'Find'}
      </button>
    </form>
  )
}
