// Discover Courses — AI-powered, queries OpenAI's web_search_preview tool
// against PMKVY / NSDC / Skill India sources. Curated category chips seed
// common searches; the user can also free-search.

import { useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import { Search, Sparkles, ExternalLink, Loader2 } from 'lucide-react'

const QUICK_QUERIES = [
  { label: '⭐ Most popular',     query: 'Most popular PMKVY 4.0 skilling courses in India in 2026, with NSQF level, duration and indicative placement salaries.' },
  { label: '🌱 Green skills',     query: 'Top NSDC green-skills courses in 2026 — solar, EV mechanic, green hydrogen, sustainable agriculture. Include duration, NSQF level, and stipend.' },
  { label: '🚀 Future-ready',     query: 'FutureSkills Prime courses on AI, cybersecurity, cloud, IoT and data science available in India 2026. Include free options.' },
  { label: '🏫 ITI / PM SETU',    query: 'ITI courses under PM SETU 2026 — electrician, plumber, welder, mechanic — admission process, duration and stipend.' },
  { label: '🩺 Healthcare',       query: 'NSDC healthcare skilling courses 2026: GDA, phlebotomist, home health aide, lab technician. Duration, eligibility, placement.' },
  { label: '👩 Women-friendly',   query: 'PMKVY and DDU-GKY skilling courses recommended for women in 2026 — beauty therapist, sewing operator, BPO, healthcare.' },
  { label: '🤝 Apprenticeships',  query: 'NAPS National Apprenticeship Promotion Scheme 2026 — best apprenticeship opportunities, monthly stipends, top employers in India.' },
  { label: '🏗️ Construction',     query: 'NSDC construction sector skilling courses in India 2026 — mason, bar bender, plumber, electrician, with NSQF levels and wages.' },
]

const SYSTEM = `You are KSK's course discovery assistant. The user is looking for skilling courses in India.
Use web search to find current, accurate information from NSDC, MSDE, PMKVY, DDU-GKY, NAPS, Skill India Digital Hub, FutureSkills Prime, sector skill councils, ITI catalogues, and state skilling missions.

Return a concise markdown list of 5-10 specific courses. For each course include:
- **Course name** (bold)
- Sector · NSQF level · Duration
- Scheme (PMKVY / DDU-GKY / NAPS / FSP / PM SETU / SAMARTH / etc.)
- Eligibility (one line)
- Expected monthly stipend or placement CTC (₹k/mo if available)
- Where to enrol (training partner type or specific provider)

Be honest about what you don't know. Prefer official sources (msde.gov.in, nsdcindia.org, skillindiadigital.gov.in, ncs.gov.in, ITI directorate sites).`

export default function CourseDiscoveryCanvas() {
  const { showToast } = useApp()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState([])
  const [history, setHistory] = useState([])

  async function run(query) {
    if (!query) return
    setBusy(true); setAnswer(''); setCitations([])
    try {
      const r = await api.post('/api/ai/search', { query, instructions: SYSTEM })
      setAnswer(r.text || '(no answer)')
      setCitations(r.citations || [])
      setHistory(h => [{ q: query, text: r.text, citations: r.citations || [] }, ...h].slice(0, 6))
    } catch (e) {
      showToast({ kind: 'danger', text: e.payload?.error === 'openai_not_configured' ? 'OpenAI key not set on the server.' : 'Search failed.' })
    } finally { setBusy(false) }
  }

  return (
    <div className="p-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="mb-4">
        <div className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[2px] text-primary mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Discover Courses · AI + Web Search
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight">Find your next skilling course</h2>
        <p className="text-[13px] text-txt-secondary mt-1">Real-time results across NSDC, MSDE, PMKVY 4.0, DDU-GKY, NAPS, FutureSkills Prime, PM SETU and sector skill councils.</p>
      </div>

      {/* Search bar */}
      <form onSubmit={e => { e.preventDefault(); run(q) }} className="flex items-center gap-2 px-3 py-2.5 rounded-pill bg-surface-page border border-bdr-light mb-3">
        <Search className="w-4 h-4 text-txt-tertiary flex-shrink-0" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="e.g. 'best plumber course in Bihar' or 'EV mechanic with stipend'"
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-txt-tertiary" />
        <button type="submit" disabled={!q.trim() || busy}
          className="px-3 py-1 rounded-pill bg-primary text-white text-[12px] font-bold disabled:bg-slate-300">
          {busy ? '…' : 'Search'}
        </button>
      </form>

      {/* Quick queries */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_QUERIES.map(qq => (
          <button key={qq.label} onClick={() => { setQ(qq.query); run(qq.query) }}
            disabled={busy}
            className="text-[12px] font-bold px-3 py-1.5 rounded-pill border border-bdr-light bg-white text-txt-primary hover:border-primary disabled:opacity-50">
            {qq.label}
          </button>
        ))}
      </div>

      {/* Result */}
      {busy && (
        <div className="rounded-2xl border border-bdr-light bg-white p-6 text-center text-txt-secondary text-[13px]">
          <Loader2 className="w-6 h-6 mx-auto mb-2 text-primary animate-spin" />
          Searching NSDC & MSDE for current courses…
        </div>
      )}
      {!busy && answer && (
        <ResultCard text={answer} citations={citations} />
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">Earlier searches</div>
          <div className="space-y-2">
            {history.slice(1).map((h, i) => (
              <details key={i} className="rounded-2xl border border-bdr-light bg-white">
                <summary className="cursor-pointer px-4 py-2.5 text-[13px] font-bold text-txt-primary">{h.q}</summary>
                <div className="px-4 pb-3"><ResultCard text={h.text} citations={h.citations} compact /></div>
              </details>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-bdr-light text-[10px] text-txt-tertiary leading-relaxed">
        Powered by OpenAI gpt-4o web search. Results are live — always verify scheme details on the official MSDE / NSDC portal before applying.
      </div>
    </div>
  )
}

function ResultCard({ text, citations, compact = false }) {
  return (
    <div className={`rounded-2xl border border-bdr-light bg-white ${compact ? 'p-3' : 'p-5'}`}>
      <div className="prose prose-sm max-w-none text-[14px] text-txt-primary leading-relaxed whitespace-pre-wrap">
        {renderMd(text)}
      </div>
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

// Minimal markdown renderer — bold + bullets only (keeps the component dep-free).
function renderMd(s) {
  if (!s) return null
  const out = []
  const lines = s.split('\n')
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    // headings
    if (/^#{1,3}\s+/.test(line)) {
      const lvl = (line.match(/^#+/) || [''])[0].length
      const text = line.replace(/^#+\s+/, '')
      out.push(<div key={i} className={`font-bold ${lvl === 1 ? 'text-[18px]' : 'text-[15px]'} mt-3 mb-1 text-txt-primary`}>{inline(text)}</div>)
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
