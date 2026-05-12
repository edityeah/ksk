// Jobs — curated jobs from /api/jobs (seeded) plus an "Ask AI" panel that
// searches live across NCS, NAPS, SIDH and employer portals.

import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import { Search, Sparkles, Loader2, ExternalLink, Wand2, IndianRupee, MapPin, Building2 } from 'lucide-react'

const AI_SYSTEM = `You are KSK's jobs assistant. Use web search to find current entry-level / blue-collar / grey-collar job openings in India from:
- National Career Service (ncs.gov.in)
- NSDC's apprenticeship portal
- Skill India Digital Hub
- Reputable employer career sites (Reliance, DMart, L&T, Tata, Flipkart, etc.)
- Verified job boards (Apna, Naukri, Vahan, Workindia)

Return 5-8 specific openings with: job title, employer (bold), location, monthly salary range (₹k/mo), eligibility, and apply link. Prefer NCS-verified and NSDC-aligned openings.`

export default function JobsMarketplaceCanvas() {
  const { showToast, meExtra } = useApp()
  const traineeLoc = meExtra?.trainee?.district || ''

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiQuery, setAiQuery] = useState(traineeLoc ? `Retail jobs near ${traineeLoc}` : '')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiCitations, setAiCitations] = useState([])
  const [showAi, setShowAi] = useState(false)

  useEffect(() => {
    api.get('/api/jobs').then(r => setJobs(r.jobs || [])).finally(() => setLoading(false))
  }, [])

  async function askAi(query) {
    if (!query) return
    setAiBusy(true); setAiAnswer(''); setAiCitations([])
    try {
      const r = await api.post('/api/ai/search', { query, instructions: AI_SYSTEM })
      setAiAnswer(r.text || '(no answer)'); setAiCitations(r.citations || [])
    } catch (e) {
      showToast({ kind: 'danger', text: e.payload?.error === 'openai_not_configured' ? 'OpenAI key not set.' : 'AI search failed.' })
    } finally { setAiBusy(false) }
  }

  return (
    <div className="p-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="mb-3">
        <div className="text-[12px] font-bold uppercase tracking-[2px] text-primary mb-1">Find Jobs</div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight">Open jobs in your sector</h2>
        <p className="text-[12px] text-txt-secondary mt-0.5">
          {jobs.length} verified openings from KSK partner employers.
          {traineeLoc && <> Showing jobs near <b>{traineeLoc}</b>.</>}
        </p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary">Partner openings</div>
        <button onClick={() => setShowAi(s => !s)} className="inline-flex items-center gap-1 text-primary font-bold text-[12px]">
          <Wand2 className="w-3.5 h-3.5" /> {showAi ? 'Hide AI search' : 'Search the web with AI'}
        </button>
      </div>

      {/* AI panel */}
      {showAi && (
        <div className="mb-4 rounded-2xl border border-primary-light bg-primary-light/30 p-3">
          <form onSubmit={e => { e.preventDefault(); askAi(aiQuery) }} className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <input value={aiQuery} onChange={e => setAiQuery(e.target.value)}
              placeholder="e.g. 'plumber jobs Patna' or 'BPO night shift Bangalore'"
              className="flex-1 bg-white border border-bdr-light rounded-pill px-3 py-1.5 text-[13px] outline-none" />
            <button type="submit" disabled={!aiQuery.trim() || aiBusy}
              className="px-3 py-1.5 rounded-pill bg-primary text-white text-[12px] font-bold disabled:bg-slate-300">
              {aiBusy ? '…' : 'Search live'}
            </button>
          </form>
          {aiBusy && (
            <div className="mt-3 text-center text-txt-secondary text-[13px] inline-flex items-center justify-center gap-2 w-full">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Searching NCS, NAPS and employer portals…
            </div>
          )}
          {!aiBusy && aiAnswer && (
            <div className="mt-3 rounded-2xl bg-white border border-bdr-light p-3">
              <div className="text-[13px] text-txt-primary whitespace-pre-wrap leading-relaxed">{renderMd(aiAnswer)}</div>
              {aiCitations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-bdr-light flex flex-wrap gap-x-3">
                  {aiCitations.map((c, i) => (
                    <a key={i} href={c.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[260px]">
                      {c.title} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Curated jobs */}
      <div className="space-y-2.5">
        {loading && <div className="text-sm text-txt-secondary">Loading jobs…</div>}
        {!loading && jobs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page p-6 text-center text-txt-secondary text-sm">No partner jobs open right now — try AI search above.</div>
        )}
        {jobs.map(j => <JobCard key={j.id} job={j} />)}
      </div>

      <div className="mt-5 pt-4 border-t border-bdr-light text-[10px] text-txt-tertiary leading-relaxed">
        Verified KSK partner employers + AI-powered live web search across NCS, NAPS, SIDH and employer portals. Use your Skill Passport to apply in one tap.
      </div>
    </div>
  )
}

function JobCard({ job }) {
  return (
    <div className="rounded-2xl border border-bdr-light bg-white p-4 hover:shadow-card transition">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] text-txt-primary leading-tight">{job.title}</div>
          <div className="text-[12px] text-txt-secondary mt-0.5 truncate">{job.employer?.name} · {job.employer?.sector?.name || 'Verified employer'}</div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-[12px] text-txt-secondary">
            <div className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-txt-tertiary" />{job.location}</div>
            <div className="inline-flex items-center gap-1"><IndianRupee className="w-3 h-3 text-txt-tertiary" />₹{job.ctcMonthly?.toLocaleString('en-IN')}/mo</div>
            <div className="text-txt-secondary">{job.openings} opening{job.openings === 1 ? '' : 's'}</div>
          </div>
          <button className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-primary text-white text-[12px] font-bold hover:opacity-90">
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
    if (/^[-*]\s+/.test(line)) out.push(<div key={i} className="flex gap-2"><div className="text-primary">•</div><div className="flex-1">{inline(line.replace(/^[-*]\s+/, ''))}</div></div>)
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
