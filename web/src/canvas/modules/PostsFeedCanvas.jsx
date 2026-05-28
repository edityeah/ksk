// Community Posts — global feed where trainees, training centres, training
// partners and mentors can share short updates: tips, milestones, questions,
// job openings, job fairs, scheme announcements.
//
// Inspired by SwiftChat's posts surface. v1 scope: read + create + delete
// (own posts only) + open detail view on tap. Likes / comments deferred.
//
// Cards render differently by `kind`:
//   note         — plain text, violet accent
//   event        — amber banner with date + venue, "Register" CTA
//   opening      — emerald banner with role / pay, "Apply" CTA
//   announcement — sky banner with scheme name, "Read more" CTA
//   milestone    — pink banner with celebratory framing
//
// Tap any card → opens PostDetailCanvas with the full post.

import { useEffect, useState, useRef } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import {
  Loader2, Send, Image as ImageIcon, X, Sparkles, RefreshCw, Trash2, Users,
  GraduationCap, Building2, Briefcase, Megaphone, PartyPopper, Calendar, MapPin, ExternalLink, ChevronRight
} from 'lucide-react'

const ROLE_META = {
  trainee:          { label: 'Learner',          tone: 'bg-sky-50 text-sky-800 border-sky-200',             icon: GraduationCap },
  training_centre:  { label: 'Training Centre',  tone: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: Building2 },
  training_partner: { label: 'Training Partner', tone: 'bg-amber-50 text-amber-800 border-amber-200',       icon: Briefcase },
  mentor:           { label: 'Mentor',           tone: 'bg-violet-50 text-violet-800 border-violet-200',    icon: Sparkles },
  employer:         { label: 'Employer',         tone: 'bg-teal-50 text-teal-800 border-teal-200',          icon: Building2 },
}

const KIND_META = {
  event:        { label: 'Job Fair / Event', tone: 'bg-amber-50 text-amber-800 border-amber-200',     icon: Calendar    },
  opening:      { label: 'Job Opening',      tone: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: Briefcase },
  announcement: { label: 'Announcement',     tone: 'bg-sky-50 text-sky-800 border-sky-200',           icon: Megaphone   },
  milestone:    { label: 'Milestone',        tone: 'bg-pink-50 text-pink-800 border-pink-200',        icon: PartyPopper },
  note:         { label: 'Note',             tone: 'bg-violet-50 text-violet-800 border-violet-200',  icon: Sparkles    },
}

const COMPOSER_KINDS = [
  { id: 'note',         label: 'Note',         hint: 'A tip, question or opinion',          icon: Sparkles },
  { id: 'event',        label: 'Job Fair',     hint: 'Event with a date + venue',           icon: Calendar },
  { id: 'opening',      label: 'Opening',      hint: 'A specific job opening',              icon: Briefcase },
  { id: 'announcement', label: 'Announcement', hint: 'Scheme / deadline / policy',          icon: Megaphone },
  { id: 'milestone',    label: 'Milestone',    hint: 'Success story or batch milestone',    icon: PartyPopper },
]

const FILTER_CHIPS = [
  { id: 'all',          label: 'All' },
  { id: 'event',        label: 'Job Fairs' },
  { id: 'opening',      label: 'Openings' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'milestone',    label: 'Milestones' },
  { id: 'note',         label: 'Tips' },
]

const POSTING_ROLES = new Set(['trainee', 'training_centre', 'training_partner', 'mentor'])

function initials(name) {
  return (name || '?').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

// Author avatar. Uses `mentorPhotoUrl` when the post author is a mentor (the
// only role that currently carries a photo); falls back to initials on a
// neutral gradient block. The <img> onError flip keeps the card looking
// intentional even if Unsplash is unreachable.
function AuthorAvatar({ author, sizeClass = 'w-10 h-10 text-[12px]' }) {
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
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function eventDateLabel(iso) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch { return iso }
}

// Resize uploads down to ~1280px max edge JPEG before sending; the schema
// caps at ~1.8MB base64 to keep the DB lean.
async function imageFileToDataUrl(file, maxEdge = 1280) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('read_failed'))
    r.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode_failed'))
      img.onload = () => {
        const ratio = Math.min(maxEdge / img.width, maxEdge / img.height, 1)
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = r.result
    }
    r.readAsDataURL(file)
  })
}

export default function PostsFeedCanvas() {
  const { user, role, openCanvas, showToast } = useApp()
  const canPost = POSTING_ROLES.has(role)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await api.get('/api/posts?limit=30')
      setPosts(Array.isArray(r?.posts) ? r.posts : [])
    } catch (e) {
      setError(e?.message || 'fetch_failed')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function deletePost(id) {
    const ok = window.confirm('Delete this post? This cannot be undone.')
    if (!ok) return
    try {
      await api.del(`/api/posts/${id}`)
      setPosts(ps => ps.filter(p => p.id !== id))
    } catch {
      showToast?.({ msg: "Couldn't delete this post", type: 'error' })
    }
  }

  const visible = filter === 'all' ? posts : posts.filter(p => (p.kind || 'note') === filter)

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-violet-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-violet-700 inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Community
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">Posts</h2>
        <div className="text-[12px] text-txt-secondary mt-1 leading-snug max-w-2xl">
          Job fairs, openings, scheme announcements, mentor tips and learner milestones — all in one feed. Tap any post to read the full story.
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {FILTER_CHIPS.map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              className={`text-[11px] px-2.5 py-1 rounded-pill border font-medium transition ${
                filter === c.id
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-bdr text-txt-secondary hover:bg-violet-50'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Composer */}
      {canPost ? (
        <PostComposer onCreated={p => setPosts(prev => [p, ...prev])} />
      ) : (
        <div className="m-4 rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-4 text-[12px] text-txt-secondary text-center">
          Posting is open to learners, training centres, training partners and mentors. Your role (<b>{role || 'unknown'}</b>) can read the feed but not create posts.
        </div>
      )}

      {/* Feed */}
      <div className="px-4 pb-6 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary">
            {filter === 'all' ? 'Latest' : KIND_META[filter]?.label || 'Latest'} ({visible.length})
          </div>
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1 text-[11px] text-violet-700 hover:underline disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {loading && visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-8 text-center">
            <Loader2 className="w-5 h-5 text-violet-600 animate-spin mx-auto" />
            <div className="text-[13px] text-txt-secondary mt-2">Loading posts…</div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 text-center text-[12px] text-rose-700">
            Couldn't load posts: <span className="font-mono">{error}</span>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-8 text-center">
            <Users className="w-6 h-6 text-txt-tertiary mx-auto" />
            <div className="text-[14px] font-bold text-txt-primary mt-2">No posts in this filter</div>
            <div className="text-[12px] text-txt-secondary mt-1">
              {filter === 'all' ? 'Be the first to share something.' : 'Try the All filter to see everything.'}
            </div>
          </div>
        )}

        {visible.map(p => (
          <PostCard key={p.id} post={p}
            mine={p.author.id === user?.id}
            onOpen={() => openCanvas({ type: 'post_detail', postId: p.id, post: p })}
            onDelete={() => deletePost(p.id)} />
        ))}
      </div>
    </div>
  )
}

function PostComposer({ onCreated }) {
  const { showToast } = useApp()
  const [kind, setKind] = useState('note')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState(null)
  const [eventAt, setEventAt] = useState('') // datetime-local string
  const [venue, setVenue] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  async function pickImage(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!/^image\//.test(f.type)) {
      showToast?.({ msg: 'Pick an image file', type: 'error' }); return
    }
    try {
      const data = await imageFileToDataUrl(f)
      setImage(data)
    } catch {
      showToast?.({ msg: "Couldn't read that image", type: 'error' })
    }
  }

  async function submit(e) {
    e?.preventDefault?.()
    const text = body.trim()
    if (!text) return
    setBusy(true)
    try {
      const payload = {
        body: text,
        kind,
        title:     title.trim()    || undefined,
        imageData: image           || undefined,
        venue:     venue.trim()    || undefined,
        ctaLabel:  ctaLabel.trim() || undefined,
        ctaUrl:    ctaUrl.trim()   || undefined,
        eventAt:   eventAt ? new Date(eventAt).toISOString() : undefined,
      }
      const r = await api.post('/api/posts', payload)
      if (r?.post) onCreated?.(r.post)
      setBody(''); setTitle(''); setImage(null); setEventAt(''); setVenue(''); setCtaLabel(''); setCtaUrl('')
      setKind('note')
    } catch (e) {
      showToast?.({ msg: e?.message || "Couldn't publish", type: 'error' })
    } finally { setBusy(false) }
  }

  const showEventFields = kind === 'event' || kind === 'opening'
  const showCtaFields   = kind !== 'note' && kind !== 'milestone'

  return (
    <form onSubmit={submit} className="m-4 rounded-2xl border border-bdr-light bg-white p-3 shadow-card">
      {/* Kind picker */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {COMPOSER_KINDS.map(k => {
          const Icon = k.icon
          return (
            <button type="button" key={k.id} onClick={() => setKind(k.id)} title={k.hint}
              className={`text-[11px] px-2.5 py-1 rounded-pill border font-bold inline-flex items-center gap-1 transition ${
                kind === k.id
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-bdr text-txt-secondary hover:bg-violet-50'}`}>
              <Icon className="w-3 h-3" />{k.label}
            </button>
          )
        })}
      </div>

      {/* Title — optional for note/milestone, recommended for everything else */}
      {kind !== 'note' && (
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
          placeholder={
            kind === 'event'        ? 'Event title — e.g. "Reliance Retail Hiring Fair · Patna"'
            : kind === 'opening'    ? 'Opening title — e.g. "We\'re hiring 15 RSAs · Lucknow"'
            : kind === 'announcement' ? 'Announcement headline — e.g. "PMKVY 5.0 vouchers go live"'
            : 'Milestone headline — e.g. "Batch crossed 60% attendance"'}
          className="w-full bg-transparent text-[14px] font-bold outline-none placeholder:text-txt-tertiary placeholder:font-medium mb-1.5" />
      )}

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={
          kind === 'event'        ? 'Details: who can apply, what to bring, walk-in vs registration, etc.'
          : kind === 'opening'    ? 'Role details: pay range, requirements, location, how to apply.'
          : kind === 'announcement' ? 'What\'s changing, deadlines, who is affected.'
          : kind === 'milestone'  ? 'Share the win — context, numbers, what\'s next.'
          : 'Share a tip, milestone or question with the community…'}
        rows={kind === 'note' ? 3 : 4}
        maxLength={4000}
        className="w-full resize-none bg-transparent text-[13px] outline-none placeholder:text-txt-tertiary leading-relaxed"
      />

      {/* Event / opening fields */}
      {showEventFields && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-bdr-light">
          <label className="text-[11px] text-txt-secondary">
            <span className="block uppercase tracking-wider font-bold text-txt-tertiary mb-0.5">
              {kind === 'event' ? 'When' : 'Apply by'}
            </span>
            <input type="datetime-local" value={eventAt} onChange={e => setEventAt(e.target.value)}
              className="w-full bg-surface-page rounded-lg border border-bdr-light px-2 py-1 text-[12px] outline-none" />
          </label>
          <label className="text-[11px] text-txt-secondary">
            <span className="block uppercase tracking-wider font-bold text-txt-tertiary mb-0.5">
              {kind === 'event' ? 'Venue' : 'Location'}
            </span>
            <input type="text" value={venue} onChange={e => setVenue(e.target.value)} maxLength={200}
              placeholder={kind === 'event' ? 'e.g. Patliputra Convention Centre, Patna' : 'e.g. Lucknow stores'}
              className="w-full bg-surface-page rounded-lg border border-bdr-light px-2 py-1 text-[12px] outline-none" />
          </label>
        </div>
      )}

      {/* CTA fields */}
      {showCtaFields && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2 mt-2 pt-2 border-t border-bdr-light">
          <label className="text-[11px] text-txt-secondary">
            <span className="block uppercase tracking-wider font-bold text-txt-tertiary mb-0.5">Button label</span>
            <input type="text" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} maxLength={40}
              placeholder="e.g. Register, Apply, Read more"
              className="w-full bg-surface-page rounded-lg border border-bdr-light px-2 py-1 text-[12px] outline-none" />
          </label>
          <label className="text-[11px] text-txt-secondary">
            <span className="block uppercase tracking-wider font-bold text-txt-tertiary mb-0.5">Link</span>
            <input type="text" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} maxLength={500}
              placeholder="https://… or ksk://canvas/jobs_marketplace"
              className="w-full bg-surface-page rounded-lg border border-bdr-light px-2 py-1 text-[12px] outline-none" />
          </label>
        </div>
      )}

      {image && (
        <div className="relative inline-block mt-2">
          <img src={image} alt="" className="max-h-40 rounded-xl border border-bdr-light" />
          <button type="button" onClick={() => setImage(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white inline-flex items-center justify-center hover:bg-rose-700">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-bdr-light">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-[11px] text-txt-secondary hover:bg-slate-100">
            <ImageIcon className="w-3.5 h-3.5" /> {image ? 'Replace image' : 'Add image'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} hidden />
          <span className="text-[10px] text-txt-tertiary">{body.length}/4000</span>
        </div>
        <button type="submit" disabled={busy || !body.trim()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill bg-violet-600 text-white text-[12px] font-bold disabled:opacity-50 hover:bg-violet-700">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  )
}

function PostCard({ post: p, mine, onOpen, onDelete }) {
  const roleMeta = ROLE_META[p.author.role] || { label: p.author.role || 'User', tone: 'bg-slate-50 text-slate-700 border-slate-200', icon: Users }
  const RIcon = roleMeta.icon
  const kindMeta = KIND_META[p.kind] || KIND_META.note
  const KIcon = kindMeta.icon
  const isEvent = p.kind === 'event'
  const isOpening = p.kind === 'opening'

  return (
    <button onClick={onOpen} type="button"
      className="w-full text-left rounded-2xl border border-bdr-light bg-white p-3.5 shadow-card hover:shadow-lg hover:border-violet-200 transition group">
      <div className="flex items-start gap-3">
        <AuthorAvatar author={p.author} sizeClass="w-10 h-10 text-[12px]" />
        <div className="flex-1 min-w-0">
          {/* Author meta + kind pill */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[13px] text-txt-primary truncate">{p.author.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-pill border font-bold inline-flex items-center gap-1 ${roleMeta.tone}`}>
              <RIcon className="w-3 h-3" />{roleMeta.label}
            </span>
            {p.author.role === 'mentor' && p.author.mentorTitle && (
              <span className="text-[11px] text-txt-tertiary truncate">· {p.author.mentorTitle}</span>
            )}
            <span className="ml-auto text-[10px] text-txt-tertiary">{relativeTime(p.createdAt)}</span>
          </div>

          {/* Kind tag + sector */}
          {(p.kind && p.kind !== 'note') || p.sector ? (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {p.kind && p.kind !== 'note' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-pill border font-bold inline-flex items-center gap-1 ${kindMeta.tone}`}>
                  <KIcon className="w-3 h-3" />{kindMeta.label}
                </span>
              )}
              {p.sector && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-pill border border-bdr-light text-txt-secondary">
                  {p.sector.name}
                </span>
              )}
            </div>
          ) : null}

          {/* Title */}
          {p.title && (
            <div className="text-[15px] font-bold text-txt-primary leading-snug mt-2">{p.title}</div>
          )}

          {/* Event / opening compact banner */}
          {(isEvent || isOpening) && (p.eventAt || p.venue) && (
            <div className={`mt-2 rounded-xl px-2.5 py-1.5 text-[11px] border ${kindMeta.tone} inline-flex items-center gap-3 flex-wrap`}>
              {p.eventAt && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <Calendar className="w-3 h-3" />{eventDateLabel(p.eventAt)}
                </span>
              )}
              {p.venue && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <MapPin className="w-3 h-3" />{p.venue}
                </span>
              )}
            </div>
          )}

          {/* Image */}
          {p.imageData && (
            <img src={p.imageData} alt="" className="w-full max-h-72 object-cover rounded-xl mt-2 border border-bdr-light" />
          )}

          {/* Body — clamped on the card; full text in detail */}
          <div className="text-[13px] text-txt-primary whitespace-pre-wrap leading-relaxed mt-2 line-clamp-3">
            {p.body}
          </div>

          {/* CTA preview + read-more affordance */}
          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-bdr-light/60">
            {p.ctaLabel ? (
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-pill px-2 py-0.5 border ${kindMeta.tone}`}>
                {p.ctaLabel}
                {p.ctaUrl && !/^ksk:\/\//.test(p.ctaUrl) && <ExternalLink className="w-3 h-3" />}
              </span>
            ) : null}
            <span className="ml-auto text-[11px] text-violet-700 font-bold inline-flex items-center gap-0.5 group-hover:underline">
              Read more <ChevronRight className="w-3 h-3" />
            </span>
            {mine && (
              <button onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="inline-flex items-center gap-1 text-[10px] text-rose-600 hover:underline">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
