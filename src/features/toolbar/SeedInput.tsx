import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'

export default function SeedInput() {
  const { t } = useTranslation('toolbar')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const addVerseNode = useStore(s => s.addVerseNode)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const verseKey = input.trim()
    if (!verseKey) return

    setLoading(true)
    try {
      await addVerseNode(verseKey)
      setInput('')
    } catch (err) {
      console.error('[SeedInput] error:', err)
      alert(t('failed_to_fetch_verse'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center h-8 bg-slate-50 rounded-lg border border-slate-200 transition-all focus-within:border-slate-400 focus-within:bg-white"
    >
      <div className="pl-2 text-slate-400">
        <MapPin size={13} />
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={t('verse_placeholder')}
        className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 w-24 text-xs px-1.5"
      />
      <button
        type="submit"
        disabled={loading}
        className="h-full px-2.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-l border-slate-200"
      >
        {loading ? '…' : t('go')}
      </button>
    </form>
  )
}
