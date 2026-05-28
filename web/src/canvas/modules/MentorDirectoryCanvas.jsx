// Trainee · Industry Mentors — directory of mentors a learner can subscribe
// to and (later) book 1:1 slots with. The default cut shows all sector-aligned
// mentors; trainees can filter by sector chip across the top.
//
// Card shows: photo placeholder, name, current role + company, sector chip,
// years exp, subscriber count, subscribe/subscribed toggle, "View profile"
// CTA. Clicking the card body OR "View profile" opens MentorProfileCanvas
// for that mentor with context.mentorId.

import { useEffect, useState, useMemo } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import { Loader2, Briefcase, Award, MapPin, Star, UserPlus, UserCheck, Users, IndianRupee, Sparkles } from 'lucide-react'

const SECTOR_TONE = {
  RAS:  'bg-sky-50      text-sky-800      border-sky-200',
  LOG:  'bg-amber-50    text-amber-800    border-amber-200',
  TEL:  'bg-violet-50   text-violet-800   border-violet-200',
  BFSI: 'bg-emerald-50  text-emerald-800  border-emerald-200',
  HLT:  'bg-rose-50     text-rose-800     border-rose-200',
  ITS:  'bg-indigo-50   text-indigo-800   border-indigo-200',
}

function initials(name) {
  return (name || '?').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

// Photo with initials fallback. If photoUrl 404s or fails to load, the <img>
// onError flips to the gradient + initials block — so the card never breaks
// even if Unsplash is unreachable.
function Avatar({ src, name, sizeClass = 'w-12 h-12 text-[15px]' }) {
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

export default function MentorDirectoryCanvas() {
  const { openCanvas, meExtra } = useApp()
  const myTraineeSector = meExtra?.trainee?.batch?.track?.sector?.code || null

  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sectorFilter, setSectorFilter] = useState(null) // null = all

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await api.get(sectorFilter ? `/api/mentors?sector=${sectorFilter}` : '/api/mentors')
      setMentors(Array.isArray(r?.mentors) ? r.mentors : [])
    } catch (e) {
      setError(e?.message || 'fetch_failed')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [sectorFilter])

  // Build the sector chip list from the mentors returned (when unfiltered)
  // so we don't hardcode a full sector list here. When filtered, we still
  // show all known chips so the user can switch.
  const sectorChips = useMemo(() => {
    const known = new Map()
    mentors.forEach(m => { if (m.sector) known.set(m.sector.code, m.sector.name) })
    // Always keep my own sector visible even if no mentors match.
    if (myTraineeSector && !known.has(myTraineeSector)) {
      known.set(myTraineeSector, myTraineeSector)
    }
    return [...known.entries()].map(([code, name]) => ({ code, name }))
  }, [mentors, myTraineeSector])

  async function toggleSubscribe(mentor) {
    const target = !mentor.isSubscribed
    // optimistic
    setMentors(ms => ms.map(m => m.id === mentor.id
      ? { ...m, isSubscribed: target, subscriberCount: m.subscriberCount + (target ? 1 : -1) }
      : m))
    try {
      const r = await api.post(`/api/mentors/${mentor.id}/subscribe`, { subscribed: target })
      setMentors(ms => ms.map(m => m.id === mentor.id
        ? { ...m, isSubscribed: r.subscribed, subscriberCount: r.subscriberCount }
        : m))
    } catch {
      // revert on failure
      setMentors(ms => ms.map(m => m.id === mentor.id ? { ...m, isSubscribed: mentor.isSubscribed, subscriberCount: mentor.subscriberCount } : m))
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-violet-50/80 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-violet-700 inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Trainee · Industry Mentors
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">
          Connect with someone who's done it
        </h2>
        <div className="text-[12px] text-txt-secondary mt-1 leading-snug max-w-2xl">
          Practitioners across retail, logistics, telecom, BFSI, healthcare and IT. Subscribe to follow their posts; request a 1:1 slot when you have a specific question about your career path.
        </div>

        {/* Sector chips */}
        {sectorChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <button onClick={() => setSectorFilter(null)}
              className={`text-[11px] px-2.5 py-1 rounded-pill border font-medium transition ${
                sectorFilter === null
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-bdr text-txt-secondary hover:bg-violet-50'}`}>
              All
            </button>
            {sectorChips.map(s => (
              <button key={s.code} onClick={() => setSectorFilter(s.code)}
                className={`text-[11px] px-2.5 py-1 rounded-pill border font-medium transition ${
                  sectorFilter === s.code
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'bg-white border-bdr text-txt-secondary hover:bg-violet-50'}`}>
                {s.name}{s.code === myTraineeSector && <span className="ml-1 opacity-70">· yours</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {loading && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-8 text-center">
            <Loader2 className="w-5 h-5 text-violet-600 animate-spin mx-auto" />
            <div className="text-[13px] text-txt-secondary mt-2">Loading mentors…</div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 text-center text-[13px] text-rose-700">
            Couldn't load mentors: <span className="font-mono text-[11px]">{error}</span>
          </div>
        )}

        {!loading && !error && mentors.length === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-8 text-center">
            <Briefcase className="w-6 h-6 text-txt-tertiary mx-auto" />
            <div className="text-[14px] font-bold text-txt-primary mt-2">No mentors in this sector yet</div>
            <div className="text-[12px] text-txt-secondary mt-1 max-w-md mx-auto">
              We're inviting practitioners across all 37 sectors. Switch sectors above to see who's already on board.
            </div>
          </div>
        )}

        {!loading && !error && mentors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {mentors.map(m => (
              <MentorCard key={m.id}
                mentor={m}
                onOpen={() => openCanvas({ type: 'mentor_profile', mentorId: m.id })}
                onToggleSubscribe={() => toggleSubscribe(m)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MentorCard({ mentor: m, onOpen, onToggleSubscribe }) {
  const sectorTone = SECTOR_TONE[m.sector?.code] || 'bg-slate-50 text-slate-700 border-slate-200'
  return (
    <div className="rounded-2xl border border-bdr-light bg-white p-4 hover:shadow-card transition cursor-pointer"
         onClick={onOpen}>
      <div className="flex items-start gap-3">
        <Avatar src={m.photoUrl} name={m.name} sizeClass="w-12 h-12 text-[15px]" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-[14px] text-txt-primary truncate">{m.name}</div>
              <div className="text-[12px] text-txt-secondary truncate">{m.title} · {m.company}</div>
            </div>
            {m.sector && (
              <span className={`text-[10px] px-2 py-0.5 rounded-pill border font-bold flex-shrink-0 ${sectorTone}`}>
                {m.sector.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] text-txt-secondary">
            <div className="inline-flex items-center gap-1"><Award className="w-3 h-3 text-txt-tertiary" />{m.yearsExp}+ yrs</div>
            <div className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-txt-tertiary" />{m.city || '—'}</div>
            <div className="inline-flex items-center gap-1"><Users className="w-3 h-3 text-txt-tertiary" />{m.subscriberCount} subs</div>
          </div>

          {m.bio && (
            <div className="text-[12px] text-txt-secondary mt-2 line-clamp-2 leading-snug">{m.bio}</div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button onClick={(e) => { e.stopPropagation(); onToggleSubscribe() }}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-pill text-[11px] font-bold transition ${
                m.isSubscribed
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
              {m.isSubscribed ? <><UserCheck className="w-3 h-3" /> Subscribed</> : <><UserPlus className="w-3 h-3" /> Subscribe</>}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onOpen() }}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-pill text-[11px] font-bold text-violet-700 hover:bg-violet-50">
              View profile →
            </button>
            {m.hourlyRate != null && (
              <span className="ml-auto text-[10px] text-txt-tertiary inline-flex items-center gap-0.5">
                <IndianRupee className="w-3 h-3" />{m.hourlyRate}/hr
              </span>
            )}
            {m.hourlyRate == null && (
              <span className="ml-auto text-[10px] text-emerald-700 font-bold inline-flex items-center gap-1">
                <Star className="w-3 h-3" /> Free
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
