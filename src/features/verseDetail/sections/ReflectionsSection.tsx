import { useState, useEffect } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { useVerseDetailStore } from '../../../store/verseDetailStore'
import { fetchReflections } from '../../../services/verseDetailApi'
import { REFLECTION_PREVIEW_LENGTH } from '../detailConfig'
import type { ReflectionPost } from '../types'

const POST_TYPE_LABELS: Record<number, string> = { 1: 'Reflection', 2: 'Lesson' }

export default function ReflectionsSection() {
  const verse = useVerseDetailStore(s => s.verse)
  const [posts, setPosts] = useState<ReflectionPost[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!verse) return
    let cancelled = false
    setLoading(true)
    setExpandedIds(new Set())

    fetchReflections(verse.verse_key).then(data => {
      if (!cancelled) { setPosts(data); setLoading(false) }
    }).catch(() => {
      if (!cancelled) { setPosts([]); setLoading(false) }
    })

    return () => { cancelled = true }
  }, [verse?.verse_key])

  if (!verse) return null

  // Gracefully hide if no posts and not loading
  if (!loading && posts.length === 0) return null

  function toggleExpand(id: number) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="border-b border-slate-100">
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Reflections
        </span>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
            <Loader2 size={12} className="animate-spin" />
            Loading reflections…
          </div>
        )}

        {!loading && posts.map(post => {
          const isLong = post.body.length > REFLECTION_PREVIEW_LENGTH
          const isExpanded = expandedIds.has(post.id)
          const displayBody = isExpanded || !isLong
            ? post.body
            : post.body.slice(0, REFLECTION_PREVIEW_LENGTH) + '…'

          return (
            <div key={post.id} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium border border-emerald-100">
                  {POST_TYPE_LABELS[post.postTypeId] ?? 'Post'}
                </span>
                <span className="text-[10px] text-slate-400">{post.authorName}</span>
                <span className="flex items-center gap-0.5 text-[10px] text-slate-400 ml-auto">
                  <Heart size={9} /> {post.likeCount}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{displayBody}</p>
              {isLong && (
                <button
                  onClick={() => toggleExpand(post.id)}
                  className="text-[10px] text-emerald-600 font-medium mt-1"
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
              <p className="text-[9px] text-slate-300 mt-1.5">via Quran Reflect</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
