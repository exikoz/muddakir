/**
 * Tiny store for the search provider toggle.
 * Switches between 'package' (quran-search-engine) and 'api' (quran.com Search API).
 */
import { create } from 'zustand'
import type { SearchProvider } from '../services/searchProvider'
import { packageSearchProvider } from '../services/packageSearchProvider'
import { apiSearchProvider } from '../services/apiSearchProvider'

type ProviderName = 'package' | 'api'

interface SearchProviderState {
  providerName: ProviderName
  provider: SearchProvider
  setProvider: (name: ProviderName) => void
}

export const useSearchProviderStore = create<SearchProviderState>((set) => ({
  providerName: 'package',
  provider: packageSearchProvider,
  setProvider: (name) => set({
    providerName: name,
    provider: name === 'api' ? apiSearchProvider : packageSearchProvider,
  }),
}))
