/**
 * MiniCanvas — the hero's interactive click-to-search canvas.
 * - Wider frame, grid-line background (not dots).
 * - Every word in the seed verse is clickable and has curated results (max 2).
 * - Desktop: results flow to the right. Mobile (<md): results flow vertically below.
 * - Self-contained: no app store, no backend.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { X, ArrowUpRight } from 'lucide-react'

/* ────────────────────────── data ────────────────────────── */

interface DemoWord {
  text: string
  translation: string
}

const SEED_WORDS: DemoWord[] = [
  { text: 'ٱللَّهُ', translation: 'Allah' },
  { text: 'لَآ', translation: 'No' },
  { text: 'إِلَـٰهَ', translation: 'god' },
  { text: 'إِلَّا', translation: 'except' },
  { text: 'هُوَ', translation: 'Him' },
  { text: 'ٱلْحَىُّ', translation: 'the Ever-Living' },
  { text: 'ٱلْقَيُّومُ', translation: 'the Sustainer' },
]

type Result = { key: string; surah: string; text: string }

/** Every word in the seed has up to 2 curated matches. */
const RESULTS_MAP: Record<number, Result[]> = {
  0: [
    { key: '59:22', surah: 'Al-Ḥashr', text: 'هُوَ ٱللَّهُ ٱلَّذِى لَآ إِلَـٰهَ إِلَّا هُوَ' },
    { key: '112:1', surah: 'Al-Ikhlāṣ', text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ' },
  ],
  1: [
    { key: '3:2', surah: 'Āl-ʿImrān', text: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ' },
    { key: '6:102', surah: 'Al-Anʿām', text: 'لَآ إِلَـٰهَ إِلَّا هُوَ خَـٰلِقُ كُلِّ شَىْءٍ' },
  ],
  2: [
    { key: '20:14', surah: 'Ṭā-Hā', text: 'إِنَّنِىٓ أَنَا ٱللَّهُ لَآ إِلَـٰهَ إِلَّآ أَنَا۠' },
    { key: '47:19', surah: 'Muḥammad', text: 'فَٱعْلَمْ أَنَّهُۥ لَآ إِلَـٰهَ إِلَّا ٱللَّهُ' },
  ],
  3: [
    { key: '28:88', surah: 'Al-Qaṣaṣ', text: 'كُلُّ شَىْءٍ هَالِكٌ إِلَّا وَجْهَهُۥ' },
    { key: '2:163', surah: 'Al-Baqarah', text: 'وَإِلَـٰهُكُمْ إِلَـٰهٌ وَاحِدٌ لَّآ إِلَـٰهَ إِلَّا هُوَ' },
  ],
  4: [
    { key: '2:163', surah: 'Al-Baqarah', text: 'وَإِلَـٰهُكُمْ إِلَـٰهٌ وَاحِدٌ لَّآ إِلَـٰهَ إِلَّا هُوَ' },
    { key: '20:98', surah: 'Ṭā-Hā', text: 'إِنَّمَآ إِلَـٰهُكُمُ ٱللَّهُ ٱلَّذِى لَآ إِلَـٰهَ إِلَّا هُوَ' },
  ],
  5: [
    { key: '3:2', surah: 'Āl-ʿImrān', text: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ' },
    { key: '20:111', surah: 'Ṭā-Hā', text: 'وَعَنَتِ ٱلْوُجُوهُ لِلْحَىِّ ٱلْقَيُّومِ' },
  ],
  6: [
    { key: '3:2', surah: 'Āl-ʿImrān', text: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ' },
    { key: '40:65', surah: 'Ghāfir', text: 'هُوَ ٱلْحَىُّ لَآ إِلَـٰهَ إِلَّا هُوَ فَٱدْعُوهُ' },
  ],
}

const SEED_ID = 'seed'
const HINT_WORD_IDX = 5 // ٱلْحَىُّ — the most evocative click
const HANDLE_CLS = '!bg-transparent !border-transparent !w-px !h-px !min-w-0 !min-h-0 !opacity-0'

/* ────────────────────────── nodes ────────────────────────── */

interface SeedData extends Record<string, unknown> {
  words: DemoWord[]
  clickedWordIdx: number | null
  hasClicked: boolean
  onWordClick: (idx: number) => void
}

function SeedNode({ data }: NodeProps) {
  const { words, clickedWordIdx, hasClicked, onWordClick } = data as SeedData
  return (
    <div
      className="min-w-[320px] max-w-[440px] rounded-xl overflow-hidden shadow-sm"
      style={{
        background: 'var(--lp-surface)',
        border: '1px solid var(--lp-hairline-strong)',
      }}
    >
      <Handle id="right-src" type="source" position={Position.Right} className={HANDLE_CLS} />
      <Handle id="bottom-src" type="source" position={Position.Bottom} className={HANDLE_CLS} />

      <div
        className="flex items-center px-4 h-9"
        style={{ borderBottom: '1px solid var(--lp-hairline)' }}
      >
        <span className="text-[10.5px] font-semibold tracking-wide" style={{ color: 'var(--lp-text-dim)' }}>
          Al-Baqarah · 2:255 — Ayat al-Kursi
        </span>
      </div>

      <div className="px-4 py-4 flex flex-wrap gap-1.5 justify-end" dir="rtl">
        {words.map((w, idx) => {
          const isClicked = clickedWordIdx === idx
          const isHint = !hasClicked && idx === HINT_WORD_IDX
          return (
            <button
              key={idx}
              onClick={() => onWordClick(idx)}
              className="lp-font-arabic text-[20px] px-1.5 py-0.5 rounded-md cursor-pointer transition-all duration-150"
              style={
                isClicked
                  ? {
                      background: 'var(--lp-emerald-soft)',
                      color: 'var(--lp-emerald-strong)',
                      boxShadow: '0 0 0 1.5px var(--lp-emerald-border) inset',
                    }
                  : isHint
                    ? {
                        background: 'var(--lp-emerald-soft)',
                        color: 'var(--lp-emerald-strong)',
                        animation: 'lp-hint-pulse 1.8s ease-in-out infinite',
                      }
                    : { color: 'var(--lp-text)' }
              }
              onMouseEnter={e => {
                if (!isClicked && !isHint) {
                  e.currentTarget.style.background = 'var(--lp-emerald-soft)'
                  e.currentTarget.style.color = 'var(--lp-emerald-strong)'
                }
              }}
              onMouseLeave={e => {
                if (!isClicked && !isHint) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--lp-text)'
                }
              }}
              title={w.translation}
            >
              {w.text}
            </button>
          )
        })}
      </div>

      {!hasClicked && (
        <div
          className="px-4 pb-3 text-center text-[11px] font-medium flex items-center justify-center gap-1.5"
          style={{ color: 'var(--lp-emerald)' }}
        >
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--lp-emerald)' }}
          />
          Click any word to search the Quran
        </div>
      )}
    </div>
  )
}

interface ResultData extends Record<string, unknown> {
  verseKey: string
  surah: string
  text: string
  onClose: (id: string) => void
}

function ResultNode({ id, data }: NodeProps) {
  const { verseKey, surah, text, onClose } = data as ResultData
  return (
    <div
      className="min-w-[240px] max-w-[300px] rounded-xl overflow-hidden shadow-sm"
      style={{
        background: 'var(--lp-surface)',
        border: '1px solid var(--lp-hairline-strong)',
      }}
    >
      <Handle id="left-tgt" type="target" position={Position.Left} className={HANDLE_CLS} />
      <Handle id="top-tgt" type="target" position={Position.Top} className={HANDLE_CLS} />

      <div
        className="flex items-center justify-between px-3 h-8"
        style={{ borderBottom: '1px solid var(--lp-hairline)' }}
      >
        <span className="text-[10px] font-semibold tracking-wide" style={{ color: 'var(--lp-text-dim)' }}>
          {surah} · {verseKey}
        </span>
        <button
          onClick={() => onClose(id as string)}
          className="p-0.5 rounded transition-colors"
          style={{ color: 'var(--lp-text-faint)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--lp-rose)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--lp-text-faint)')}
        >
          <X size={11} />
        </button>
      </div>

      <div className="px-3 py-3">
        <p
          className="lp-font-arabic text-[16px] text-right"
          style={{ color: 'var(--lp-text)' }}
          dir="rtl"
        >
          {text}
        </p>
      </div>
    </div>
  )
}

/* ────────────────────────── canvas ────────────────────────── */

const NODE_TYPES = { seed: SeedNode, result: ResultNode }

function useIsNarrow() {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return narrow
}

function MiniCanvasInner() {
  const narrow = useIsNarrow()
  const { fitView } = useReactFlow()
  const [clickedWordIdx, setClickedWordIdx] = useState<number | null>(null)
  const [hasClicked, setHasClicked] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const handleClose = useCallback(
    (nodeId: string) => {
      setNodes(ns => ns.filter(n => n.id !== nodeId))
      setEdges(es => es.filter(e => e.target !== nodeId))
    },
    [setNodes, setEdges],
  )

  const handleWordClick = useCallback(
    (idx: number) => {
      const results = (RESULTS_MAP[idx] ?? []).slice(0, 2)
      if (results.length === 0) return

      // Desktop: seed shifts left, results appear to the right with a clear gap.
      // Narrow: seed on top, results stacked below.
      const newNodes: Node[] = results.map((r, i) => ({
        id: `r-${idx}-${i}`,
        type: 'result',
        position: narrow
          ? { x: 30, y: 260 + i * 150 }
          : { x: 490, y: i === 0 ? 20 : 190 },
        data: { verseKey: r.key, surah: r.surah, text: r.text, onClose: handleClose },
      }))

      const sourceHandle = narrow ? 'bottom-src' : 'right-src'
      const targetHandle = narrow ? 'top-tgt' : 'left-tgt'

      const newEdges: Edge[] = results.map((_, i) => ({
        id: `e-${idx}-${i}`,
        source: SEED_ID,
        sourceHandle,
        target: `r-${idx}-${i}`,
        targetHandle,
        type: 'smoothstep',
        style: {
          stroke: 'var(--lp-emerald)' as unknown as string,
          strokeWidth: 1.6,
          opacity: 0.85,
        },
      }))

      setClickedWordIdx(idx)
      setHasClicked(true)

      // Seed moves to the left to make room for result nodes on the right.
      const seedPos = narrow ? { x: 30, y: 30 } : { x: 20, y: 90 }
      setNodes([
        {
          id: SEED_ID,
          type: 'seed',
          position: seedPos,
          data: { words: SEED_WORDS, clickedWordIdx: idx, hasClicked: true, onWordClick: () => {} },
          draggable: true,
        },
        ...newNodes,
      ])
      setEdges(newEdges)

      // Fit all nodes into view after the state update settles.
      setTimeout(() => fitView({ padding: 0.1, duration: 450, maxZoom: 0.98 }), 60)
    },
    [handleClose, setNodes, setEdges, narrow, fitView],
  )

  const initialNodes = useMemo<Node[]>(
    () => [
      {
        id: SEED_ID,
        type: 'seed',
        position: narrow ? { x: 30, y: 30 } : { x: 40, y: 95 },
        data: { words: SEED_WORDS, clickedWordIdx: null, hasClicked: false, onWordClick: handleWordClick },
        draggable: true,
      },
    ],
    [handleWordClick, narrow],
  )

  const displayNodes = nodes.length === 0 ? initialNodes : nodes

  const finalNodes = useMemo(
    () =>
      displayNodes.map(n =>
        n.id === SEED_ID
          ? { ...n, data: { ...n.data, clickedWordIdx, hasClicked, onWordClick: handleWordClick } }
          : { ...n, data: { ...n.data, onClose: handleClose } },
      ),
    [displayNodes, clickedWordIdx, hasClicked, handleWordClick, handleClose],
  )

  const canvasHeight = narrow ? 560 : 560

  return (
    <div className="relative w-full">
      {/* App window frame */}
      <div
        className="rounded-2xl overflow-hidden shadow-xl"
        style={{
          background: 'var(--lp-surface-2)',
          border: '1px solid var(--lp-hairline-strong)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 20px 60px rgba(15,23,42,0.10)',
        }}
      >
        {/* Window chrome */}
        <div
          className="flex items-center gap-2 px-4 h-9"
          style={{
            background: 'var(--lp-surface)',
            borderBottom: '1px solid var(--lp-hairline)',
          }}
        >
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--lp-hairline-strong)' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--lp-hairline-strong)' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--lp-hairline-strong)' }} />
          </div>
          <span className="ml-3 text-[10.5px] font-medium" style={{ color: 'var(--lp-text-faint)' }}>
            Muddakir — Quran Explorer
          </span>
          {hasClicked && (
            <a
              href="/app"
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold transition-colors"
              style={{ color: 'var(--lp-emerald-strong)' }}
            >
              Continue in full workspace
              <ArrowUpRight size={12} />
            </a>
          )}
        </div>

        {/* ReactFlow canvas with grid lines */}
        <div className="w-full" style={{ height: canvasHeight }}>
          <ReactFlow
            nodes={finalNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.18, maxZoom: 0.95, minZoom: 0.55 }}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            panOnScroll={false}
            preventScrolling={false}
            minZoom={0.55}
            maxZoom={1}
            proOptions={{ hideAttribution: true }}
            style={{ background: 'var(--lp-surface-2)' }}
          >
            <Background
              variant={BackgroundVariant.Lines}
              gap={32}
              lineWidth={1}
              color="var(--lp-hairline)"
            />
          </ReactFlow>
        </div>
      </div>

      <style>{`
        @keyframes lp-hint-pulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--lp-emerald-soft); }
          50% { box-shadow: 0 0 0 5px var(--lp-emerald-soft); }
        }
      `}</style>
    </div>
  )
}

export default function MiniCanvas() {
  return (
    <ReactFlowProvider>
      <MiniCanvasInner />
    </ReactFlowProvider>
  )
}
