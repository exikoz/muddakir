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
      className={`h-8 w-8 rounded-lg border transition-all flex items-center justify-center ${
        isMushafOpen
          ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:text-slate-600 hover:border-slate-300'
      }`}
      title="Toggle Mushaf Panel"
    >
      <BookOpen size={14} />
    </button>
  )
}
