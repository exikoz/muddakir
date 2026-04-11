import { BookOpen } from 'lucide-react'
import { useStore } from '../../store'

export default function MushafToggle() {
  const isMushafOpen = useStore(s => s.isMushafOpen)
  const openMushaf = useStore(s => s.openMushaf)
  const setMushafOpen = useStore(s => s.setMushafOpen)

  const handleToggle = () => {
    if (isMushafOpen) {
      setMushafOpen(false)
    } else {
      openMushaf()
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
        isMushafOpen
          ? 'bg-emerald-600 text-white shadow-lg'
          : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
      }`}
      title="Toggle Mushaf Panel"
    >
      <BookOpen size={16} />
      Mushaf
    </button>
  )
}
