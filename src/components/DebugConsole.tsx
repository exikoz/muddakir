import { useState, useEffect } from 'react'
import { searchWord, searchRaw, getDataStatus } from '../services/quranSearch'
import { getHighlightRanges } from '../services/quranSearch'
import { removeTashkeel, normalizeArabic } from 'quran-search-engine'
import { Search, Settings, Database, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { SearchOptions, SearchResult } from '../types/quran'
import './DebugConsole.css'

interface Props {
  onClose: () => void
}

// Examples from quran-search-engine docs
const EXAMPLES = [
  {
    category: 'Normalization',
    items: [
      { 
        label: 'removeTashkeel: بِسْمِ ٱللَّهِ', 
        query: 'بِسْمِ ٱللَّهِ',
        options: {},
        type: 'normalization' as const,
        method: 'removeTashkeel' as const
      },
      { 
        label: 'normalizeArabic: بِسْمِ ٱللَّهِ', 
        query: 'بِسْمِ ٱللَّهِ',
        options: {},
        type: 'normalization' as const,
        method: 'normalizeArabic' as const
      },
      { 
        label: 'Compare: أَلِفٌ إِلٰهٌ', 
        query: 'أَلِفٌ إِلٰهٌ',
        options: {},
        type: 'normalization' as const,
        method: 'compare' as const
      },
    ]
  },
  {
    category: 'Simple Search',
    items: [
      { label: 'Single word: الله', query: 'الله', options: { lemma: true, root: true }, type: 'search' as const },
      { label: 'Multi-word: الله الرحمن', query: 'الله الرحمن', options: { lemma: true, root: true }, type: 'search' as const },
    ]
  },
  {
    category: 'Range Search',
    items: [
      { label: 'Single verse: 2:255', query: '2:255', options: {}, type: 'search' as const },
      { label: 'Verse range: 1:1-7', query: '1:1-7', options: {}, type: 'search' as const },
      { label: 'Entire sura: 2:', query: '2:', options: {}, type: 'search' as const },
    ]
  },
  {
    category: 'Regex Search',
    items: [
      { label: 'Ends with ون: ^.*ون$', query: '^.*ون$', options: { isRegex: true }, type: 'search' as const },
      { label: 'الله followed by الرحمن', query: 'الله.*الرحمن', options: { isRegex: true }, type: 'search' as const },
    ]
  },
  {
    category: 'Boolean Search',
    items: [
      { label: 'AND: الله AND الرحمن', query: 'الله AND الرحمن', options: { isBoolean: true }, type: 'search' as const },
      { label: 'OR: الله OR الرحمن', query: 'الله OR الرحمن', options: { isBoolean: true }, type: 'search' as const },
      { label: 'NOT: الله NOT الرحمن', query: 'الله NOT الرحمن', options: { isBoolean: true }, type: 'search' as const },
      { label: 'Complex: الله AND (الرحمن OR الرحيم)', query: 'الله AND (الرحمن OR الرحيم)', options: { isBoolean: true }, type: 'search' as const },
    ]
  },
  {
    category: 'Semantic Search',
    items: [
      { label: 'Concept: Paradise', query: 'Paradise', options: { semantic: true }, type: 'search' as const },
      { label: 'Synonym: إنسان', query: 'إنسان', options: { semantic: true }, type: 'search' as const },
    ]
  },
  {
    category: 'Phonetic Search',
    items: [
      { label: 'Latin: Bismillah', query: 'Bismillah', options: {}, type: 'search' as const },
      { label: 'Latin: Allah', query: 'Allah', options: {}, type: 'search' as const },
    ]
  },
]

interface LogEntry {
  timestamp: number
  type: 'search' | 'normalization'
  input: string
  output: any
  duration: number
  details?: any
}

export default function DebugConsole({ onClose }: Props) {
  const [query, setQuery] = useState('الله')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedExample, setSelectedExample] = useState<string>('')
  const [duration, setDuration] = useState<number>(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentType, setCurrentType] = useState<'search' | 'normalization'>('search')
  const [normalizationResult, setNormalizationResult] = useState<any>(null)
  const [selectedResult, setSelectedResult] = useState<any>(null)
  const [rawResponse, setRawResponse] = useState<any>(null)
  const [dataStatus, setDataStatus] = useState<any>(null)
  
  // Options
  const [lemma, setLemma] = useState(true)
  const [root, setRoot] = useState(true)
  const [fuzzy, setFuzzy] = useState(true)
  const [semantic, setSemantic] = useState(false)
  const [isRegex, setIsRegex] = useState(false)
  const [isBoolean, setIsBoolean] = useState(false)

  // Update data status periodically
  useEffect(() => {
    const updateStatus = () => {
      const status = getDataStatus()
      setDataStatus(status)
    }
    
    updateStatus()
    const interval = setInterval(updateStatus, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = async () => {
    if (!query.trim()) return

    const startTime = performance.now()
    setLoading(true)

    console.group(`🔍 Search: "${query}"`)
    console.log('Timestamp:', new Date().toISOString())
    console.log('Options:', { lemma, root, fuzzy, semantic, isRegex, isBoolean })

    try {
      const options: SearchOptions & { isRegex?: boolean; isBoolean?: boolean } = {
        lemma,
        root,
        fuzzy,
        semantic,
        ...(isRegex && { isRegex: true }),
        ...(isBoolean && { isBoolean: true }),
      }

      console.time('⏱️ Search Duration')
      
      // Get both formatted results and raw response
      const [searchResults, rawResp] = await Promise.all([
        searchWord(query, options, 50),
        searchRaw(query, options, 50)
      ])
      
      const executionTime = performance.now() - startTime
      console.timeEnd('⏱️ Search Duration')

      console.log(`✅ Found ${searchResults.length} results`)
      console.log('📦 Raw Response:', rawResp)
      console.log('📊 Pagination:', rawResp.pagination)
      console.log('🔢 Counts:', rawResp.counts)
      
      if (searchResults.length > 0) {
        const matchTypeCounts = searchResults.reduce((acc, r) => {
          acc[r.matchType] = (acc[r.matchType] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        console.log('📊 Match Type Distribution:', matchTypeCounts)
        
        const avgScore = searchResults.reduce((sum, r) => sum + r.matchScore, 0) / searchResults.length
        console.log('📈 Average Score:', avgScore.toFixed(2))
        
        console.log('🔝 Top 3 Results:', searchResults.slice(0, 3).map(r => ({
          verse: r.verse_key,
          type: r.matchType,
          score: r.matchScore,
          tokens: r.matchedTokens
        })))
        
        console.log('📄 First Result (Full):', rawResp.results[0])
      }

      console.groupEnd()

      setResults(searchResults)
      setRawResponse(rawResp)
      setDuration(executionTime)
      setCurrentType('search')
      setNormalizationResult(null)
      setSelectedResult(null)

      // Add to logs
      const logEntry: LogEntry = {
        timestamp: Date.now(),
        type: 'search',
        input: query,
        output: searchResults,
        duration: executionTime,
        details: {
          options,
          count: searchResults.length,
          matchTypes: searchResults.reduce((acc, r) => {
            acc[r.matchType] = (acc[r.matchType] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          pagination: rawResp.pagination,
          counts: rawResp.counts
        }
      }
      setLogs(prev => [logEntry, ...prev].slice(0, 20))

    } catch (error) {
      console.error('❌ Search failed:', error)
      console.groupEnd()
      setResults([])
      setRawResponse(null)
    } finally {
      setLoading(false)
    }
  }

  const handleNormalization = (method: 'removeTashkeel' | 'normalizeArabic' | 'compare') => {
    if (!query.trim()) return

    const startTime = performance.now()

    console.group(`🔧 Normalization: ${method}`)
    console.log('Input:', query)

    let result: any

    if (method === 'removeTashkeel') {
      result = removeTashkeel(query)
      console.log('Output (removeTashkeel):', result)
      console.log('Removed:', 'Tashkeel (diacritics)')
    } else if (method === 'normalizeArabic') {
      result = normalizeArabic(query)
      console.log('Output (normalizeArabic):', result)
      console.log('Normalized:', 'Alef variants, removed tashkeel, etc.')
    } else if (method === 'compare') {
      const withoutTashkeel = removeTashkeel(query)
      const normalized = normalizeArabic(query)
      result = {
        original: query,
        removeTashkeel: withoutTashkeel,
        normalizeArabic: normalized,
        comparison: {
          originalLength: query.length,
          removeTashkeelLength: withoutTashkeel.length,
          normalizedLength: normalized.length,
          tashkeelRemoved: query.length - withoutTashkeel.length,
          totalChanges: query.length - normalized.length
        }
      }
      console.log('Original:', query)
      console.log('After removeTashkeel:', withoutTashkeel)
      console.log('After normalizeArabic:', normalized)
      console.log('Comparison:', result.comparison)
    }

    const executionTime = performance.now() - startTime
    console.log(`⏱️ Duration: ${executionTime.toFixed(3)}ms`)
    console.groupEnd()

    setNormalizationResult(result)
    setCurrentType('normalization')
    setResults([])
    setDuration(executionTime)

    // Add to logs
    const logEntry: LogEntry = {
      timestamp: Date.now(),
      type: 'normalization',
      input: query,
      output: result,
      duration: executionTime,
      details: { method }
    }
    setLogs(prev => [logEntry, ...prev].slice(0, 20))
  }

  const loadExample = (example: typeof EXAMPLES[0]['items'][0]) => {
    setQuery(example.query)
    setSelectedExample(example.label)
    
    if (example.type === 'normalization') {
      // Handle normalization examples
      setTimeout(() => {
        handleNormalization(example.method!)
      }, 100)
    } else {
      // Handle search examples
      // Reset all options
      setLemma(false)
      setRoot(false)
      setFuzzy(false)
      setSemantic(false)
      setIsRegex(false)
      setIsBoolean(false)
      
      // Apply example options
      if ('lemma' in example.options && example.options.lemma) setLemma(true)
      if ('root' in example.options && example.options.root) setRoot(true)
      if ('fuzzy' in example.options && example.options.fuzzy) setFuzzy(true)
      if ('semantic' in example.options && example.options.semantic) setSemantic(true)
      if ('isRegex' in example.options && example.options.isRegex) setIsRegex(true)
      if ('isBoolean' in example.options && example.options.isBoolean) setIsBoolean(true)
      
      // Auto-search after a brief delay
      setTimeout(() => {
        handleSearch()
      }, 100)
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const matchTypeCounts = results.reduce((acc, r) => {
    acc[r.matchType] = (acc[r.matchType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const avgScore = results.length > 0
    ? (results.reduce((sum, r) => sum + r.matchScore, 0) / results.length).toFixed(2)
    : '0'

  return (
    <div className="debug-overlay" onClick={onClose}>
      <div className="debug-console" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="debug-console-header">
          <div className="debug-title">
            <Settings className="debug-icon" size={20} />
            <span>Debug Console</span>
            {dataStatus && (
              <span className={`data-status ${dataStatus.loaded ? 'loaded' : dataStatus.loading ? 'loading' : 'not-loaded'}`}>
                {dataStatus.loaded ? (
                  <>
                    <CheckCircle size={14} />
                    <span>Data Loaded</span>
                  </>
                ) : dataStatus.loading ? (
                  <>
                    <Loader2 size={14} className="spinning" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>Not Loaded</span>
                  </>
                )}
              </span>
            )}
          </div>
          <button className="debug-close" onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className="debug-console-content">
          {/* Left: Examples */}
          <aside className="debug-examples">
            <h3>Examples</h3>
            <div className="examples-list">
              {EXAMPLES.map((category) => (
                <div key={category.category} className="example-category">
                  <div className="category-title">{category.category}</div>
                  {category.items.map((item) => (
                    <button
                      key={item.label}
                      className={`example-item ${selectedExample === item.label ? 'active' : ''}`}
                      onClick={() => loadExample(item)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </aside>

          {/* Center: Search & Results */}
          <main className="debug-main">
            {/* Search Bar */}
            <div className="debug-search-bar">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && currentType === 'search' && handleSearch()}
                placeholder={currentType === 'search' ? 'Enter search query...' : 'Enter Arabic text to normalize...'}
                className="debug-search-input"
              />
              {currentType === 'search' ? (
                <button 
                  className="debug-search-btn"
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  title="Search"
                >
                  {loading ? <Loader2 size={20} className="spinning" /> : <Search size={20} />}
                </button>
              ) : (
                <div className="debug-norm-buttons">
                  <button 
                    className="debug-norm-btn"
                    onClick={() => handleNormalization('removeTashkeel')}
                    disabled={!query.trim()}
                    title="Remove Tashkeel"
                  >
                    Remove Tashkeel
                  </button>
                  <button 
                    className="debug-norm-btn"
                    onClick={() => handleNormalization('normalizeArabic')}
                    disabled={!query.trim()}
                    title="Normalize Arabic"
                  >
                    Normalize
                  </button>
                  <button 
                    className="debug-norm-btn"
                    onClick={() => handleNormalization('compare')}
                    disabled={!query.trim()}
                    title="Compare Both"
                  >
                    Compare
                  </button>
                </div>
              )}
            </div>

            {/* Mode Toggle */}
            <div className="debug-mode-toggle">
              <button
                className={`mode-btn ${currentType === 'search' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentType('search')
                  setNormalizationResult(null)
                }}
              >
                <Search size={16} />
                <span>Search Mode</span>
              </button>
              <button
                className={`mode-btn ${currentType === 'normalization' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentType('normalization')
                  setResults([])
                }}
              >
                <Settings size={16} />
                <span>Normalization Mode</span>
              </button>
            </div>

            {/* Mode Hint */}
            {currentType === 'normalization' && (
              <div className="mode-hint">
                Type Arabic text and click a button to see how it's normalized
              </div>
            )}

            {/* Options - Only show for search */}
            {currentType === 'search' && (
              <div className="debug-options">
                <label className="option-chip">
                  <input type="checkbox" checked={lemma} onChange={(e) => setLemma(e.target.checked)} />
                  <span>Lemma</span>
                </label>
                <label className="option-chip">
                  <input type="checkbox" checked={root} onChange={(e) => setRoot(e.target.checked)} />
                  <span>Root</span>
                </label>
                <label className="option-chip">
                  <input type="checkbox" checked={fuzzy} onChange={(e) => setFuzzy(e.target.checked)} />
                  <span>Fuzzy</span>
                </label>
                <label className="option-chip">
                  <input type="checkbox" checked={semantic} onChange={(e) => setSemantic(e.target.checked)} />
                  <span>Semantic</span>
                </label>
                <label className="option-chip">
                  <input type="checkbox" checked={isRegex} onChange={(e) => setIsRegex(e.target.checked)} />
                  <span>Regex</span>
                </label>
                <label className="option-chip">
                  <input type="checkbox" checked={isBoolean} onChange={(e) => setIsBoolean(e.target.checked)} />
                  <span>Boolean</span>
                </label>
              </div>
            )}

            {/* Normalization Result */}
            {currentType === 'normalization' && normalizationResult && (
              <div className="normalization-result">
                {typeof normalizationResult === 'string' ? (
                  <div className="norm-simple">
                    <div className="norm-label">Result:</div>
                    <div className="norm-value" dir="rtl">{normalizationResult}</div>
                    <div className="norm-meta">
                      Length: {normalizationResult.length} characters
                    </div>
                  </div>
                ) : (
                  <div className="norm-comparison">
                    <div className="norm-row">
                      <div className="norm-label">Original:</div>
                      <div className="norm-value" dir="rtl">{normalizationResult.original}</div>
                      <div className="norm-meta">{normalizationResult.comparison.originalLength} chars</div>
                    </div>
                    <div className="norm-row">
                      <div className="norm-label">removeTashkeel:</div>
                      <div className="norm-value" dir="rtl">{normalizationResult.removeTashkeel}</div>
                      <div className="norm-meta">{normalizationResult.comparison.removeTashkeelLength} chars (-{normalizationResult.comparison.tashkeelRemoved})</div>
                    </div>
                    <div className="norm-row">
                      <div className="norm-label">normalizeArabic:</div>
                      <div className="norm-value" dir="rtl">{normalizationResult.normalizeArabic}</div>
                      <div className="norm-meta">{normalizationResult.comparison.normalizedLength} chars (-{normalizationResult.comparison.totalChanges})</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stats - Only show for search */}
            {currentType === 'search' && results.length > 0 && (
              <div className="debug-stats">
                <div className="stat-item">
                  <span className="stat-label">Results</span>
                  <span className="stat-value">{results.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Score</span>
                  <span className="stat-value">{avgScore}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Duration</span>
                  <span className="stat-value">{duration.toFixed(0)}ms</span>
                </div>
                {Object.entries(matchTypeCounts).map(([type, count]) => (
                  <div key={type} className="stat-item">
                    <span className={`stat-badge stat-${type}`}>{type}</span>
                    <span className="stat-value">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Response Details - Show when available */}
            {currentType === 'search' && rawResponse && (
              <details className="response-details">
                <summary>📦 Raw Response Details</summary>
                <div className="response-content">
                  <div className="response-section">
                    <strong>Pagination:</strong>
                    <pre>{JSON.stringify(rawResponse.pagination, null, 2)}</pre>
                  </div>
                  <div className="response-section">
                    <strong>Counts:</strong>
                    <pre>{JSON.stringify(rawResponse.counts, null, 2)}</pre>
                  </div>
                  {selectedResult && (
                    <div className="response-section">
                      <strong>Selected Result (Full Data):</strong>
                      <pre>{JSON.stringify(selectedResult, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Results - Only show for search */}
            {currentType === 'search' && (
              <div className="debug-results">
                {loading && <div className="debug-loading">Searching...</div>}
                {!loading && results.length === 0 && query && (
                  <div className="debug-empty">No results found</div>
                )}
                {!loading && results.map((result, idx) => (
                  <div 
                    key={`${result.verse_key}-${idx}`} 
                    className={`result-card ${selectedResult?.verse_key === result.verse_key ? 'selected' : ''}`}
                    onClick={() => {
                      const fullResult = rawResponse?.results[idx]
                      setSelectedResult(fullResult)
                      console.log('📄 Selected Result (Full):', fullResult)
                    }}
                  >
                    <div className="result-meta">
                      <span className="result-verse">{result.verse_key}</span>
                      <span className={`result-badge badge-${result.matchType}`}>
                        {result.matchType}
                      </span>
                      <span className="result-score">{result.matchScore}</span>
                    </div>
                    <div className="result-text" dir="rtl">
                      <HighlightedText
                        text={result.text}
                        matchedTokens={result.matchedTokens}
                        tokenTypes={result.tokenTypes}
                      />
                    </div>
                    {result.matchedTokens.length > 0 && (
                      <div className="result-tokens">
                        Matched: {result.matchedTokens.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* Right: Logs */}
          <aside className="debug-logs">
            <h3>Execution Logs</h3>
            
            {/* Data Status */}
            {dataStatus && (
              <details className="data-status-details" open>
                <summary>
                  <Database size={16} />
                  <span>Data Loading Status</span>
                </summary>
                <div className="data-status-content">
                  {/* QuranData */}
                  <div className="method-status">
                    <div className="method-header">
                      {dataStatus.methods.quranData.loaded ? (
                        <CheckCircle size={14} className="status-icon loaded" />
                      ) : (
                        <XCircle size={14} className="status-icon not-loaded" />
                      )}
                      <span className="method-name">{dataStatus.methods.quranData.name}</span>
                    </div>
                    {dataStatus.methods.quranData.loaded && (
                      <div className="method-details">
                        <span className="detail-label">Verses:</span>
                        <span className="detail-value">{dataStatus.methods.quranData.count.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Morphology */}
                  <div className="method-status">
                    <div className="method-header">
                      {dataStatus.methods.morphology.loaded ? (
                        <CheckCircle size={14} className="status-icon loaded" />
                      ) : (
                        <XCircle size={14} className="status-icon not-loaded" />
                      )}
                      <span className="method-name">{dataStatus.methods.morphology.name}</span>
                    </div>
                    {dataStatus.methods.morphology.loaded && (
                      <div className="method-details">
                        <span className="detail-label">Entries:</span>
                        <span className="detail-value">{dataStatus.methods.morphology.count.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* WordMap */}
                  <div className="method-status">
                    <div className="method-header">
                      {dataStatus.methods.wordMap.loaded ? (
                        <CheckCircle size={14} className="status-icon loaded" />
                      ) : (
                        <XCircle size={14} className="status-icon not-loaded" />
                      )}
                      <span className="method-name">{dataStatus.methods.wordMap.name}</span>
                    </div>
                    {dataStatus.methods.wordMap.loaded && (
                      <div className="method-details">
                        <span className="detail-label">Mappings:</span>
                        <span className="detail-value">{dataStatus.methods.wordMap.count.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* SemanticMap */}
                  <div className="method-status">
                    <div className="method-header">
                      {dataStatus.methods.semanticMap.loaded ? (
                        <CheckCircle size={14} className="status-icon loaded" />
                      ) : (
                        <XCircle size={14} className="status-icon not-loaded" />
                      )}
                      <span className="method-name">{dataStatus.methods.semanticMap.name}</span>
                    </div>
                    {dataStatus.methods.semanticMap.loaded && (
                      <div className="method-details">
                        <span className="detail-label">Mappings:</span>
                        <span className="detail-value">{dataStatus.methods.semanticMap.count.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* InvertedIndex */}
                  <div className="method-status">
                    <div className="method-header">
                      {dataStatus.methods.invertedIndex.loaded ? (
                        <CheckCircle size={14} className="status-icon loaded" />
                      ) : (
                        <XCircle size={14} className="status-icon not-loaded" />
                      )}
                      <span className="method-name">{dataStatus.methods.invertedIndex.name}</span>
                    </div>
                    {dataStatus.methods.invertedIndex.loaded && dataStatus.methods.invertedIndex.stats && (
                      <div className="method-details">
                        <div className="detail-row">
                          <span className="detail-label">Lemma Keys:</span>
                          <span className="detail-value">{dataStatus.methods.invertedIndex.stats.lemmaKeys.toLocaleString()}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Root Keys:</span>
                          <span className="detail-value">{dataStatus.methods.invertedIndex.stats.rootKeys.toLocaleString()}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Word Keys:</span>
                          <span className="detail-value">{dataStatus.methods.invertedIndex.stats.wordKeys.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            )}
            
            <div className="logs-list">
              {logs.map((log, idx) => (
                <details key={idx} className="log-entry">
                  <summary>
                    <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="log-type">{log.type}</span>
                    <span className="log-duration">{log.duration.toFixed(2)}ms</span>
                  </summary>
                  <div className="log-details">
                    <div className="log-section">
                      <strong>Input:</strong>
                      <pre>{log.input}</pre>
                    </div>
                    {log.type === 'search' && (
                      <>
                        <div className="log-section">
                          <strong>Options:</strong>
                          <pre>{JSON.stringify(log.details.options, null, 2)}</pre>
                        </div>
                        <div className="log-section">
                          <strong>Results:</strong> {log.details.count}
                        </div>
                        <div className="log-section">
                          <strong>Match Types:</strong>
                          <pre>{JSON.stringify(log.details.matchTypes, null, 2)}</pre>
                        </div>
                      </>
                    )}
                    {log.type === 'normalization' && (
                      <>
                        <div className="log-section">
                          <strong>Method:</strong> {log.details.method}
                        </div>
                        <div className="log-section">
                          <strong>Output:</strong>
                          <pre>{typeof log.output === 'string' ? log.output : JSON.stringify(log.output, null, 2)}</pre>
                        </div>
                      </>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function HighlightedText({
  text,
  matchedTokens,
  tokenTypes,
}: {
  text: string
  matchedTokens: string[]
  tokenTypes?: Record<string, string>
}) {
  const ranges = getHighlightRanges(text, matchedTokens, tokenTypes as any)
  
  if (ranges.length === 0) return <span>{text}</span>

  const parts: React.ReactNode[] = []
  let cursor = 0

  ranges.forEach((r, i) => {
    if (cursor < r.start) parts.push(text.slice(cursor, r.start))
    parts.push(
      <mark key={`${r.start}-${r.end}-${i}`} className={`hl-${r.matchType}`}>
        {text.slice(r.start, r.end)}
      </mark>
    )
    cursor = r.end
  })

  if (cursor < text.length) parts.push(text.slice(cursor))

  return <span>{parts}</span>
}
