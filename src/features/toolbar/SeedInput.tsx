import { useState } from 'react'
import { Search } from 'lucide-react'
import { fetchVerse } from '../../services/quranApi'
import { useStore } from '../../store'

export default function SeedInput() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const addNode = useStore(s => s.addNode)
  const nodes = useStore(s => s.nodes)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const verseKey = input.trim()
    if (!verseKey) return

    setLoading(true)
    try {
      const verse = await fetchVerse(verseKey)
      if (!verse) {
        alert(`Verse ${verseKey} not found`)
        return
      }

      const offset = nodes.length * 30
      const newNode = {
        id: `verse-${verseKey}-${Date.now()}`,
        type: 'verse' as const,
        position: { x: 200 + offset, y: 200 + offset },
        data: { verse },
      }

      addNode(newNode)
      setInput('')
    } catch (err) {
      console.error('[SeedInput] error:', err)
      alert('Failed to fetch verse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-slate-200 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50"
    >
      <div className="pl-3 text-slate-400">
        <Search size={16} />
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Enter Verse (e.g., 2:255)"
        className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 w-40 font-medium text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-slate-900 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '...' : 'Seed'}
      </button>
    </form>
  )
}
