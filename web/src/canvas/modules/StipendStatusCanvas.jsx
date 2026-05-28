// Trainee · My Stipend — DBT / NAPS disbursal history.
//
// Was a one-liner stub before. Rebuilt with:
//   • Hero summary — total received, last disbursal, # successful / # failed
//   • Per-disbursal cards with scheme, month, amount, status pill, UTR, retries
//   • "Nothing yet" empty state that explains why
//
// Data source: /api/stipends/mine (Trainee-scoped).

import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { CheckCircle2, AlertTriangle, Clock, Hash, Calendar, IndianRupee, Loader2, Wallet, RefreshCw } from 'lucide-react'

const STATE_STYLE = {
  success: { pill: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2,  label: 'Disbursed' },
  pending: { pill: 'bg-amber-100   text-amber-800   border-amber-200',   icon: Clock,         label: 'Pending'   },
  failed:  { pill: 'bg-rose-100    text-rose-800    border-rose-200',    icon: AlertTriangle, label: 'Failed'    },
  retry:   { pill: 'bg-amber-100   text-amber-800   border-amber-200',   icon: RefreshCw,     label: 'Retrying'  },
}

const SCHEME_TONE = {
  PMKVY:            'bg-sky-50      text-sky-800      border-sky-200',
  'DDU-GKY':        'bg-violet-50   text-violet-800   border-violet-200',
  NAPS:             'bg-emerald-50  text-emerald-800  border-emerald-200',
  'PM Vishwakarma': 'bg-fuchsia-50  text-fuchsia-800  border-fuchsia-200',
}

function monthLabel(m) {
  if (!m || !/^\d{4}-\d{2}$/.test(m)) return m || '—'
  const [y, mm] = m.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[Number(mm) - 1] || mm} ${y}`
}

function dateLabel(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return iso }
}

export default function StipendStatusCanvas() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/api/stipends/mine')
      .then(r => setList(r.stipends || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...list].sort((a, b) => {
    const ta = new Date(a.disbursedAt || a.scheduledAt || 0).getTime()
    const tb = new Date(b.disbursedAt || b.scheduledAt || 0).getTime()
    return tb - ta
  })

  const total = sorted.filter(s => s.disbursalState === 'success').reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  const lastDisbursed = sorted.find(s => s.disbursalState === 'success')
  const successCount = sorted.filter(s => s.disbursalState === 'success').length
  const failedCount = sorted.filter(s => s.disbursalState === 'failed').length
  const pendingCount = sorted.filter(s => s.disbursalState === 'pending' || s.disbursalState === 'retry').length

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-pink-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-pink-700 inline-flex items-center gap-1">
          <Wallet className="w-3 h-3" /> Trainee · My Stipend
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">
          {total > 0 ? `₹${total.toLocaleString('en-IN')} received` : 'No stipend yet'}
        </h2>
        <div className="text-[12px] text-txt-secondary mt-1">
          {lastDisbursed
            ? <>Last credit: <b>₹{lastDisbursed.amount?.toLocaleString('en-IN')}</b> on {dateLabel(lastDisbursed.disbursedAt)}{lastDisbursed.utr && <> · UTR <span className="font-mono">{lastDisbursed.utr}</span></>}</>
            : <>DBT / NAPS disbursals show up here once your batch is active and Aadhaar-bank seeding is confirmed.</>}
        </div>

        {sorted.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <SummaryTile label="Successful" value={successCount} tone="emerald" />
            <SummaryTile label="Pending"    value={pendingCount} tone="amber" />
            <SummaryTile label="Failed"     value={failedCount}  tone="rose" />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {loading && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-8 text-center">
            <Loader2 className="w-5 h-5 text-pink-600 animate-spin mx-auto" />
            <div className="text-[13px] text-txt-secondary mt-2">Loading your stipend history…</div>
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-8 text-center">
            <Wallet className="w-6 h-6 text-txt-tertiary mx-auto" />
            <div className="text-[14px] font-bold text-txt-primary mt-2">No stipend records yet</div>
            <div className="text-[12px] text-txt-secondary mt-1 leading-snug max-w-md mx-auto">
              You'll see entries here for every DBT / NAPS / PMKVY stipend the system schedules for you.
              The first credit lands within ~30 days of crossing the attendance threshold for your batch.
            </div>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="space-y-2.5">
            <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary px-1">
              Disbursal history ({sorted.length})
            </div>
            {sorted.map(s => <DisbursalCard key={s.id} stipend={s} />)}
          </div>
        )}

        <div className="text-[10px] text-txt-tertiary px-1 leading-relaxed pt-2">
          Stipends are paid via DBT into your Aadhaar-seeded bank account. If a payment shows as <b>Failed</b>,
          check that Aadhaar is correctly linked to your bank — most failures are Aadhaar-bank mismatches.
        </div>
      </div>
    </div>
  )
}

function DisbursalCard({ stipend: s }) {
  const state = STATE_STYLE[s.disbursalState] || STATE_STYLE.pending
  const SIcon = state.icon
  const schemeCode = s.scheme?.code || '—'
  const schemeTone = SCHEME_TONE[schemeCode] || 'bg-slate-50 text-slate-800 border-slate-200'
  return (
    <div className="rounded-2xl border border-bdr-light bg-white p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-pill border font-bold ${schemeTone}`}>{schemeCode}</span>
            <span className="text-[12px] text-txt-secondary inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {monthLabel(s.month)}
            </span>
          </div>
          {s.scheme?.name && (
            <div className="text-[11px] text-txt-tertiary mt-0.5 truncate">{s.scheme.name}</div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[20px] font-bold text-txt-primary tabular-nums inline-flex items-baseline">
            <IndianRupee className="w-4 h-4 text-txt-secondary mr-0.5" />{(s.amount || 0).toLocaleString('en-IN')}
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill border text-[10px] font-bold mt-0.5 ${state.pill}`}>
            <SIcon className="w-3 h-3" /> {state.label}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-bdr-light/60 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        {s.disbursedAt && <DetailRow icon={Calendar} label="Disbursed on">{dateLabel(s.disbursedAt)}</DetailRow>}
        {!s.disbursedAt && s.scheduledAt && <DetailRow icon={Calendar} label="Scheduled for">{dateLabel(s.scheduledAt)}</DetailRow>}
        {s.utr && <DetailRow icon={Hash} label="UTR" mono>{s.utr}</DetailRow>}
        {s.retryCount > 0 && <DetailRow icon={RefreshCw} label="Retries">{s.retryCount}</DetailRow>}
        {s.failureReason && (
          <div className="md:col-span-2 mt-1 text-[11px] text-rose-700 bg-rose-50 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />
            {s.failureReason}
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, mono, children }) {
  return (
    <div className="flex items-center gap-1.5 text-txt-secondary">
      <Icon className="w-3 h-3 text-txt-tertiary flex-shrink-0" />
      <span className="text-txt-tertiary">{label}:</span>
      <span className={`text-txt-primary font-medium ${mono ? 'font-mono' : ''}`}>{children}</span>
    </div>
  )
}

const SUMMARY_TONE = {
  emerald: { ring: 'border-emerald-200', val: 'text-emerald-700', bg: 'bg-emerald-50/50' },
  amber:   { ring: 'border-amber-200',   val: 'text-amber-700',   bg: 'bg-amber-50/50' },
  rose:    { ring: 'border-rose-200',    val: 'text-rose-700',    bg: 'bg-rose-50/50' },
}
function SummaryTile({ label, value, tone }) {
  const t = SUMMARY_TONE[tone] || SUMMARY_TONE.emerald
  return (
    <div className={`rounded-xl border ${t.ring} ${t.bg} px-3 py-2`}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary">{label}</div>
      <div className={`text-[20px] font-bold leading-tight ${t.val}`}>{value}</div>
    </div>
  )
}
