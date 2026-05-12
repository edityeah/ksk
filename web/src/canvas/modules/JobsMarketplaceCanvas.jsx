// Jobs — AI-powered, queries OpenAI web search across NCS, NAPS, SIDH and
// reputable job portals. Curated quick-queries by sector + location.

import { useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import { Search, Sparkles, ExternalLink, Loader2, MapPin } from 'lucide-react'

const QUICK_QUERIES = [
  { label: '🏪 Retail jobs',      query: 'Verified entry-level retail jobs in India 2026 — Reliance Retail, DMart, Vishal Mega Mart, Lifestyle. Monthly salary, locations, application links.' },
  { label: '📦 Delivery / logistics', query: 'Last-mile delivery and warehouse jobs in India 2026 — Flipkart, Amazon, Delhivery, BlinkIt, Swiggy. Salary and onboarding.' },
  { label: '🩺 Healthcare jobs',  query: 'Entry-level healthcare jobs in India 2026 — General Duty Assistant, ward boy, phlebotomist, home health aide. Hospitals hiring.' },
  { label: '⚡ Electrician',      query: 'Electrician jobs in India 2026 — assistant electrician, wiring technician. L&T, Tata Projects, Schneider, local contractors.' },
  { label: '👩 BPO / call centre', query: 'Customer care executive jobs (voice + non-voice) in India 2026 — Concentrix, Genpact, Teleperformance, Tech Mahindra. Salary, shift, freshers.' },
  { label: '🤝 NAPS apprenticeships', query: 'Best NAPS apprenticeship openings on India\'s Apprenticeship Portal in 2026 — by sector and stipend. How to apply via NSDC.' },
  { label: '🏗️ Construction',     query: 'Construction sector jobs in India 2026 — mason, bar bender, formwork carpenter, plumber. L&T, Shapoorji Pallonji, GMR.' },
  { label: '✂️ Tailoring / apparel', query: 'Sewing machine operator and tailor jobs in India 2026 — Shahi Exports, Arvind, Welspun. Salary, hiring drives, women-friendly.' },
]

const SYSTEM = `You are KSK's jobs assistant. The user is looking for verified entry-level / blue-collar / grey-collar jobs in India.
Use web search to find current openings from:
- National Career Service (ncs.gov.in)
- NSDC's apprenticeship portal
- Skill India Digital Hub (skillindiadigital.gov.in)
- Reputable employer career sites (Reliance Retail, DMart, Flipkart, Amazon, L&T, etc.)
- Job boards: Naukri, Indeed, Apna, Vahan, Workindia

Return a concise markdown list of 5-8 specific job openings. For each include:
- **Job title** at **Employer**
- Location(s)
- Monthly salary range (₹k/mo)
- Eligibility (Class 10/12 / ITI / etc.)
- Apply link or "Apply on NCS"

Prioritise NCS-verified and NSDC-aligned openings. Be honest about freshness — note the date if you can find it.`

export default function JobsMarketplaceCanvas() {
  const { showToast, meExtra } = useApp()
  const traineeLoc = meExtra?.trainee?.district || ''
  const [q, setQ] = useState(traineeLoc ? `Retail jobs near ${traineeLoc}` : '')
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState([])

  async function run(query) {
    if (!query) return
    setBusy(true); setAnswer(''); setCitations([])
    try {
      const r = await api.post('/api/ai/search', { query, instructions: SYSTEM })
      setAnswer(r.text || '(no answer)')
      setCitations(r.citations || [])
    } catch (e) {
      showToast({ kind: 'danger', text: e.payload?.error === 'openai_not_configured' ? 'OpenAI key not set on the server.' : 'Job search failed.' })
    } finally { setBusy(false) }
  }

  return (
    <div className="p-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="mb-4">
        <div className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[2px] text-primary mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Find Jobs · AI + Web Search
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight">Open jobs across India</h2>
        <p className="text-[13px] text-txt-secondary mt-1">
          Live results from NCS, NAPS, SIDH and verified employer career sites.
          {traineeLoc && <> Showing jobs near <b>{traineeLoc}</b>.</>}
        </p>
      </div>

      <form onSubmit={e => { e.preventDefault(); run(q) }} className="flex items-center gap-2 px-3 py-2.5 rounded-pill bg-surface-page border border-bdr-light mb-3">
        <Search className="w-4 h-4 text-txt-tertiary flex-shrink-0" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="e.g. 'plumber jobs in Patna' or 'BPO night shift Bangalore'"
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-txt-tertiary" />
        <button type="submit" disabled={!q.trim() || busy}
          className="px-3 py-1 rounded-pill bg-primary text-white text-[12px] font-bold disabled:bg-slate-300">
          {busy ? '…' : 'Search'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_QUERIES.map(qq => (
          <button key={qq.label} onClick={() => { setQ(qq.query); run(qq.query) }}
            disabled={busy}
            className="text-[12px] font-bold px-3 py-1.5 rounded-pill border border-bdr-light bg-white text-txt-primary hover:border-primary disabled:opacity-50">
            {qq.label}
          </button>
        ))}
      </div>

      {busy && (
        <div className="rounded-2xl border border-bdr-light bg-white p-6 text-center text-txt-secondary text-[13px]">
          <Loader2 className="w-6 h-6 mx-auto mb-2 text-primary animate-spin" />
          Searching NCS, NAPS and employer portals for live openings…
        </div>
      )}
      {!busy && answer && <ResultCard text={answer} citations={citations} />}

      <div className="mt-5 pt-4 border-t border-bdr-light text-[10px] text-txt-tertiary leading-relaxed">
        Results are live web data. Use your Skill Passport when applying — it auto-fills verified credentials.
      </div>
    </div>
  )
}

function ResultCard({ text, citations }) {
  return (
    <div className="rounded-2xl border border-bdr-light bg-white p-5">
      <div className="text-[14px] text-txt-primary leading-relaxed whitespace-pre-wrap">{renderMd(text)}</div>
      {citations?.length > 0 && (
        <div className="mt-4 pt-3 border-t border-bdr-light">
          <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1.5">Sources</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {citations.map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noreferrer"
                className="text-[12px] text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[280px]">
                {c.title} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function renderMd(s) {
  if (!s) return null
  const out = []
  const lines = s.split('\n')
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (/^#{1,3}\s+/.test(line)) {
      const lvl = (line.match(/^#+/) || [''])[0].length
      out.push(<div key={i} className={`font-bold ${lvl === 1 ? 'text-[18px]' : 'text-[15px]'} mt-3 mb-1 text-txt-primary`}>{inline(line.replace(/^#+\s+/, ''))}</div>)
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      out.push(<div key={i} className="flex gap-2 my-0.5"><div className="text-primary mt-0.5">•</div><div className="flex-1">{inline(line.replace(/^[-*]\s+/, ''))}</div></div>)
      continue
    }
    if (line.trim() === '') { out.push(<div key={i} className="h-2" />); continue }
    out.push(<div key={i} className="my-0.5">{inline(line)}</div>)
  }
  return out
}
function inline(s) {
  const parts = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0, m, k = 0
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index))
    parts.push(<b key={k++} className="font-bold text-txt-primary">{m[1]}</b>)
    last = m.index + m[0].length
  }
  if (last < s.length) parts.push(s.slice(last))
  return parts
}
