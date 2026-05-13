// Jobs — NQR-aware job marketplace. The trainee's Skill Passport (job role +
// NSQF level + sector + district) drives the default query, and the AI
// searches NCS / NSDC / NQR / verified employer portals for live openings.
//
// Why NQR-first: NQR (https://www.nqr.gov.in) is the National Qualifications
// Register — authoritative on which job roles are mapped to which sectors
// and awarding bodies. When the trainee asks "which jobs match my QP?", the
// AI can use NQR as the bridge between qualification → job role → openings.

import { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import { Search, Sparkles, Loader2, ExternalLink, IndianRupee, MapPin, Building2, Briefcase, Award, RefreshCw } from 'lucide-react'

const AI_SYSTEM = `You are KSK's jobs assistant. Use web search to find live, verified entry-level / blue-collar / grey-collar job openings in India.

PRIMARY SOURCES (always check first):
- National Qualifications Register (NQR) at https://www.nqr.gov.in/qualifications-search/ — use to identify the QP code + sector + awarding body for the candidate's role, then bridge to jobs that map to those NOS units.
- National Career Service (ncs.gov.in)
- NSDC apprenticeship portal + Skill India Digital Hub
- Verified employer career sites (Reliance, DMart, L&T, Tata, Flipkart, Trent, Vahan etc.)

OUTPUT: 5-8 specific openings. Each line as:
**Job Title** — Employer · location · ₹X-Y k/mo · NSQF L? · QP code if known. Then a one-line eligibility. Then the apply link.

Match the candidate's Skill Passport (job role, NSQF level, sector, district). Prefer openings within 50 km of their district. Cite NQR when you reference a qualification.`

export default function JobsMarketplaceCanvas() {
  const { meExtra } = useApp()
  const t = meExtra?.trainee
  const jr = t?.batch?.track?.jobRoles?.[0]?.jobRole
  const sector = jr?.sector?.name || t?.batch?.track?.sector?.name || ''
  const district = t?.district || ''
  const state = t?.state || ''
  const nsqf = jr?.nsqfLevel
  const qpCode = jr?.code || jr?.qpCode

  // Build the default profile-driven query.
  const profileQuery = [
    jr?.name && `${jr.name} jobs`,
    nsqf && `NSQF L${nsqf}`,
    district && `near ${district}${state ? ', ' + state : ''}`,
  ].filter(Boolean).join(' ')

  const [aiQuery, setAiQuery] = useState(profileQuery || 'Entry-level jobs near me')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiCitations, setAiCitations] = useState([])
  const [partnerJobs, setPartnerJobs] = useState([])
  const firedOnce = useRef(false)

  async function askAi(query) {
    if (!query) return
    setAiBusy(true); setAiAnswer(''); setAiCitations([])
    try {
      const profile = [
        jr?.name      && `Candidate trained as: ${jr.name}`,
        qpCode        && `QP code: ${qpCode}`,
        nsqf          && `NSQF level: ${nsqf}`,
        sector        && `Sector: ${sector}`,
        district      && `Location: ${district}${state ? ', ' + state : ''}`,
        t?.education  && `Education: ${t.education}`,
      ].filter(Boolean).join('\n')
      const finalQuery = profile ? `${query}\n\nSkill Passport:\n${profile}` : query
      const r = await api.post('/api/ai/search', { query: finalQuery, instructions: AI_SYSTEM })
      setAiAnswer(r.text || '(no matching jobs found right now)'); setAiCitations(r.citations || [])
    } catch (e) {
      setAiAnswer('Could not search right now. Please retry in a moment.')
    } finally { setAiBusy(false) }
  }

  // Fire one default search on mount so the trainee lands on results, not an
  // empty page. Also load partner-side seeded jobs as a small fallback strip.
  useEffect(() => {
    if (firedOnce.current) return
    firedOnce.current = true
    askAi(aiQuery)
    api.get('/api/jobs').then(r => setPartnerJobs(r.jobs || [])).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Hero — shows the Skill Passport context up top so the trainee knows the AI is using it */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-teal-50/70 to-white flex-shrink-0">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-teal-700">Find Jobs</div>
        <h2 className="text-[20px] font-bold text-txt-primary leading-tight mt-1">
          {jr?.name ? `Openings matching ${jr.name}` : 'Verified jobs for you'}
        </h2>
        <div className="text-[12px] text-txt-secondary mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {jr?.name   && <PassportChip icon={Briefcase} label={jr.name} />}
          {nsqf       && <PassportChip icon={Award}     label={`NSQF L${nsqf}`} />}
          {sector     && <PassportChip icon={Building2} label={sector} />}
          {district   && <PassportChip icon={MapPin}    label={`${district}${state ? ', ' + state : ''}`} />}
        </div>
      </div>

      {/* Search bar — trainee can tweak the query */}
      <div className="px-5 pt-3 pb-2 flex-shrink-0">
        <form onSubmit={e => { e.preventDefault(); askAi(aiQuery) }} className="flex items-center gap-2 rounded-pill border border-bdr bg-white px-3 py-1.5 shadow-card">
          <Search className="w-4 h-4 text-txt-tertiary flex-shrink-0" />
          <input value={aiQuery} onChange={e => setAiQuery(e.target.value)}
            placeholder="Try: 'Retail Sales Associate Patna 15k+'"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-txt-tertiary" />
          <button type="submit" disabled={!aiQuery.trim() || aiBusy}
            className="px-3 py-1.5 rounded-pill bg-teal-600 text-white text-[12px] font-bold disabled:opacity-60 inline-flex items-center gap-1">
            {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {aiBusy ? 'Searching…' : 'Search live'}
          </button>
        </form>
        <div className="text-[10px] text-txt-tertiary mt-1.5 px-1 inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-teal-600" /> Live search across NCS, NSDC, NQR-mapped roles and verified employer portals.
        </div>
      </div>

      {/* AI result panel — primary surface */}
      <div className="px-5 py-3 flex-1 min-h-0">
        {aiBusy && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600 mx-auto" />
            <div className="text-[13px] text-txt-secondary mt-2">
              Looking up live jobs matching your Skill Passport…
            </div>
          </div>
        )}
        {!aiBusy && aiAnswer && (
          <div className="rounded-2xl bg-white border border-bdr-light p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider font-bold text-teal-700">Live openings</div>
              <button onClick={() => askAi(aiQuery)} className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            <div className="text-[13px] text-txt-primary whitespace-pre-wrap leading-relaxed">{renderMd(aiAnswer)}</div>
            {aiCitations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-bdr-light flex flex-wrap gap-x-3">
                {aiCitations.map((c, i) => (
                  <a key={i} href={c.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[260px]">
                    {c.title || c.url} <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Partner openings strip — small, secondary */}
        {partnerJobs.length > 0 && (
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">KSK partner employers</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {partnerJobs.map(j => <JobCard key={j.id} job={j} />)}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-bdr-light text-[10px] text-txt-tertiary leading-relaxed flex-shrink-0">
        Sources: NQR (qualifications mapping), NCS, NSDC, Skill India Digital Hub + verified employer portals. Apply with one tap using your Skill Passport.
      </div>
    </div>
  )
}

function PassportChip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-white border border-bdr-light text-[11px] text-txt-primary">
      <Icon className="w-3 h-3 text-teal-600" /><span className="font-medium">{label}</span>
    </span>
  )
}

function JobCard({ job }) {
  return (
    <div className="rounded-2xl border border-bdr-light bg-white p-3 hover:shadow-card transition">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13px] text-txt-primary leading-tight truncate">{job.title}</div>
          <div className="text-[11px] text-txt-secondary mt-0.5 truncate">{job.employer?.name} · {job.employer?.sector?.name || 'Verified employer'}</div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] text-txt-secondary">
            <div className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-txt-tertiary" />{job.location}</div>
            <div className="inline-flex items-center gap-1"><IndianRupee className="w-3 h-3 text-txt-tertiary" />₹{job.ctcMonthly?.toLocaleString('en-IN')}/mo</div>
            <div className="text-txt-secondary">{job.openings} open</div>
          </div>
          <button className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-primary text-white text-[11px] font-bold hover:opacity-90">
            Apply with Skill Passport
          </button>
        </div>
      </div>
    </div>
  )
}

function renderMd(s) {
  if (!s) return null
  const out = []
  s.split('\n').forEach((line, i) => {
    if (/^[-*]\s+/.test(line)) out.push(<div key={i} className="flex gap-2"><div className="text-teal-600">•</div><div className="flex-1">{inline(line.replace(/^[-*]\s+/, ''))}</div></div>)
    else if (line.trim() === '') out.push(<div key={i} className="h-2" />)
    else out.push(<div key={i}>{inline(line)}</div>)
  })
  return out
}
function inline(s) {
  const parts = []; const re = /\*\*([^*]+)\*\*/g; let last = 0, m, k = 0
  while ((m = re.exec(s))) { if (m.index > last) parts.push(s.slice(last, m.index)); parts.push(<b key={k++}>{m[1]}</b>); last = m.index + m[0].length }
  if (last < s.length) parts.push(s.slice(last))
  return parts
}
