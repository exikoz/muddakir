/**
 * Roadmap — framed as "exploring, may shift."
 * Only Tadabbur & Tafakkur is committed. Everything else is explicitly a direction.
 */

import {
  Compass,
  GitBranch,
  SearchCode,
  BarChart3,
  SlidersHorizontal,
  Users,
  Route,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ScrollReveal from '../components/ScrollReveal'
import { Section, Eyebrow } from '../primitives'

type Status = 'in-progress' | 'exploring'

const ITEMS: {
  icon: LucideIcon
  title: string
  desc: string
  status: Status
  statusLabel: string
}[] = [
  {
    icon: Compass,
    title: 'Tadabbur & Tafakkur mode',
    desc: 'A dedicated reflection surface — guided contemplation prompts, focused reading without distractions, and personal journaling anchored to verses.',
    status: 'in-progress',
    statusLabel: 'In progress · committed',
  },
  {
    icon: GitBranch,
    title: 'Mutashābihāt verses',
    desc: 'Surface verses that are textually similar but contextually distinct — and the classical scholarship that untangles them.',
    status: 'exploring',
    statusLabel: 'Exploring',
  },
  {
    icon: SearchCode,
    title: 'Advanced regex search',
    desc: 'Power-user patterns for scholars and researchers — with Arabic-aware tokenization and morphology-side matching.',
    status: 'exploring',
    statusLabel: 'Exploring',
  },
  {
    icon: BarChart3,
    title: 'Deeper verse analytics',
    desc: 'Morphology trees, cross-reference graphs, occurrence maps, and sūrah-level statistics — opened from any node.',
    status: 'exploring',
    statusLabel: 'Exploring',
  },
  {
    icon: SlidersHorizontal,
    title: 'Polished boolean · range · phonetic UI',
    desc: 'Dedicated builders for each advanced search type, matching how scholars actually phrase their questions.',
    status: 'exploring',
    statusLabel: 'Exploring',
  },
  {
    icon: Users,
    title: 'Collaborative & community workspaces',
    desc: 'Share a canvas with a study group, leave comments on nodes, and curate public workspaces around themes.',
    status: 'exploring',
    statusLabel: 'Exploring',
  },
]

function statusStyle(s: Status): React.CSSProperties {
  if (s === 'in-progress') {
    return {
      background: 'var(--lp-emerald-soft)',
      color: 'var(--lp-emerald-strong)',
      border: '1px solid var(--lp-emerald-border)',
    }
  }
  return {
    background: 'var(--lp-surface-2)',
    color: 'var(--lp-text-dim)',
    border: '1px solid var(--lp-hairline)',
  }
}

function dotStyle(s: Status): React.CSSProperties {
  return {
    background: s === 'in-progress' ? 'var(--lp-emerald)' : 'var(--lp-text-faint)',
  }
}

export default function RoadmapSection() {
  return (
    <Section id="roadmap" accent="slate" pad="xl" width="5xl">
      <ScrollReveal className="max-w-2xl mb-10">
        <Eyebrow icon={Route}>Roadmap</Eyebrow>
        <h2
          className="lp-font-display text-3xl md:text-5xl font-semibold mt-4 mb-4 leading-[1.05]"
          style={{ color: 'var(--lp-text)' }}
        >
          Directions, <span style={{ color: 'var(--lp-text-dim)' }}>not promises.</span>
        </h2>
        <p className="text-[14.5px] leading-relaxed" style={{ color: 'var(--lp-text-muted)' }}>
          This roadmap is <em>currently exploring</em> — it may shift based on your feedback and the data
          we can ethically source. <span style={{ color: 'var(--lp-emerald-strong)', fontWeight: 600 }}>Tadabbur & Tafakkur mode</span>{' '}
          is the one feature we're committed to.
        </p>
      </ScrollReveal>

      {/* Timeline */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute left-[18px] top-2 bottom-2 w-px"
          style={{
            background: 'linear-gradient(to bottom, var(--lp-hairline-strong), var(--lp-hairline) 80%, transparent)',
          }}
        />

        <div className="space-y-4">
          {ITEMS.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 70}>
              <div className="relative flex gap-4">
                {/* Dot */}
                <div
                  className="shrink-0 w-[38px] h-[38px] rounded-xl flex items-center justify-center z-10"
                  style={{
                    background: 'var(--lp-surface)',
                    border: `1px solid ${item.status === 'in-progress' ? 'var(--lp-emerald-border)' : 'var(--lp-hairline-strong)'}`,
                    color: item.status === 'in-progress' ? 'var(--lp-emerald-strong)' : 'var(--lp-text-muted)',
                  }}
                >
                  <item.icon size={16} strokeWidth={2.2} />
                </div>

                <div
                  className="flex-1 p-4 rounded-xl"
                  style={{
                    background: 'var(--lp-surface)',
                    border: '1px solid var(--lp-hairline)',
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3
                      className="lp-font-display text-[15px] font-semibold"
                      style={{ color: 'var(--lp-text)' }}
                    >
                      {item.title}
                    </h3>
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={statusStyle(item.status)}
                    >
                      <span className="w-1 h-1 rounded-full" style={dotStyle(item.status)} />
                      {item.statusLabel}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--lp-text-dim)' }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
