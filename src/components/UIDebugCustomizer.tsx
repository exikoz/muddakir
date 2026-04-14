import { useState, useRef, useEffect } from 'react'
import { Sliders, X, ChevronDown, ChevronRight } from 'lucide-react'

interface UIDebugCustomizerProps {
  onClose: () => void
}

interface CustomStyles {
  nodeBorderColor: string
  nodeBorderRadius: number
  nodeActiveRingColor: string
  exactEdgeColor: string
  lemmaEdgeColor: string
  rootEdgeColor: string
  fuzzyEdgeColor: string
  semanticEdgeColor: string
  searchEdgeWidth: number
  prevEdgeColor: string
  prevEdgeDash: 'solid' | 'dashed' | 'dotted'
  nextEdgeColor: string
  nextEdgeDash: 'solid' | 'dashed' | 'dotted'
}

const DEFAULT_STYLES: CustomStyles = {
  nodeBorderColor: '#f1f5f9',
  nodeBorderRadius: 24,
  nodeActiveRingColor: '#3b82f6',
  exactEdgeColor: '#10b981',
  lemmaEdgeColor: '#3b82f6',
  rootEdgeColor: '#8b5cf6',
  fuzzyEdgeColor: '#f59e0b',
  semanticEdgeColor: '#06b6d4',
  searchEdgeWidth: 2,
  prevEdgeColor: '#14b8a6',
  prevEdgeDash: 'dashed',
  nextEdgeColor: '#a855f7',
  nextEdgeDash: 'dashed',
}

export default function UIDebugCustomizer({ onClose }: UIDebugCustomizerProps) {
  const [styles, setStyles] = useState<CustomStyles>(DEFAULT_STYLES)
  const [position, setPosition] = useState({ x: window.innerWidth - 300, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  
  const panelRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only inject styles if they differ from defaults
    const hasChanges = Object.keys(styles).some(
      key => styles[key as keyof CustomStyles] !== DEFAULT_STYLES[key as keyof CustomStyles]
    )
    
    if (!hasChanges) {
      // Remove style tag if no changes
      const el = document.getElementById('rf-debug-overrides')
      if (el) el.remove()
      return
    }

    const styleId = 'rf-debug-overrides'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement
    
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    const dashPatterns = {
      solid: 'none',
      dashed: '10 5',
      dotted: '2 4',
    }

    styleEl.textContent = `
      .react-flow__node-verse > div {
        border-color: ${styles.nodeBorderColor} !important;
        border-radius: ${styles.nodeBorderRadius}px !important;
      }
      
      .react-flow__node.selected > div,
      .react-flow__node.selected:hover > div {
        box-shadow: 0 0 0 3px ${styles.nodeActiveRingColor} !important;
      }
      
      .react-flow__edge path[data-edge-type="search"][data-match-type="exact"] {
        stroke: ${styles.exactEdgeColor} !important;
        stroke-width: ${styles.searchEdgeWidth}px !important;
      }
      
      .react-flow__edge path[data-edge-type="search"][data-match-type="lemma"] {
        stroke: ${styles.lemmaEdgeColor} !important;
        stroke-width: ${styles.searchEdgeWidth}px !important;
      }
      
      .react-flow__edge path[data-edge-type="search"][data-match-type="root"] {
        stroke: ${styles.rootEdgeColor} !important;
        stroke-width: ${styles.searchEdgeWidth}px !important;
      }
      
      .react-flow__edge path[data-edge-type="search"][data-match-type="fuzzy"] {
        stroke: ${styles.fuzzyEdgeColor} !important;
        stroke-width: ${styles.searchEdgeWidth}px !important;
      }
      
      .react-flow__edge path[data-edge-type="search"][data-match-type="semantic"] {
        stroke: ${styles.semanticEdgeColor} !important;
        stroke-width: ${styles.searchEdgeWidth}px !important;
      }
      
      .react-flow__edge path[data-edge-type="sequential-prev"] {
        stroke: ${styles.prevEdgeColor} !important;
        stroke-dasharray: ${dashPatterns[styles.prevEdgeDash]} !important;
      }
      
      .react-flow__edge path[data-edge-type="sequential-next"] {
        stroke: ${styles.nextEdgeColor} !important;
        stroke-dasharray: ${dashPatterns[styles.nextEdgeDash]} !important;
      }
    `

    return () => {
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [styles])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current || !headerRef.current) return
    if (!headerRef.current.contains(e.target as Node)) return

    const rect = panelRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setIsDragging(true)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const updateStyle = <K extends keyof CustomStyles>(key: K, value: CustomStyles[K]) => {
    setStyles(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div
      ref={panelRef}
      className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[9998]"
      style={{
        width: '264px',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        ref={headerRef}
        className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <Sliders size={16} className="text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">UI Customizer</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 transition-colors"
        >
          <X size={14} className="text-slate-600" />
        </button>
      </div>

      <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
        <Section
          title="Node Appearance"
          expanded={expandedSections.has('node')}
          onToggle={() => toggleSection('node')}
        >
          <Control label="Border Color">
            <input
              type="color"
              value={styles.nodeBorderColor}
              onChange={(e) => updateStyle('nodeBorderColor', e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Control>
          <Control label="Border Radius">
            <input
              type="range"
              min="8"
              max="20"
              value={styles.nodeBorderRadius}
              onChange={(e) => updateStyle('nodeBorderRadius', parseInt(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-slate-500">{styles.nodeBorderRadius}px</span>
          </Control>
          <Control label="Active Ring Color">
            <input
              type="color"
              value={styles.nodeActiveRingColor}
              onChange={(e) => updateStyle('nodeActiveRingColor', e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Control>
        </Section>

        <Section
          title="Search Edges"
          expanded={expandedSections.has('search')}
          onToggle={() => toggleSection('search')}
        >
          <Control label="Exact Match Color">
            <input
              type="color"
              value={styles.exactEdgeColor}
              onChange={(e) => updateStyle('exactEdgeColor', e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Control>
          <Control label="Lemma Match Color">
            <input
              type="color"
              value={styles.lemmaEdgeColor}
              onChange={(e) => updateStyle('lemmaEdgeColor', e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Control>
          <Control label="Root Match Color">
            <input
              type="color"
              value={styles.rootEdgeColor}
              onChange={(e) => updateStyle('rootEdgeColor', e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Control>
          <Control label="Fuzzy Match Color">
            <input
              type="color"
              value={styles.fuzzyEdgeColor}
              onChange={(e) => updateStyle('fuzzyEdgeColor', e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Control>
          <Control label="Semantic Match Color">
            <input
              type="color"
              value={styles.semanticEdgeColor}
              onChange={(e) => updateStyle('semanticEdgeColor', e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Control>
          <Control label="Stroke Width">
            <input
              type="range"
              min="1"
              max="4"
              value={styles.searchEdgeWidth}
              onChange={(e) => updateStyle('searchEdgeWidth', parseInt(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-slate-500">{styles.searchEdgeWidth}px</span>
          </Control>
        </Section>

        <Section
          title="Previous Verse Edges"
          expanded={expandedSections.has('prev')}
          onToggle={() => toggleSection('prev')}
        >
          <Control label="Stroke Color">
            <input
              type="color"
              value={styles.prevEdgeColor}
              onChange={(e) => updateStyle('prevEdgeColor', e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Control>
          <Control label="Dash Style">
            <select
              value={styles.prevEdgeDash}
              onChange={(e) => updateStyle('prevEdgeDash', e.target.value as any)}
              className="w-full px-2 py-1 text-sm border border-slate-200 rounded"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </Control>
        </Section>

        <Section
          title="Next Verse Edges"
          expanded={expandedSections.has('next')}
          onToggle={() => toggleSection('next')}
        >
          <Control label="Stroke Color">
            <input
              type="color"
              value={styles.nextEdgeColor}
              onChange={(e) => updateStyle('nextEdgeColor', e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Control>
          <Control label="Dash Style">
            <select
              value={styles.nextEdgeDash}
              onChange={(e) => updateStyle('nextEdgeDash', e.target.value as any)}
              className="w-full px-2 py-1 text-sm border border-slate-200 rounded"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </Control>
        </Section>
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function Section({ title, expanded, onToggle, children }: SectionProps) {
  return (
    <div className="border-b border-slate-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-medium text-slate-700">{title}</span>
        {expanded ? (
          <ChevronDown size={16} className="text-slate-400" />
        ) : (
          <ChevronRight size={16} className="text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

interface ControlProps {
  label: string
  children: React.ReactNode
}

function Control({ label, children }: ControlProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}
