// Trainer · Assessment Scanner — View / Dashboard
//
// Reads back every assessment the current trainer has captured. Two lenses:
//   1. Headline row — total count, average %, grade distribution
//   2. Per-batch averages + top/bottom trainee movers
//   3. Recent activity list — expandable to see the scanned image + score
//
// Data source: GET /api/trainer-assessments/stats (aggregates) and
// GET /api/trainer-assessments?batchId=… (list).

import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import {
  Loader2, ClipboardList, TrendingUp, TrendingDown, Users, Filter,
  ScanLine, ChevronDown, RefreshCw, Sparkles, Camera, Trash2,
} from 'lucide-react'

// Colour bands per grade — used in the distribution + trainee cards.
const GRADE_TONE = {
  'A+': 'bg-emerald-500  text-white',
  'A':  'bg-emerald-400  text-white',
  'B+': 'bg-sky-400      text-white',
  'B':  'bg-sky-300      text-slate-900',
  'C':  'bg-amber-300    text-slate-900',
  'D':  'bg-orange-400   text-white',
  'F':  'bg-rose-500     text-white',
}
const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']

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

export default function TrainerAssessmentViewCanvas() {
  const { showToast, openCanvas } = useApp()
  const [stats, setStats]     = useState(null)
  const [rows,  setRows]      = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [batchFilter, setBatchFilter] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const [s, l] = await Promise.all([
        api.get('/api/trainer-assessments/stats'),
        api.get('/api/trainer-assessments?limit=200'),
      ])
      setStats(s)
      setRows(l?.assessments || [])
    } catch (e) {
      setError(e?.message || 'load_failed')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filteredRows = useMemo(
    () => (batchFilter ? rows.filter(r => r.batchId === batchFilter) : rows),
    [rows, batchFilter],
  )

  async function deleteRow(id) {
    if (!confirm('Delete this assessment entry? This can\'t be undone.')) return
    try {
      await api.del(`/api/trainer-assessments/${id}`)
      setRows(prev => prev.filter(r => r.id !== id))
      showToast?.({ msg: 'Deleted', type: 'success' })
    } catch (e) {
      showToast?.({ msg: e?.message || 'Delete failed', type: 'error' })
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-amber-50/70 via-white to-white border-b border-bdr-light">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-[11px] font-bold uppercase tracking-[2px] text-amber-700 inline-flex items-center gap-1">
              <ScanLine className="w-3 h-3" /> Trainer · Assessment Dashboard
            </div>
            <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">
              {stats?.total ? `${stats.total} assessments captured` : 'No assessments yet'}
            </h2>
            <div className="text-[12px] text-txt-secondary mt-1 max-w-2xl">
              {stats?.total
                ? <>Class average <b>{stats.avgPct}%</b> across your batches. Everything you scan or enter manually appears here — click any row to see the original paper.</>
                : <>Head over to Capture to scan your first paper. Anything you save will show up here.</>}
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-white border border-bdr text-[11px] text-txt-secondary hover:bg-slate-50">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading && (
          <div className="text-center text-[13px] text-txt-secondary py-8 inline-flex items-center gap-2 mx-auto">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your dashboard…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 text-[13px] text-rose-700">
            Couldn't load stats: <span className="font-mono text-[11px]">{error}</span>
          </div>
        )}

        {!loading && !error && stats && stats.total === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/30 p-8 text-center">
            <ClipboardList className="w-6 h-6 text-txt-tertiary mx-auto" />
            <div className="text-[14px] font-bold text-txt-primary mt-2">Nothing to show yet</div>
            <div className="text-[12px] text-txt-secondary mt-1 max-w-md mx-auto">
              Capture your first assessment from the Capture module. Once you save a scan, the results will land on this dashboard.
            </div>
            <button
              onClick={() => openCanvas({ type: 'trainer_assessment_capture' })}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-amber-600 text-white text-[12px] font-bold hover:bg-amber-700">
              <Camera className="w-3.5 h-3.5" /> Start capturing
            </button>
          </div>
        )}

        {!loading && !error && stats && stats.total > 0 && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Kpi label="Assessments"  value={stats.total} />
              <Kpi label="Class average" value={`${stats.avgPct}%`} accent />
              <Kpi label="Batches"      value={stats.perBatch.length} />
              <Kpi label="Highest ever" value={`${Math.max(...rows.map(r => r.percentage)).toFixed(0)}%`} />
            </div>

            {/* Grade distribution */}
            <Section title="Grade distribution">
              <GradeDistribution grades={stats.grades} total={stats.total} />
            </Section>

            {/* Per-batch averages */}
            <Section title="By batch" right={
              stats.perBatch.length > 1 ? (
                <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
                  className="text-[11px] border border-bdr rounded-pill px-2 py-1 bg-white">
                  <option value="">All batches</option>
                  {stats.perBatch.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
                </select>
              ) : null
            }>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {stats.perBatch.map(b => <BatchTile key={b.id} b={b} />)}
              </div>
            </Section>

            {/* Top / Bottom movers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Section title="Top performers" icon={TrendingUp} tone="emerald">
                <TraineeList trainees={stats.topTrainees} tone="emerald" />
              </Section>
              <Section title="Need attention" icon={TrendingDown} tone="rose">
                <TraineeList trainees={stats.bottomTrainees} tone="rose" />
              </Section>
            </div>

            {/* Recent activity */}
            <Section title={`Recent activity (${filteredRows.length})`}
              right={
                <button onClick={() => { try { window.__ksk?.openCanvas?.({ type: 'trainer_assessment_capture' }) } catch {} }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700">
                  <Camera className="w-3 h-3" /> Capture more
                </button>
              }>
              <div className="space-y-2">
                {filteredRows.length === 0 && (
                  <div className="text-[12px] text-txt-tertiary text-center py-4">
                    No entries for this batch yet.
                  </div>
                )}
                {filteredRows.map(r => <AssessmentRow key={r.id} row={r} onDelete={() => deleteRow(r.id)} />)}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Kpi({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border ${accent ? 'border-amber-200 bg-amber-50/60' : 'border-bdr-light bg-white'} px-3 py-2.5`}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary">{label}</div>
      <div className={`text-[20px] font-bold tabular-nums mt-0.5 ${accent ? 'text-amber-800' : 'text-txt-primary'}`}>{value}</div>
    </div>
  )
}

function Section({ title, right, icon: Icon, tone, children }) {
  const t = tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : 'text-txt-secondary'
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className={`text-[11px] uppercase tracking-wider font-bold ${t} inline-flex items-center gap-1.5`}>
          {Icon && <Icon className="w-3 h-3" />}
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function GradeDistribution({ grades, total }) {
  // Compact stacked bar — each grade a coloured slot proportional to count.
  return (
    <div className="rounded-2xl border border-bdr-light bg-white p-3">
      <div className="flex h-4 rounded-full overflow-hidden ring-1 ring-slate-100">
        {GRADE_ORDER.map(g => {
          const n = grades[g] || 0
          if (n === 0) return null
          const pct = (n / total) * 100
          return (
            <div key={g} className={GRADE_TONE[g]} style={{ width: `${pct}%` }} title={`${g}: ${n}`} />
          )
        })}
      </div>
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mt-3">
        {GRADE_ORDER.map(g => (
          <div key={g} className="flex items-center gap-1.5 text-[11px]">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${GRADE_TONE[g]}`} />
            <span className="font-bold text-txt-primary">{g}</span>
            <span className="text-txt-tertiary tabular-nums">{grades[g] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BatchTile({ b }) {
  return (
    <div className="rounded-2xl border border-bdr-light bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-[13px] text-txt-primary truncate">{b.code}</div>
          <div className="text-[11px] text-txt-secondary truncate">{b.name}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[20px] font-bold text-txt-primary tabular-nums">{b.avgPct}%</div>
          <div className="text-[10px] text-txt-tertiary">avg</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-txt-secondary inline-flex items-center gap-1">
        <ClipboardList className="w-3 h-3 text-txt-tertiary" />
        {b.count} assessment{b.count === 1 ? '' : 's'} captured
      </div>
    </div>
  )
}

function TraineeList({ trainees, tone }) {
  const bar = tone === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'
  return (
    <div className="rounded-2xl border border-bdr-light bg-white p-2 space-y-1.5">
      {trainees.length === 0 && (
        <div className="text-[11px] text-txt-tertiary py-3 text-center">Not enough data yet.</div>
      )}
      {trainees.map(t => (
        <div key={t.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50">
          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold inline-flex items-center justify-center flex-shrink-0">
            {(t.name || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-bold text-txt-primary truncate">{t.name}</div>
            <div className="text-[10.5px] text-txt-tertiary">{t.count} scan{t.count === 1 ? '' : 's'} · latest {t.latest}%</div>
          </div>
          <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
            <div className={`h-full ${bar}`} style={{ width: `${t.avgPct}%` }} />
          </div>
          <div className="text-[11px] font-bold text-txt-primary tabular-nums w-9 text-right">{t.avgPct}%</div>
        </div>
      ))}
    </div>
  )
}

function AssessmentRow({ row, onDelete }) {
  const [open, setOpen] = useState(false)
  const [imgLoading, setImgLoading] = useState(false)
  const [img, setImg] = useState(null)

  async function toggle() {
    const next = !open
    setOpen(next)
    // Lazy-load the scanned image body only when a row expands. The list
    // endpoint returns `hasScanImage`; we hit a small helper endpoint to
    // fetch the actual data URL. For now we don't expose an image-only
    // endpoint, so we just skip inline preview if hasScanImage is true
    // and leave the row expanded with metadata.
    if (next && row.hasScanImage && !img && !imgLoading) {
      setImgLoading(true)
      try {
        // No dedicated route; the frontend uses the already-persisted
        // metadata. If we ever add a GET /:id endpoint that returns
        // scanImage, wire it here.
      } finally { setImgLoading(false) }
    }
  }

  return (
    <div className="rounded-2xl border border-bdr-light bg-white overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
        <span className={`px-2 py-0.5 rounded-pill text-[10px] font-bold ${GRADE_TONE[row.grade || 'F']}`}>
          {row.grade || '—'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-txt-primary truncate">{row.traineeName}</div>
          <div className="text-[11px] text-txt-secondary truncate">
            {row.title} · {row.batchCode}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[14px] font-bold text-txt-primary tabular-nums">
            {row.scoredMarks}<span className="text-txt-tertiary text-[11px]">/{row.totalMarks}</span>
          </div>
          <div className="text-[10px] text-txt-tertiary">{relativeTime(row.conductedAt)}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-txt-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-bdr-light bg-slate-50/60 text-[11px] text-txt-secondary flex flex-wrap items-center gap-3">
          <span>Percentage: <b>{row.percentage}%</b></span>
          <span>Method: <b>{row.method === 'scan' ? <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> OCR</span> : 'Manual'}</b></span>
          {row.ocrConfidence != null && <span>OCR confidence: <b>{(row.ocrConfidence * 100).toFixed(0)}%</b></span>}
          {row.hasScanImage && <span className="italic text-txt-tertiary">Scan saved</span>}
          <button onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-rose-600 hover:underline">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}
