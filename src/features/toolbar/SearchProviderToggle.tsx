import { Globe, Package } from 'lucide-react'
import { useSearchProviderStore } from '../../store/searchProviderStore'

export default function SearchProviderToggle() {
  const providerName = useSearchProviderStore(s => s.providerName)
  const setProvider = useSearchProviderStore(s => s.setProvider)

  const isAPI = providerName === 'api'

  return (
    <button
      onClick={() => setProvider(isAPI ? 'package' : 'api')}
      className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
        isAPI
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600'
          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
      title={isAPI ? 'Using quran.com Search API' : 'Using quran-search-engine package'}
    >
      {isAPI ? <Globe size={13} /> : <Package size={13} />}
      <span>{isAPI ? 'API' : 'Pkg'}</span>
    </button>
  )
}
