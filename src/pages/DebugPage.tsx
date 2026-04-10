import { useState, useEffect } from 'react'
import { searchWord } from '../services/quranSearch'
import { getHighlightRanges } from '../services/quranSearch'
import DevModeToggle from '../components/DevModeToggle'
import type { SearchOptions, SearchResult } from '../types/quran'
import './DebugPage.css'

interface SearchLog {
  timestamp: string
  query: string
  options: SearchOptions
  pagination: { page: number; limit: number }
  results: SearchResult[]
  duration: number
  error?: string
}

interface SearchExample {
  label: string
  query: string
  description: string
  options: Partial<SearchOptions & { isRegex?: boolean; isBoolean?: boolean }>
}

const SEARCH_EXAMPLES: Record<string, SearchExample[]> = {
  'Basic': [
    {
      label: 'Simple Word',
      query: 'الله',
      description: 'Search for a single Arabic word. Finds exact matches in normalized text.',
      options: { lemma: false, root: false, fuzzy: false, semantic: false }
    },
    {
      label: 'Multi-Word',
      query: 'الله الرحمن',
      description: 'All words must appear (implicit AND logic).',
      options: { lemma: false, root: false, fuzzy: false, semantic: false }
    },
  ],
  'Linguistic': [
    {
      label: 'Lemma',
      query: 'الرحمن',
      description: 'Match morphological lemmas. Finds word variations.',
      options: { lemma: true, root: false, fuzzy: false, semantic: false }
    },
    {
      label: 'Root',
      query: 'الله',
      description: 'Match Arabic trilateral roots.',
      options: { lemma: false, root: true, fuzzy: false, semantic: false }
    },
    {
      label: 'Lemma + Root',
      query: 'الله الرحمن',
      description: 'Comprehensive linguistic search.',
      options: { lemma: true, root: true, fuzzy: false, semantic: false }
    },
  ],
  'Range': [
    {
      label: 'Single Verse',
      query: '2:255',
      description: 'Ayat al-Kursi',
      options: { lemma: false, root: false, fuzzy: false, semantic: false }
    },
    {
      label: 'Verse Range',
      query: '1:1-7',
      description: 'All of Al-Fatihah',
      options: { lemma: false, root: false, fuzzy: false, semantic: false }
    },
    {
      label: 'Entire Sura',
      query: '1:',
      description: 'Retrieve all verses from a sura (Al-Fatihah).',
      options: { lemma: false, root: false, fuzzy: false, semantic: false }
    },
  ],
  'Regex Search': [
    {
      label: 'Ends With Pattern',
      query: '^.*ون$',
      description: 'Find verses ending with "ون" using regex patterns.',
      options: { lemma: false, root: false, fuzzy: false, semantic: false, isRegex: true }
    },
    {
      label: 'Contains Pattern',
      query: 'الله.*الرحمن',
      description: 'Find "الله" followed by "الرحمن" with any text in between.',
      options: { lemma: false, root: false, fuzzy: false, semantic: false, isRegex: true }
    },
  ],
  'Boolean Search': [
    {
      label: 'AND Operator',
      query: 'الله AND الرحمن',
      description: 'Both terms must appear in the verse.',
      options: { lemma: false, root: false, fuzzy: false, semantic: false, isBoolean: true }
    },
    {
      label: 'OR Operator',
      query: 'الرحمن OR الرحيم',
      description: 'Either term can appear in the verse.',
      options: { lemma: false, root: false, fuzzy: false, semantic: false, isBoolean: true }
    },
    {
      label: 'NOT Operator',
      query: 'الله NOT الرحمن',
      description: 'First term must appear, second term must not.',
      options: { lemma: false, root: false, fuzzy: false, semantic: false, isBoolean: true }
    },
    {
      label: 'Complex Logic',
      query: 'الله AND (الرحمن OR الرحيم)',
      description: 'Combine operators with parentheses for complex queries.',
      options: { lemma: false, root: false, fuzzy: false, semantic: false, isBoolean: true }
    },
  ],
  'Semantic Search': [
    {
      label: 'Concept Search',
      query: 'إنسان',
      description: 'Find verses with related concepts (بشر, ناس, بني آدم, etc.).',
      options: { lemma: false, root: false, fuzzy: false, semantic: true }
    },
  ],
  'Fuzzy Search': [
    {
      label: 'Fuzzy Fallback',
      query: 'الله',
      description: 'When no exact/lemma/root matches found, use approximate matching as fallback.',
      options: { lemma: false, root: false, fuzzy: true, semantic: false }
    },
  ],
}

export default function DebugPage() {
  const [query, setQuery] = useState('الله الرحمن')
  const [limit, setLimit] = useState(20)
  
  // Search options
  const [lemma, setLemma] = useState(true)
  const [root, setRoot] = useState(true)
  const [fuzzy, setFuzzy] = useState(true)
  const [semantic, setSemantic] = useState(false)
  const [isRegex, setIsRegex] = useState(false)
  const [isBoolean, setIsBoolean] = useState(false)
  
  // Results
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([])
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  
  // UI state
  const [showHelp, setShowHelp] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('Basic Search')
  const [showExamples, setShowExamples] = useState(true)

  const handleSearch = async () => {
    if (!query.trim()) return

    const startTime = performance.now()
    setLoading(true)
    
    const options: SearchOptions & { isRegex?: boolean; isBoolean?: boolean } = {
      lemma,
      root,
      fuzzy,
      semantic,
      ...(isRegex && { isRegex: true }),
      ...(isBoolean && { isBoolean: true }),
    }

    console.group(`🔍 Search: "${query}"`)
    console.log('Options:', options)
    console.log('Limit:', limit)
    console.time('Search Duration')

    try {
      const searchResults = await searchWord(query, options, limit)
      const duration = performance.now() - startTime

      console.log(`✅ Found ${searchResults.length} results in ${duration.toFixed(2)}ms`)
      console.log('Top 3 Results:', searchResults.slice(0, 3))
      console.timeEnd('Search Duration')
      console.groupEnd()

      setResults(searchResults)
      
      // Add to logs
      const log: SearchLog = {
        timestamp: new Date().toISOString(),
        query,
        options,
        pagination: { page: 1, limit },
        results: searchResults,
        duration,
      }
      setSearchLogs(prev => [log, ...prev].slice(0, 10)) // Keep last 10 searches
    } catch (error) {
      const duration = performance.now() - startTime
      console.error('❌ Search failed:', error)
      console.timeEnd('Search Duration')
      console.groupEnd()

      const log: SearchLog = {
        timestamp: new Date().toISOString(),
        query,
        options,
        pagination: { page: 1, limit },
        results: [],
        duration,
        error: error instanceof Error ? error.message : String(error),
      }
      setSearchLogs(prev => [log, ...prev].slice(0, 10))
    } finally {
      setLoading(false)
    }
  }

  const loadExample = (example: SearchExample) => {
    setQuery(example.query)
    setLemma(example.options.lemma ?? false)
    setRoot(example.options.root ?? false)
    setFuzzy(example.options.fuzzy ?? false)
    setSemantic(example.options.semantic ?? false)
    setIsRegex(example.options.isRegex ?? false)
    setIsBoolean(example.options.isBoolean ?? false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        document.querySelector('textarea')?.focus()
      }
      // Ctrl/Cmd + Enter to search
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSearch()
      }
    }
    
    window.addEventListener('keydown', handleGlobalKeyPress)
    return () => window.removeEventListener('keydown', handleGlobalKeyPress)
  }, [query, lemma, root, fuzzy, semantic, isRegex, isBoolean, limit])

  const clearLogs = () => {
    setSearchLogs([])
    console.clear()
  }

  const exportLogs = () => {
    const dataStr = JSON.stringify(searchLogs, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `search-logs-${new Date().toISOString()}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  return (
    <div className="debug-page">
      <div className="debug-layout">
        {/* Left Panel: Search Controls */}
        <aside className="debug-controls">
          <div className="controls-header">
            <h2>🔧 Debug Console</h2>
            <button 
              className="help-button" 
              onClick={() => setShowHelp(true)}
              title="Show help"
            >
              ❓
            </button>
          </div>
          <section className="control-section">
            <h2>Search Query</h2>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter Arabic text, range (2:255), or regex pattern..."
              rows={3}
            />
          </section>

          <section className="control-section">
            <h2>Search Options</h2>
            <label>
              <input type="checkbox" checked={lemma} onChange={(e) => setLemma(e.target.checked)} />
              Lemma Search (+2 score)
            </label>
            <label>
              <input type="checkbox" checked={root} onChange={(e) => setRoot(e.target.checked)} />
              Root Search (+1 score)
            </label>
            <label>
              <input type="checkbox" checked={fuzzy} onChange={(e) => setFuzzy(e.target.checked)} />
              Fuzzy Fallback (+0.5 score)
            </label>
            <label>
              <input type="checkbox" checked={semantic} onChange={(e) => setSemantic(e.target.checked)} />
              Semantic Search (+0.8 score)
            </label>
          </section>

          <section className="control-section">
            <h2>Advanced Modes</h2>
            <label>
              <input type="checkbox" checked={isRegex} onChange={(e) => setIsRegex(e.target.checked)} />
              Regex Mode
            </label>
            <label>
              <input type="checkbox" checked={isBoolean} onChange={(e) => setIsBoolean(e.target.checked)} />
              Boolean Mode (AND/OR/NOT)
            </label>
          </section>

          <section className="control-section">
            <h2>Pagination</h2>
            <label>
              Results Limit:
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                min={1}
                max={200}
              />
            </label>
          </section>

          <button
            className="search-button"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? '⏳ Searching...' : '🔍 Search'}
          </button>

          <section className="control-section">
            <h2>Quick Tests</h2>
            <button onClick={() => setQuery('الله')}>Simple: الله</button>
            <button onClick={() => setQuery('الله الرحمن')}>Multi-word</button>
            <button onClick={() => setQuery('2:255')}>Range: 2:255</button>
            <button onClick={() => setQuery('1:1-7')}>Range: 1:1-7</button>
            <button onClick={() => { setQuery('^.*ون$'); setIsRegex(true) }}>Regex: ends with ون</button>
            <button onClick={() => { setQuery('الله AND الرحمن'); setIsBoolean(true) }}>Boolean: AND</button>
          </section>

          <section className="control-section info-section">
            <h2>Score Reference</h2>
            <div className="score-info">
              <div>Exact: +3</div>
              <div>Lemma: +2</div>
              <div>Root: +1</div>
              <div>Semantic: +0.8</div>
              <div>Fuzzy: +0.5</div>
            </div>
          </section>
        </aside>

        {/* Center Panel: Results */}
        <main className="debug-results">
          <div className="results-header">
            <h2>Search Results ({results.length})</h2>
            {results.length > 0 && (
              <div className="results-stats">
                <span>Avg Score: {(results.reduce((sum, r) => sum + r.matchScore, 0) / results.length).toFixed(2)}</span>
                <span>Types: {[...new Set(results.map(r => r.matchType))].join(', ')}</span>
              </div>
            )}
          </div>

          <div className="results-list">
            {loading && <div className="loading">Searching...</div>}
            {!loading && results.length === 0 && query && <div className="no-results">No results found</div>}
            {results.map((result, idx) => (
              <div
                key={`${result.verse_key}-${idx}`}
                className={`result-item ${selectedResult === result ? 'selected' : ''}`}
                onClick={() => setSelectedResult(result)}
              >
                <div className="result-header">
                  <span className="verse-key">{result.verse_key}</span>
                  <span className={`match-type match-${result.matchType}`}>{result.matchType}</span>
                  <span className="match-score">Score: {result.matchScore}</span>
                </div>
                <div className="result-text" dir="rtl">
                  <HighlightedText
                    text={result.text}
                    matchedTokens={result.matchedTokens}
                    tokenTypes={result.tokenTypes}
                  />
                </div>
                {result.matchedTokens.length > 0 && (
                  <div className="matched-tokens">
                    Matched: {result.matchedTokens.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>

        {/* Right Panel: Logs & Details */}
        <aside className="debug-logs">
          <div className="logs-header">
            <h2>Search Logs</h2>
            <div className="logs-actions">
              <button onClick={clearLogs} title="Clear logs">🗑️</button>
              <button onClick={exportLogs} title="Export logs">💾</button>
            </div>
          </div>

          {selectedResult && (
            <section className="detail-section">
              <h3>Selected Result Details</h3>
              <pre>{JSON.stringify(selectedResult, null, 2)}</pre>
            </section>
          )}

          <div className="logs-list">
            {searchLogs.map((log, idx) => (
              <details key={idx} className="log-entry">
                <summary>
                  <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="log-query">"{log.query}"</span>
                  <span className="log-duration">{log.duration.toFixed(2)}ms</span>
                  {log.error && <span className="log-error">❌</span>}
                </summary>
                <div className="log-details">
                  <div><strong>Options:</strong></div>
                  <pre>{JSON.stringify(log.options, null, 2)}</pre>
                  <div><strong>Results:</strong> {log.results.length}</div>
                  {log.error && (
                    <>
                      <div><strong>Error:</strong></div>
                      <pre className="error-text">{log.error}</pre>
                    </>
                  )}
                  {log.results.length > 0 && (
                    <>
                      <div><strong>Match Types:</strong></div>
                      <pre>{JSON.stringify(
                        log.results.reduce((acc, r) => {
                          acc[r.matchType] = (acc[r.matchType] || 0) + 1
                          return acc
                        }, {} as Record<string, number>),
                        null,
                        2
                      )}</pre>
                    </>
                  )}
                </div>
              </details>
            ))}
          </div>
        </aside>
      </div>
      
      {/* Help Dialog */}
      {showHelp && (
        <div className="dialog-overlay" onClick={() => setShowHelp(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>🔧 Quran Search Engine Debug Console</h2>
              <button className="dialog-close" onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className="dialog-body">
              <p>Test and debug quran-search-engine methods with detailed logging</p>
              
              <section>
                <h3>💡 Tips</h3>
                <ul>
                  <li>Open browser DevTools console (F12) for detailed execution logs</li>
                  <li>See DEBUG_MODE.md for full documentation</li>
                  <li>Use quick test buttons for common queries</li>
                </ul>
              </section>

              <section>
                <h3>⌨️ Keyboard Shortcuts</h3>
                <ul>
                  <li><kbd>Enter</kbd> - Execute search</li>
                  <li><kbd>Shift+Enter</kbd> - New line in query</li>
                  <li><kbd>Ctrl/Cmd+K</kbd> - Focus search input</li>
                  <li><kbd>Ctrl/Cmd+Enter</kbd> - Execute search from anywhere</li>
                </ul>
              </section>

              <section>
                <h3>🎨 Match Type Colors</h3>
                <ul>
                  <li><span className="color-badge match-exact">Exact</span> - Direct text match (+3 score)</li>
                  <li><span className="color-badge match-lemma">Lemma</span> - Morphological match (+2 score)</li>
                  <li><span className="color-badge match-root">Root</span> - Arabic root match (+1 score)</li>
                  <li><span className="color-badge match-semantic">Semantic</span> - Concept match (+0.8 score)</li>
                  <li><span className="color-badge match-fuzzy">Fuzzy</span> - Approximate match (+0.5 score)</li>
                </ul>
              </section>

              <section>
                <h3>📖 Query Examples</h3>
                <ul>
                  <li><code>الله</code> - Simple word search</li>
                  <li><code>الله الرحمن</code> - Multi-word (AND logic)</li>
                  <li><code>2:255</code> - Single verse (Ayat al-Kursi)</li>
                  <li><code>1:1-7</code> - Verse range (Al-Fatihah)</li>
                  <li><code>2:</code> - Full sura (Al-Baqarah)</li>
                  <li><code>^.*ون$</code> - Regex (verses ending with ون)</li>
                  <li><code>الله AND الرحمن</code> - Boolean logic</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
      
      <DevModeToggle />
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
      <mark key={`${r.start}-${r.end}-${i}`} className={`highlight-${r.matchType}`}>
        {text.slice(r.start, r.end)}
      </mark>
    )
    cursor = r.end
  })

  if (cursor < text.length) parts.push(text.slice(cursor))

  return <span>{parts}</span>
}
