// Trainee · Mentor profile — full view for a single mentor.
//
// Sections:
//   * Hero — avatar, name, title @ company, sector chip, subscribe button
//   * Stats — years exp, subscribers, hourly rate / free, languages
//   * About — bio
//   * Book a slot (Phase 4 stub) — disabled CTA with copy explaining what it'll do
//   * Recent posts — the last 6 posts they've authored, identical card style
//     to the global feed for consistency

import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import { Loader2, Award, MapPin, Users, IndianRupee, Sparkles, UserPlus, UserCheck, MessageCircle, CalendarClock, Languages, Star } from 'lucide-react'

function initials(name) {
  return (name || '?').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

function Avatar({ src, name, sizeClass = 'w-16 h-16 text-[20px]' }) {
  const [broken, setBroken] = useState(false)
  if (src && !broken) {
    return (
      <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)}
        className={`${sizeClass} rounded-2xl object-cover flex-shrink-0 border border-bdr-light bg-slate-100`} />
    )
  }
  return (
    <div className={`${sizeClass} rounded-2xl bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700 flex items-center justify-center font-bold flex-shrink-0`}>
      {initials(name)}
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

export default function MentorProfileCanvas({ context }) {
  const { showToast, role, meExtra, openCanvas } = useApp()
  // Two ways this canvas can be opened:
  //   1. context.mentorId set — viewing some other mentor's public profile.
  //   2. No context.mentorId, user.role === 'mentor' — viewing my own profile
  //      (the "My Mentor Profile" home tile case). We resolve the mentorId
  //      from /api/me's meExtra.mentor.id which is hydrated server-side.
  const myMentorId = role === 'mentor' ? meExtra?.mentor?.id : null
  const mentorId = context?.mentorId || myMentorId
  const isOwnProfile = !!myMentorId && mentorId === myMentorId

  const [mentor, setMentor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!mentorId) { setLoading(false); setError('missing_mentor_id'); return }
    let cancel = false
    setLoading(true); setError('')
    api.get(`/api/mentors/${mentorId}`)
      .then(r => { if (!cancel) setMentor(r?.mentor || null) })
      .catch(e => { if (!cancel) setError(e?.message || 'fetch_failed') })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [mentorId])

  async function toggleSubscribe() {
    if (!mentor) return
    const target = !mentor.isSubscribed
    setMentor({ ...mentor, isSubscribed: target, subscriberCount: mentor.subscriberCount + (target ? 1 : -1) })
    try {
      const r = await api.post(`/api/mentors/${mentor.id}/subscribe`, { subscribed: target })
      setMentor(m => m ? { ...m, isSubscribed: r.subscribed, subscriberCount: r.subscriberCount } : m)
    } catch (e) {
      // revert
      setMentor(m => m ? { ...m, isSubscribed: !target, subscriberCount: m.subscriberCount + (target ? -1 : 1) } : m)
      showToast?.({ msg: "Couldn't update subscription", type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 text-violet-600 animate-spin mx-auto" />
          <div className="text-[13px] text-txt-secondary mt-2">Loading mentor profile…</div>
        </div>
      </div>
    )
  }
  if (error || !mentor) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 text-center text-[13px] text-rose-700">
          Couldn't load this mentor: <span className="font-mono text-[11px]">{error || 'not_found'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-5 bg-gradient-to-br from-violet-50/80 via-white to-white border-b border-bdr-light">
        <div className="flex items-start gap-4">
          <Avatar src={mentor.photoUrl} name={mentor.name} sizeClass="w-16 h-16 text-[20px]" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-bold text-txt-primary leading-tight">{mentor.name}</h2>
            <div className="text-[13px] text-txt-secondary mt-0.5">{mentor.title} · {mentor.company}</div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {mentor.sector && (
                <span className="text-[10px] px-2 py-0.5 rounded-pill bg-violet-50 text-violet-800 border border-violet-200 font-bold">
                  {mentor.sector.name}
                </span>
              )}
              {mentor.city && (
                <span className="text-[10px] text-txt-secondary inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{mentor.city}{mentor.state ? `, ${mentor.state}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {isOwnProfile ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[12px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                <Users className="w-3.5 h-3.5" /> {mentor.subscriberCount} subscribers
              </span>
              <button onClick={() => showToast?.({ msg: 'Inline profile editing arrives next sprint.', type: 'info' })}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-pill text-[12px] font-bold bg-violet-600 text-white hover:bg-violet-700">
                Edit profile
              </button>
              <span className="ml-auto text-[11px] text-txt-tertiary">This is how learners see you.</span>
            </>
          ) : (
            <>
              <button onClick={toggleSubscribe}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-pill text-[12px] font-bold transition ${
                  mentor.isSubscribed
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
                {mentor.isSubscribed
                  ? <><UserCheck className="w-3.5 h-3.5" /> Subscribed · {mentor.subscriberCount}</>
                  : <><UserPlus className="w-3.5 h-3.5" /> Subscribe · {mentor.subscriberCount}</>}
              </button>
              <button onClick={() => showToast?.({ msg: 'Slot booking arrives next sprint — for now, drop a comment on one of their posts.', type: 'info' })}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-pill text-[12px] font-bold bg-white border border-violet-200 text-violet-700 hover:bg-violet-50">
                <CalendarClock className="w-3.5 h-3.5" /> Request a slot
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatTile icon={Award} label="Experience" value={`${mentor.yearsExp}+ yrs`} />
          <StatTile icon={Users} label="Subscribers" value={mentor.subscriberCount} />
          <StatTile icon={IndianRupee} label="Rate"
                    value={mentor.hourlyRate != null ? `₹${mentor.hourlyRate}/hr` : 'Free'} />
          <StatTile icon={Languages} label="Languages" value={(mentor.languages || []).join(', ').toUpperCase() || '—'} />
        </div>
      </div>

      {/* About */}
      {mentor.bio && (
        <div className="px-5 pt-5">
          <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-1.5">About</div>
          <div className="text-[13px] text-txt-primary leading-relaxed">{mentor.bio}</div>
        </div>
      )}

      {/* Slot booking — Phase 4 stub */}
      <div className="px-5 pt-5">
        <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-1.5">
          {isOwnProfile ? 'Your booking page (coming soon)' : 'Book a 1:1 slot'}
        </div>
        <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 p-4">
          <div className="text-[12px] text-txt-secondary leading-relaxed">
            {isOwnProfile
              ? 'Next sprint you\'ll be able to publish weekly slots here — learners book, you accept/reject, then both sides get a meet link. For now your subscribers can comment on your posts.'
              : <>We're wiring up calendar-based slot requests in the next sprint. For now: <b>subscribe</b> to {mentor.name.split(' ')[0]} and read their posts below. If you want to message them about a specific situation, drop a comment on any of their posts — they'll see it.</>}
          </div>
        </div>
      </div>

      {/* Recent posts */}
      <div className="px-5 pt-5 pb-6">
        <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2 inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-violet-600" /> Recent posts ({mentor.recentPosts?.length || 0})
        </div>
        {(!mentor.recentPosts || mentor.recentPosts.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/30 p-5 text-center text-[12px] text-txt-secondary">
            {mentor.name.split(' ')[0]} hasn't posted yet. Subscribe to get notified when they do.
          </div>
        ) : (
          <div className="space-y-2.5">
            {mentor.recentPosts.map(p => (
              <button key={p.id} type="button"
                onClick={() => openCanvas({ type: 'post_detail', postId: p.id })}
                className="w-full text-left rounded-2xl border border-bdr-light bg-white p-3.5 hover:shadow-card hover:border-violet-200 transition group">
                <div className="flex items-center justify-between text-[10px] text-txt-tertiary mb-1.5">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />Mentor post
                    {p.sector && <span className="ml-2 px-1.5 py-0.5 rounded-pill border border-violet-200 bg-violet-50 text-violet-700">{p.sector.name}</span>}
                  </span>
                  <span>{relativeTime(p.createdAt)}</span>
                </div>
                {p.imageData && (
                  <img src={p.imageData} alt="" className="w-full max-h-72 object-cover rounded-xl mb-2" />
                )}
                <div className="text-[13px] text-txt-primary whitespace-pre-wrap leading-relaxed line-clamp-3">{p.body}</div>
                <div className="text-[11px] text-violet-700 font-bold mt-2 group-hover:underline inline-flex items-center gap-0.5">
                  Read more →
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-bdr-light bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary inline-flex items-center gap-1">
        <Icon className="w-3 h-3" />{label}
      </div>
      <div className="text-[14px] font-bold text-txt-primary mt-0.5 truncate">{value}</div>
    </div>
  )
}
