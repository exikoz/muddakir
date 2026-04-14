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
      className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-slate-200 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50"
    >
      <div className="pl-3 text-emerald-500">
        {discoveryLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Search word (e.g. رحمة)"
        className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 w-36 font-medium text-sm"
        dir="rtl"
      />
      <button
        type="submit"
        disabled={discoveryLoading || !input.trim()}
        className="bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {discoveryLoading ? '...' : 'Find'}
      </button>
    </form>
  )
}
