// TC drilldown page — replaces the dashboard inside the Saathi split when
// a KPI tile is clicked on the Demand Board. Replaces the previous modal
// flow with a full-canvas page that mirrors the TP-side pattern.
//
// Four entry metrics: planned, allocated, confirmed, ratio. "Edit plan" is
// available from any view; saving recomputes and returns to the entry view.

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft, BookOpen, Layers, ShieldCheck, Target, Edit3, CheckCircle2,
  Trash2, Plus, Clock, X,
} from 'lucide-react'
import {
  getPlannedTracks, writePlannedTracks, resetPlannedTracks, hasPlanOverride,
  centreAllocationByRole, centreDemandAlignment, auditForCentre,
  ratioBand,
} from './data.js'

const VIEWS = {
  planned:   { title: 'Planned enrolment by track',  icon: BookOpen,    accent: 'sky' },
  allocated: { title: 'Slot allocation by role',     icon: Layers,      accent: 'primary' },
  confirmed: { title: 'Slot confirmation by role',   icon: ShieldCheck, accent: 'emerald' },
  ratio:     { title: 'Demand ratio per track',      icon: Target,      accent: 'emerald' },
}

const ACCENT = {
  sky:     { eyebrow: 'text-sky-700',      iconColor: 'text-sky-700',     tabOn: 'border-sky-600 text-sky-700 font-bold' },
  primary: { eyebrow: 'text-primary-dark', iconColor: 'text-primary-dark',tabOn: 'border-primary text-primary font-bold' },
  emerald: { eyebrow: 'text-emerald-700',  iconColor: 'text-emerald-700', tabOn: 'border-emerald-600 text-emerald-700 font-bold' },
}

const SHORT = { planned: 'Planned', allocated: 'Allocated', confirmed: 'Confirmed', ratio: 'Ratio' }

export default function TcDrilldownPage({
  view: initialView,
  centre,
  summary,
  totalConfirmed,
  totalRatio,
  version,
  onBack,
  onSavePlan,
  onResetPlan,
  isOverridden,
}) {
  const [view, setView] = useState(initialView)
  const [editing, setEditing] = useState(false)
  const [originView, setOriginView] = useState(null)

  const tracks = useMemo(() => getPlannedTracks(centre?.id), [centre?.id, version])
  const byRole = useMemo(() => centreAllocationByRole(centre?.id), [centre?.id, version])
  const alignment = useMemo(() => centreDemandAlignment(centre?.id), [centre?.id, version])
  const audit = useMemo(() => auditForCentre(centre?.id), [centre?.id, version])

  const [draft, setDraft] = useState(tracks)
  useEffect(() => { setDraft(tracks) }, [tracks])

  const v = VIEWS[view] || VIEWS.planned
  const Icon = v.icon
  const vAccent = ACCENT[v.accent] || ACCENT.primary

  const suggestedRoles = byRole
    .filter(r => !draft.find(d => d.role === r.role))
    .map(r => ({ role: r.role, sector: r.sector }))

  function enterEdit() {
    if (view !== 'planned') setOriginView(view)
    setView('planned')
    setEditing(true)
  }
  function exitEdit() {
    setEditing(false)
    if (originView) { setView(originView); setOriginView(null) }
    setDraft(tracks)
  }
  function commitSave() {
    onSavePlan?.(draft)
    setEditing(false)
    if (originView) { setView(originView); setOriginView(null) }
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* Sticky header */}
      <div className="px-5 pt-4 pb-3 border-b border-bdr-light sticky top-0 bg-white z-10">
        <button onClick={onBack}
          className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline mb-2">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Demand Board
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className={`w-4 h-4 ${vAccent.iconColor} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] uppercase tracking-wider font-bold ${vAccent.eyebrow} inline-flex items-center gap-2`}>
                {centre?.name}
                {isOverridden && (
                  <span className="px-1.5 py-0.5 rounded-pill bg-amber-100 text-amber-800 text-[9px] font-bold">Custom plan</span>
                )}
              </div>
              <h2 className="text-[20px] font-bold text-txt-primary leading-tight">{v.title}</h2>
              <div className="text-[11px] text-txt-tertiary">
                {view === 'planned'   && `${summary.plannedEnrol} trainees across ${tracks.length} tracks`}
                {view === 'allocated' && `${summary.allocated} slots from ${byRole.length} role types`}
                {view === 'confirmed' && `${totalConfirmed} confirmed across ${byRole.length} role types`}
                {view === 'ratio'     && `Overall ${totalRatio?.toFixed(2)}× across ${alignment.length} tracks`}
                {originView && editing && <span className="ml-2 text-amber-700">· Editing, will return to {VIEWS[originView].title.toLowerCase()} after save</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!editing && (
              <button onClick={enterEdit}
                className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-emerald-600 text-white font-bold hover:opacity-90">
                <Edit3 className="w-3 h-3" /> Edit plan
              </button>
            )}
            {!editing && isOverridden && (
              <button onClick={onResetPlan}
                className="text-[10px] text-txt-secondary hover:text-rose-700 underline">
                Reset to default
              </button>
            )}
          </div>
        </div>

        {/* Metric tabs (always visible) */}
        <div className="mt-3 flex items-center gap-1 border-b border-bdr-light -mb-3">
          {Object.entries(VIEWS).map(([id, meta]) => {
            const a = ACCENT[meta.accent] || ACCENT.primary
            return (
              <button key={id} onClick={() => setView(id)}
                className={`text-[11px] px-3 py-1.5 inline-flex items-center gap-1.5 border-b-2 ${view === id ? a.tabOn : 'border-transparent text-txt-secondary hover:text-txt-primary'}`}>
                <meta.icon className="w-3 h-3" /> {SHORT[id]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {view === 'planned' && !editing && <Planned tracks={tracks} />}
        {view === 'planned' &&  editing && (
          <PlannedEditor draft={draft} setDraft={setDraft} suggestedRoles={suggestedRoles} />
        )}
        {view === 'allocated' && <Supply byRole={byRole} mode="allocated" />}
        {view === 'confirmed' && <Supply byRole={byRole} mode="confirmed" />}
        {view === 'ratio'     && <Ratio alignment={alignment} />}

        {view === 'planned' && !editing && audit.length > 0 && <AuditHistory events={audit} />}
      </div>

      {/* Sticky footer (edit-mode actions) */}
      {editing && (
        <div className="px-5 py-3 border-t border-bdr-light bg-surface-page/40 sticky bottom-0 flex items-center justify-end gap-2">
          <button onClick={exitEdit}
            className="text-[12px] px-3 py-1.5 rounded-pill text-txt-secondary">Cancel</button>
          <button onClick={commitSave}
            className="text-[12px] px-3 py-1.5 rounded-pill bg-emerald-600 text-white font-bold hover:opacity-90 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Save plan
          </button>
        </div>
      )}
    </div>
  )
}

// ── Inner components ─────────────────────────────────────────────────────

function Planned({ tracks }) {
  if (tracks.length === 0) return <div className="text-[12px] text-txt-secondary">No planned tracks for this centre yet.</div>
  const total = tracks.reduce((s, x) => s + x.seats, 0)
  return (
    <div className="rounded-2xl border border-bdr-light bg-white overflow-hidden">
      <table className="w-full text-[12px]">
        <thead className="bg-surface-page/50 text-[10px] uppercase tracking-wider text-txt-secondary">
          <tr>
            <th className="text-left px-3 py-2">Track · Job role</th>
            <th className="text-left px-3 py-2">Sector</th>
            <th className="text-right px-3 py-2">Seats</th>
            <th className="text-right px-3 py-2">% of total</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((t, i) => {
            const pct = total ? Math.round((t.seats / total) * 100) : 0
            return (
              <tr key={i} className="border-t border-bdr-light/60">
                <td className="px-3 py-2 font-medium text-txt-primary">{t.role}</td>
                <td className="px-3 py-2 text-txt-secondary">{t.sector}</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold">{t.seats}</td>
                <td className="px-3 py-2 text-right tabular-nums text-txt-secondary">{pct}%</td>
              </tr>
            )
          })}
          <tr className="border-t-2 border-bdr-light bg-surface-page/30">
            <td className="px-3 py-2 font-bold text-txt-primary" colSpan={2}>Total</td>
            <td className="px-3 py-2 text-right tabular-nums font-bold text-txt-primary">{total}</td>
            <td className="px-3 py-2 text-right tabular-nums text-txt-tertiary">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PlannedEditor({ draft, setDraft, suggestedRoles }) {
  const [newRole, setNewRole] = useState('')
  const [newSector, setNewSector] = useState('')
  const [newSeats, setNewSeats] = useState(20)

  const setSeats = (i, val) => setDraft(d => d.map((t, idx) => idx === i ? { ...t, seats: Math.max(0, Number(val) || 0) } : t))
  const remove   = (i) => setDraft(d => d.filter((_, idx) => idx !== i))
  const add = (role, sector, seats) => {
    if (!role.trim() || !seats) return
    setDraft(d => [...d, { role: role.trim(), sector: sector.trim() || 'Unspecified', seats: Number(seats) }])
  }
  const submitNew = () => {
    add(newRole, newSector, newSeats)
    setNewRole(''); setNewSector(''); setNewSeats(20)
  }
  const total = draft.reduce((s, t) => s + (Number(t.seats) || 0), 0)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-white text-[10px] uppercase tracking-wider text-txt-secondary border-b border-bdr-light">
            <tr>
              <th className="text-left px-3 py-2">Track · Job role</th>
              <th className="text-left px-3 py-2">Sector</th>
              <th className="text-right px-3 py-2">Seats</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {draft.map((t, i) => (
              <tr key={i} className="border-t border-bdr-light/60">
                <td className="px-3 py-2 font-medium text-txt-primary">{t.role}</td>
                <td className="px-3 py-2 text-txt-secondary">{t.sector}</td>
                <td className="px-3 py-2 text-right">
                  <input type="number" min="0" value={t.seats} onChange={e => setSeats(i, e.target.value)}
                    className="w-20 text-right rounded border border-bdr px-2 py-1 text-[12px] outline-none focus:border-emerald-500 tabular-nums" />
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => remove(i)} className="text-rose-700 hover:bg-rose-50 rounded p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {draft.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-[12px] text-txt-secondary">No tracks. Add one below.</td></tr>
            )}
            <tr className="border-t-2 border-bdr-light bg-white">
              <td className="px-3 py-2 font-bold text-txt-primary" colSpan={2}>New total</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700">{total}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {suggestedRoles.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1">
            Add from supplied roles (HQ has allocations for these but you haven't planned them yet)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedRoles.map(s => (
              <button key={s.role} onClick={() => add(s.role, s.sector, 20)}
                className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-pill bg-white border border-sky-300 text-sky-800 hover:bg-sky-50">
                <Plus className="w-3 h-3" /> {s.role} · {s.sector}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-bdr-light bg-white p-3">
        <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">Or add a new track manually</div>
        <div className="grid grid-cols-12 gap-2">
          <input value={newRole} onChange={e => setNewRole(e.target.value)}
            placeholder="Job role"
            className="col-span-6 rounded-lg border border-bdr bg-white px-2 py-1.5 text-[12px] outline-none focus:border-emerald-500" />
          <input value={newSector} onChange={e => setNewSector(e.target.value)}
            placeholder="Sector"
            className="col-span-3 rounded-lg border border-bdr bg-white px-2 py-1.5 text-[12px] outline-none focus:border-emerald-500" />
          <input type="number" min="0" value={newSeats} onChange={e => setNewSeats(Number(e.target.value) || 0)}
            placeholder="Seats"
            className="col-span-2 rounded-lg border border-bdr bg-white px-2 py-1.5 text-[12px] outline-none focus:border-emerald-500 tabular-nums" />
          <button onClick={submitNew} disabled={!newRole.trim() || !newSeats}
            className="col-span-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:opacity-90 disabled:opacity-40 inline-flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function Supply({ byRole, mode }) {
  if (byRole.length === 0) return <div className="text-[12px] text-txt-secondary">No allocations from TP HQ yet for this centre.</div>
  return (
    <div className="space-y-3">
      {byRole.map((row, i) => (
        <div key={i} className="rounded-2xl border border-bdr-light bg-white overflow-hidden">
          <div className="px-3 py-2 bg-surface-page/30 border-b border-bdr-light flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[13px] text-txt-primary">{row.role}</div>
              <div className="text-[10px] text-txt-tertiary">{row.sector} · {row.employers.length} employer{row.employers.length === 1 ? '' : 's'}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-txt-tertiary">{mode}</div>
              <div className={`text-[18px] font-bold tabular-nums ${mode === 'confirmed' && row.confirmed < row.allocated ? 'text-amber-700' : 'text-emerald-700'}`}>
                {mode === 'allocated' ? row.allocated : row.confirmed}
              </div>
              {mode === 'confirmed' && (
                <div className="text-[10px] text-txt-tertiary">of {row.allocated} allocated</div>
              )}
            </div>
          </div>
          <table className="w-full text-[11px]">
            <thead className="text-[9px] uppercase tracking-wider text-txt-tertiary bg-white">
              <tr>
                <th className="text-left px-3 py-1.5">Employer</th>
                <th className="text-left px-3 py-1.5">Branch</th>
                <th className="text-right px-3 py-1.5">Allocated</th>
                <th className="text-right px-3 py-1.5">Confirmed</th>
                <th className="text-left px-3 py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {row.employers.map((e, j) => (
                <tr key={j} className="border-t border-bdr-light/60">
                  <td className="px-3 py-1.5 font-medium text-txt-primary">{e.name}</td>
                  <td className="px-3 py-1.5 text-txt-secondary">{e.branch || '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{e.allocated}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-bold">{e.confirmed}</td>
                  <td className="px-3 py-1.5 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded-pill ${e.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : e.status === 'declined' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

const BAND_PILL = {
  emerald: 'bg-emerald-100 text-emerald-800',
  sky:     'bg-sky-100     text-sky-800',
  amber:   'bg-amber-100   text-amber-800',
  rose:    'bg-rose-100    text-rose-800',
}

function Ratio({ alignment }) {
  if (alignment.length === 0) return <div className="text-[12px] text-txt-secondary">No tracks planned and no allocations to align.</div>
  const totals = alignment.reduce((acc, r) => ({
    planned: acc.planned + r.planned,
    allocated: acc.allocated + r.allocated,
    confirmed: acc.confirmed + r.confirmed,
  }), { planned: 0, allocated: 0, confirmed: 0 })
  const overall = totals.planned ? totals.confirmed / totals.planned : 0

  return (
    <div className="rounded-2xl border border-bdr-light bg-white overflow-hidden">
      <table className="w-full text-[12px]">
        <thead className="bg-surface-page/50 text-[10px] uppercase tracking-wider text-txt-secondary">
          <tr>
            <th className="text-left px-3 py-2">Track</th>
            <th className="text-right px-3 py-2">Planned</th>
            <th className="text-right px-3 py-2">Allocated</th>
            <th className="text-right px-3 py-2">Confirmed</th>
            <th className="text-right px-3 py-2">Ratio</th>
            <th className="text-left px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {alignment.map((r, i) => (
            <tr key={i} className={`border-t border-bdr-light/60 ${r.unplanned ? 'bg-amber-50/40' : ''}`}>
              <td className="px-3 py-2">
                <div className="font-medium text-txt-primary">{r.role}</div>
                <div className="text-[10px] text-txt-tertiary">{r.sector}</div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{r.planned || '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.allocated}</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold">{r.confirmed}</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold">{r.planned ? `${r.ratio.toFixed(2)}×` : '—'}</td>
              <td className="px-3 py-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-pill ${BAND_PILL[r.band.tone] || BAND_PILL.sky}`}>
                  {r.band.label}
                </span>
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-bdr-light bg-surface-page/30">
            <td className="px-3 py-2 font-bold text-txt-primary">Total</td>
            <td className="px-3 py-2 text-right tabular-nums font-bold">{totals.planned}</td>
            <td className="px-3 py-2 text-right tabular-nums font-bold">{totals.allocated}</td>
            <td className="px-3 py-2 text-right tabular-nums font-bold">{totals.confirmed}</td>
            <td className="px-3 py-2 text-right tabular-nums font-bold">{totals.planned ? `${overall.toFixed(2)}×` : '—'}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function AuditHistory({ events }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2 inline-flex items-center gap-1">
        <Clock className="w-3 h-3" /> Plan edit history ({events.length})
      </div>
      <div className="space-y-2">
        {events.slice(0, 10).map(ev => {
          const when = new Date(ev.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
          return (
            <div key={ev.id} className="rounded-lg border border-bdr-light bg-white p-2.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-bold text-txt-primary">{ev.actor?.name || 'Centre head'}</span>
                <span className="text-txt-tertiary">{when}</span>
              </div>
              <div className="text-[11px] text-txt-secondary mb-1.5">
                Total <b className="text-txt-primary">{ev.totalBefore}</b> → <b className="text-txt-primary">{ev.totalAfter}</b>
                {ev.kind === 'reset' && <span className="ml-2 text-amber-700">(reset to seed defaults)</span>}
              </div>
              {ev.changes.length > 0 && (
                <ul className="text-[11px] text-txt-secondary space-y-0.5">
                  {ev.changes.map((c, i) => (
                    <li key={i} className="inline-flex items-center gap-1.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-pill ${
                        c.type === 'added'     ? 'bg-emerald-100 text-emerald-800' :
                        c.type === 'removed'   ? 'bg-rose-100 text-rose-800' :
                        c.type === 'increased' ? 'bg-sky-100 text-sky-800' :
                                                 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.type}
                      </span>
                      <span>
                        <span className="text-txt-primary">{c.role}</span>
                        {c.type !== 'added' && c.type !== 'removed' && (
                          <span className="ml-1 text-txt-tertiary">({c.before} → {c.after})</span>
                        )}
                        {c.type === 'added'   && <span className="ml-1 text-txt-tertiary">(+{c.after})</span>}
                        {c.type === 'removed' && <span className="ml-1 text-txt-tertiary">(was {c.before})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
