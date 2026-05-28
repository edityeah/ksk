// Community post · detail view.
//
// Opened when a learner taps any post card in the feed (or in a mentor's
// "Recent posts" strip). Renders the full post — bigger image, full body,
// structured event / opening fields, prominent CTA button — plus an author
// strip with role + (for mentors) a quick link to their profile.
//
// Phase 2 will add comments here.

import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import {
  Loader2, ArrowLeft, ExternalLink, Calendar, MapPin, Sparkles, Trash2,
  GraduationCap, Building2, Briefcase, Megaphone, PartyPopper, Users
} from 'lucide-react'

const ROLE_META = {
  trainee:          { label: 'Learner',          tone: 'bg-sky-50 text-sky-800 border-sky-200',             icon: GraduationCap },
  training_centre:  { label: 'Training Centre',  tone: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: Building2 },
  training_partner: { label: 'Training Partner', tone: 'bg-amber-50 text-amber-800 border-amber-200',       icon: Briefcase },
  mentor:           { label: 'Mentor',           tone: 'bg-violet-50 text-violet-800 border-violet-200',    icon: Sparkles },
  employer:         { label: 'Employer',         tone: 'bg-teal-50 text-teal-800 border-teal-200',          icon: Building2 },
}

const KIND_META = {
  event:        { label: 'Event · Job Fair',  banner: 'from-amber-50 to-white',  border: 'border-amber-200',   accent: 'text-amber-700',   icon: Calendar    },
  opening:      { label: 'Job Opening',       banner: 'from-emerald-50 to-white', border: 'border-emerald-200', accent: 'text-emerald-700', icon: Briefcase   },
  announcement: { label: 'Announcement',      banner: 'from-sky-50 to-white',    border: 'border-sky-200',     accent: 'text-sky-700',     icon: Megaphone   },
  milestone:    { label: 'Milestone',         banner: 'from-pink-50 to-white',   border: 'border-pink-200',    accent: 'text-pink-700',    icon: PartyPopper },
  note:         { label: 'Note',              banner: 'from-violet-50 to-white', border: 'border-violet-200',  accent: 'text-violet-700',  icon: Sparkles    },
}

function initials(name) {
  return (name || '?').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

function AuthorAvatar({ author, sizeClass = 'w-12 h-12 text-[14px]' }) {
  const [broken, setBroken] = useState(false)
  const src = author?.mentorPhotoUrl
  if (src && !broken) {
    return (
      <img src={src} alt={author.name} loading="lazy" onError={() => setBroken(true)}
        className={`${sizeClass} rounded-2xl object-cover flex-shrink-0 border border-bdr-light bg-slate-100`} />
    )
  }
  return (
    <div className={`${sizeClass} rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-bold flex-shrink-0`}>
      {initials(author?.name)}
    </div>
  )
}

function relativeTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const delta = Math.floor((Date.now() - t) / 1000)
  if (delta < 60) return 'just now'
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`
  if (delta < 86400 * 7) return `${Math.floor(delta / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function eventDateLabel(iso) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

// Internal app-link scheme used in seeds: ksk://canvas/<canvas_type>
// Lets us craft CTAs like "Apply with Skill Passport" → opens jobs canvas.
function parseInternalLink(url) {
  if (!url) return null
  const m = /^ksk:\/\/canvas\/([\w_]+)$/.exec(url)
  return m ? m[1] : null
}

export default function PostDetailCanvas({ context }) {
  const { user, openCanvas, closeCanvas, showToast } = useApp()
  const postId = context?.postId
  const [post, setPost] = useState(context?.post || null)
  const [loading, setLoading] = useState(!context?.post && !!postId)
  const [error, setError] = useState('')

  useEffect(() => {
    if (post || !postId) return
    let cancel = false
    setLoading(true); setError('')
    api.get(`/api/posts/${postId}`)
      .then(r => { if (!cancel) setPost(r?.post || null) })
      .catch(e => { if (!cancel) setError(e?.message || 'fetch_failed') })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [postId])

  async function deletePost() {
    if (!post) return
    const ok = window.confirm('Delete this post? This cannot be undone.')
    if (!ok) return
    try {
      await api.del(`/api/posts/${post.id}`)
      showToast?.({ msg: 'Post deleted' })
      closeCanvas()
    } catch {
      showToast?.({ msg: "Couldn't delete this post", type: 'error' })
    }
  }

  function handleCta() {
    if (!post?.ctaUrl) return
    const internal = parseInternalLink(post.ctaUrl)
    if (internal) {
      openCanvas({ type: internal })
    } else {
      window.open(post.ctaUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 text-violet-600 animate-spin mx-auto" />
          <div className="text-[13px] text-txt-secondary mt-2">Loading post…</div>
        </div>
      </div>
    )
  }
  if (error || !post) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 text-center text-[13px] text-rose-700">
          Couldn't load this post: <span className="font-mono text-[11px]">{error || 'not_found'}</span>
        </div>
      </div>
    )
  }

  const roleMeta = ROLE_META[post.author.role] || { label: post.author.role || 'User', tone: 'bg-slate-50 text-slate-700 border-slate-200', icon: Users }
  const RIcon = roleMeta.icon
  const kindMeta = KIND_META[post.kind] || KIND_META.note
  const KIcon = kindMeta.icon
  const mine = post.author.id === user?.id
  const isEventy = post.kind === 'event' || post.kind === 'opening'

  return (
    <div className="h-full overflow-y-auto">
      {/* Back bar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-bdr-light px-3 py-2 flex items-center gap-2">
        <button onClick={closeCanvas}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-pill hover:bg-slate-100 text-[12px] text-txt-secondary">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to feed
        </button>
        <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-pill border font-bold inline-flex items-center gap-1 ${kindMeta.border} ${kindMeta.accent} bg-white`}>
          <KIcon className="w-3 h-3" />{kindMeta.label}
        </span>
        {post.sector && (
          <span className="text-[10px] px-2 py-0.5 rounded-pill border border-bdr-light text-txt-secondary bg-white">
            {post.sector.name}
          </span>
        )}
        {mine && (
          <button onClick={deletePost}
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-rose-600 hover:underline">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        )}
      </div>

      <article className="px-5 pt-4 pb-8 max-w-3xl mx-auto">
        {/* Author strip */}
        <div className="flex items-center gap-3">
          <AuthorAvatar author={post.author} sizeClass="w-12 h-12 text-[14px]" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[14px] text-txt-primary truncate">{post.author.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-pill border font-bold inline-flex items-center gap-1 ${roleMeta.tone}`}>
                <RIcon className="w-3 h-3" />{roleMeta.label}
              </span>
            </div>
            {post.author.role === 'mentor' && post.author.mentorTitle && (
              <div className="text-[12px] text-txt-secondary truncate">
                {post.author.mentorTitle}{post.author.mentorCompany ? ` @ ${post.author.mentorCompany}` : ''}
              </div>
            )}
            <div className="text-[11px] text-txt-tertiary">{relativeTime(post.createdAt)}</div>
          </div>
        </div>

        {/* Title */}
        {post.title && (
          <h1 className="text-[22px] md:text-[26px] font-bold text-txt-primary leading-tight mt-4">
            {post.title}
          </h1>
        )}

        {/* Event / opening banner — date + venue stand out */}
        {isEventy && (post.eventAt || post.venue) && (
          <div className={`mt-4 rounded-2xl bg-gradient-to-br ${kindMeta.banner} border ${kindMeta.border} p-4`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
              {post.eventAt && (
                <div className="flex items-start gap-2">
                  <Calendar className={`w-4 h-4 mt-0.5 flex-shrink-0 ${kindMeta.accent}`} />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary">When</div>
                    <div className="text-txt-primary font-medium">{eventDateLabel(post.eventAt)}</div>
                  </div>
                </div>
              )}
              {post.venue && (
                <div className="flex items-start gap-2">
                  <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${kindMeta.accent}`} />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary">Where</div>
                    <div className="text-txt-primary font-medium">{post.venue}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image */}
        {post.imageData && (
          <img src={post.imageData} alt=""
            className="w-full max-h-[480px] object-cover rounded-2xl border border-bdr-light mt-4" />
        )}

        {/* Body */}
        <div className="text-[15px] text-txt-primary whitespace-pre-wrap leading-relaxed mt-4">
          {post.body}
        </div>

        {/* CTA */}
        {post.ctaLabel && (
          <div className="mt-5 pt-5 border-t border-bdr-light">
            <button onClick={handleCta}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-pill font-bold text-[13px] text-white shadow-card
                ${post.kind === 'opening' ? 'bg-emerald-600 hover:bg-emerald-700'
                  : post.kind === 'event'   ? 'bg-amber-600 hover:bg-amber-700'
                  : post.kind === 'announcement' ? 'bg-sky-600 hover:bg-sky-700'
                  : 'bg-violet-600 hover:bg-violet-700'}`}>
              {post.ctaLabel}
              {!parseInternalLink(post.ctaUrl) && post.ctaUrl && <ExternalLink className="w-3.5 h-3.5" />}
            </button>
            {post.ctaUrl && !parseInternalLink(post.ctaUrl) && (
              <div className="text-[10px] text-txt-tertiary mt-2 truncate">{post.ctaUrl}</div>
            )}
          </div>
        )}

        {/* Author footer — link to mentor profile if applicable */}
        {post.author.role === 'mentor' && (
          <div className="mt-6 pt-4 border-t border-bdr-light">
            <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">About the author</div>
            <div className="rounded-2xl border border-bdr-light bg-white p-3.5 flex items-center gap-3">
              <AuthorAvatar author={post.author} sizeClass="w-10 h-10 text-[12px]" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] text-txt-primary truncate">{post.author.name}</div>
                <div className="text-[11px] text-txt-secondary truncate">{post.author.mentorTitle} @ {post.author.mentorCompany}</div>
              </div>
            </div>
          </div>
        )}
      </article>
    </div>
  )
}
