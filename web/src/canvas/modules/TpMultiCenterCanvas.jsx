// Multi-Centre Rollup — the Training Partner's home dashboard.
//
// What it shows:
//   • Headline TP KPIs (centres / tracks / enrolled / placed / avg retention)
//   • A grid of centre cards — each card shows the centre's tracks, KPIs,
//     and a "Send nudge" action so the TP admin can ping a specific centre
//     about, say, a placement-data gap or attendance dip.
//   • A flagged-centre callout when any centre is in audit-risk territory.
//   • Saathi chat at the bottom — answers cross-centre analytic questions.

import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import KpiGridCard from '../../components/cards/KpiGridCard.jsx'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import AvatarCall from '../../components/AvatarCall.jsx'
import { TP_PROFILE, TP_ROLLUP, CENTRES } from './_tp/data.js'
import {
  Building2, MapPin, BookOpen, GraduationCap, Users, ShieldCheck, TrendingUp,
  Bell, AlertTriangle, ArrowRight, Sparkles, Search,
} from 'lucide-react'

const TP_QUICK_ASKS = [
  'Which 3 centres are at most risk this quarter?',
  'Compare Bhopal vs Indore on placement conversion',
  'Why is Guwahati flagged? Recommend a remediation plan',
  'Which tracks have the lowest placement rate across centres?',
  'Schemes I run — which gives best retention?',
  'Broadcast: ask all centres to update Q3 placement filings',
  'Send a nudge to bottom-quartile centres',
  'Project Q4 enrolment if current pace continues',
]

const ROLLUP_KPIS = {
  title: 'Magic Bus India Foundation · all centres',
  items: [
    { label: 'Training Centres', value: TP_ROLLUP.centres.toString(),         tone: 'primary' },
    { label: 'States covered',   value: TP_ROLLUP.states.toString(),          tone: 'sky' },
    { label: 'Tracks offered',   value: TP_ROLLUP.tracks.toString(),          tone: 'violet' },
    { label: 'Schemes',          value: TP_ROLLUP.schemes.toString(),         tone: 'emerald' },
    { label: 'Enrolled',         value: TP_ROLLUP.enrolled.toLocaleString('en-IN'), tone: 'amber' },
    { label: 'Placed',           value: TP_ROLLUP.placed.toLocaleString('en-IN'),   delta: `${Math.round(TP_ROLLUP.placed/TP_ROLLUP.trained*100)}% from trained`, tone: 'rose' },
    { label: 'Avg D90 Retention',value: `${TP_ROLLUP.avgRetention}%`,         tone: 'indigo' },
    { label: 'Avg Quality Index',value: `${TP_ROLLUP.avgQuality}/100`,        tone: 'teal' },
  ],
}

export default function TpMultiCenterCanvas({ context }) {
  const { showToast } = useApp() || {}
  const [pending, setPending] = useState(null)
  const [query, setQuery] = useState('')
  const askSaathi = (text) => setPending({ text, nonce: Date.now() })

  const filteredCentres = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CENTRES
    return CENTRES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      c.tracks.some(t => t.toLowerCase().includes(q))
    )
  }, [query])

  function nudge(centre, kind) {
    const msg =
      kind === 'placement_filing' ? `Placement filing reminder queued for ${centre.name}` :
      kind === 'attendance_audit' ? `Attendance audit nudge sent to ${centre.name} coordinator` :
      kind === 'quality_review'   ? `Quality review scheduled with ${centre.name}` :
                                    `Nudge sent to ${centre.name}`
    showToast?.({ kind: 'success', text: msg })
  }

  const flaggedCentres = CENTRES.filter(c => c.flagged)

  const dashboard = (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-indigo-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-indigo-700">Training Partner · Multi-Centre Rollup</div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">{TP_PROFILE.name}</h2>
        <div className="text-[12px] text-txt-secondary mt-1 inline-flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />HQ: {TP_PROFILE.hq}</span>
          <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />Code: {TP_PROFILE.id}</span>
          <span className="inline-flex items-center gap-1"><GraduationCap className="w-3 h-3" />Since {TP_PROFILE.registeredSince}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* KPI grid */}
        <KpiGridCard card={ROLLUP_KPIS} />

        {/* Flagged centres callout */}
        {flaggedCentres.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-amber-800">
                {flaggedCentres.length} centre{flaggedCentres.length === 1 ? '' : 's'} need attention
              </div>
              <div className="text-[11px] text-amber-800/80">
                {flaggedCentres.map(c => c.name).join(' · ')}
              </div>
            </div>
            <button onClick={() => askSaathi('Walk me through every flagged centre and recommend a remediation playbook for each.')}
              className="px-3 py-1.5 rounded-pill bg-amber-600 text-white text-[11px] font-bold inline-flex items-center gap-1 hover:bg-amber-700">
              <Sparkles className="w-3 h-3" /> Investigate with Saathi
            </button>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-2 rounded-pill border border-bdr bg-white px-3 py-2 max-w-md">
          <Search className="w-4 h-4 text-txt-tertiary" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search centre by name, city, state, or track…"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-txt-tertiary" />
          {query && <button onClick={() => setQuery('')} className="text-[11px] text-txt-secondary">Clear</button>}
        </div>

        {/* Centre grid */}
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-primary mb-2 inline-flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Your Centres ({filteredCentres.length} of {CENTRES.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCentres.map(c => (
              <CentreCard key={c.id} centre={c} onNudge={nudge} onAsk={askSaathi} />
            ))}
            {filteredCentres.length === 0 && (
              <div className="md:col-span-2 rounded-2xl border border-dashed border-bdr-light p-6 text-center text-[12px] text-txt-secondary">
                No centres match. Clear search to see all {CENTRES.length}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const chat = (
    <AvatarCall
      persona="general"
      title="Saathi · TP Rollup"
      useWebSearch={false}
      extraSystem={
        "You are inside the TRAINING PARTNER's Multi-Centre Rollup. The TP is Magic Bus India Foundation (HQ Mumbai, registered 1999) with 10 demo centres across India (Bhopal, Indore, Patna, Ranchi, Jaipur, Lucknow, Kolkata, Bengaluru, Guwahati, Bhubaneswar). " +
        "Total: 85,672 enrolled, 50,824 placed (~67%), avg D90 retention 76%, 1 flagged centre (Guwahati - 49% placement). " +
        "When the user asks an analytic question, scope it to THIS TP only — never compare against other TPs unless asked. Emit ONE chart card + (when a problem is surfaced) an action_panel with concrete nudges / broadcasts / reviews. " +
        "If the user asks about a different module (Enrollment / Placement / Retention / Schemes / Certification), suggest opening that module."
      }
      pendingPrompt={pending}
      threadId={context?.threadId}
      quickAsks={TP_QUICK_ASKS}
    />
  )

  return <ResizableSaathiSplit top={dashboard} bottom={chat} />
}

// ── Centre card ──────────────────────────────────────────────────────────
function CentreCard({ centre, onNudge, onAsk }) {
  const c = centre
  const placeRate = Math.round((c.placed / Math.max(c.trained, 1)) * 100)
  return (
    <div className={`rounded-2xl border ${c.flagged ? 'border-amber-300 bg-amber-50/30' : 'border-bdr-light bg-white'} shadow-card p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] text-txt-primary leading-tight">{c.name}</div>
          <div className="text-[11px] text-txt-secondary mt-0.5 inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {c.city}, {c.state}
          </div>
        </div>
        {c.flagged && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-amber-100 text-amber-800 text-[10px] font-bold flex-shrink-0">
            <AlertTriangle className="w-3 h-3" /> Flagged
          </span>
        )}
      </div>

      {c.flagged && c.flagReason && (
        <div className="mt-2 text-[11px] text-amber-800 bg-amber-100/60 rounded-lg px-2 py-1.5">
          {c.flagReason}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        <KpiSmall label="Enrolled"     value={c.enrolled.toLocaleString('en-IN')} />
        <KpiSmall label="Placed"       value={c.placed.toLocaleString('en-IN')} sub={`${placeRate}%`} />
        <KpiSmall label="D90 Retention" value={`${c.retention90}%`} tone={c.retention90 >= 75 ? 'emerald' : c.retention90 >= 60 ? 'amber' : 'rose'} />
        <KpiSmall label="Quality"      value={`${c.qualityIndex}`}  tone={c.qualityIndex >= 85 ? 'emerald' : c.qualityIndex >= 75 ? 'sky' : 'amber'} />
      </div>

      {/* Tracks */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1.5 inline-flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> {c.tracks.length} tracks
        </div>
        <div className="flex flex-wrap gap-1">
          {c.tracks.map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-pill bg-surface-page text-txt-primary border border-bdr-light">{t}</span>
          ))}
        </div>
      </div>

      {/* Schemes */}
      <div className="mt-2">
        <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1">Schemes</div>
        <div className="flex flex-wrap gap-1">
          {c.schemes.map(s => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-pill bg-primary-light/40 text-primary-dark border border-primary/20">{s}</span>
          ))}
        </div>
      </div>

      {/* Batches */}
      <div className="mt-2 text-[11px] text-txt-secondary">
        Active: <b className="text-txt-primary">{c.activeBatches}</b> ·
        Ongoing: <b className="text-txt-primary">{c.ongoingBatches}</b> ·
        Upcoming: <b className="text-txt-primary">{c.upcomingBatches}</b>
      </div>

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-bdr-light flex items-center gap-1.5 flex-wrap">
        <button onClick={() => onNudge(c, 'placement_filing')}
          className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-pill bg-white border border-bdr text-txt-primary hover:border-primary hover:text-primary">
          <Bell className="w-3 h-3" /> Placement nudge
        </button>
        <button onClick={() => onNudge(c, 'attendance_audit')}
          className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-pill bg-white border border-bdr text-txt-primary hover:border-primary hover:text-primary">
          <Users className="w-3 h-3" /> Attendance audit
        </button>
        <button onClick={() => onNudge(c, 'quality_review')}
          className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-pill bg-white border border-bdr text-txt-primary hover:border-primary hover:text-primary">
          <ShieldCheck className="w-3 h-3" /> Quality review
        </button>
        <button onClick={() => onAsk(`Walk me through ${c.name}'s metrics in depth. Why are the numbers what they are, and what should I do about it?`)}
          className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-pill bg-primary text-white hover:opacity-90 ml-auto">
          <Sparkles className="w-3 h-3" /> Ask Saathi <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

const KPI_SMALL_TONES = {
  primary: 'text-primary-dark',
  emerald: 'text-emerald-700',
  sky:     'text-sky-700',
  amber:   'text-amber-700',
  rose:    'text-rose-700',
}
function KpiSmall({ label, value, sub, tone = 'primary' }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider font-bold text-txt-tertiary">{label}</div>
      <div className={`text-[14px] font-bold leading-tight ${KPI_SMALL_TONES[tone] || KPI_SMALL_TONES.primary}`}>{value}</div>
      {sub && <div className="text-[9px] text-txt-tertiary">{sub}</div>}
    </div>
  )
}
