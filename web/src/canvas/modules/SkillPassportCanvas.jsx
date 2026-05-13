// KSK Skill Passport — Pravasi-Setu-style identity card with stats,
// skills + certifications grid, work-experience cards, and bottom CTAs.

import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import {
  Pencil, Share2, Download, QrCode, Star, Award, Briefcase,
  ShieldCheck, BadgeCheck, AlertCircle, FileText, Plus,
  Home, MapPin, GraduationCap, Sparkles, Check, X,
} from 'lucide-react'

// Self-declared profile fields — persisted to localStorage per user. These are
// optional and help Career Counsellor + Find Jobs personalise better.
const SELF_KEY = (userId) => `ksk.skillpassport.self.${userId || 'anon'}`

function loadSelf(userId) {
  try {
    const raw = localStorage.getItem(SELF_KEY(userId))
    if (!raw) return {}
    return JSON.parse(raw) || {}
  } catch { return {} }
}
function saveSelf(userId, data) {
  try { localStorage.setItem(SELF_KEY(userId), JSON.stringify(data)) } catch {}
}

const SKILL_LEVEL = (months) => {
  if (months >= 36) return 'Skilled'
  if (months >= 12) return 'Semi-skilled'
  return 'Beginner'
}
const yrs = (months) => Math.max(0, Math.round(months / 12))

// Display: "5y", "9m", "Just started"
function fmtExperience(months) {
  if (!months || months < 1) return '—'
  if (months < 12) return `${months}m`
  return `${Math.round(months / 12)}y`
}
// Display for skill row subtitle
function fmtExperienceLong(months) {
  if (!months || months < 1) return 'Just started'
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} experience`
  const y = Math.round(months / 12)
  return `${y} yr${y === 1 ? '' : 's'} experience`
}

export default function SkillPassportCanvas() {
  const { showToast } = useApp()
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  // Self-declared fields lazy-loaded from localStorage once `me` is known.
  const [self, setSelf] = useState({})
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    api.me().then(r => {
      setMe(r)
      setSelf(loadSelf(r?.user?.id))
    }).finally(() => setLoading(false))
  }, [])
  function persistSelf(next) { setSelf(next); saveSelf(me?.user?.id, next) }

  // ── All hooks MUST run before any conditional return ─────────────────────
  const t = me?.trainee
  const certs = t?.certificates || []
  const placements = t?.placements || []
  const batchTrack = t?.batch?.track
  const jobRoles = batchTrack?.jobRoles?.map(jr => jr.jobRole) || []

  const skills = useMemo(() => {
    const map = new Map()
    for (const c of certs) {
      const name = c.jobRole?.name; if (!name) continue
      if (!map.has(name)) map.set(name, { name, monthsExperience: 0, sourceCount: 0, certified: true })
      map.get(name).sourceCount++
    }
    for (const p of placements) {
      const name = p.role || ''
      const end = new Date()
      const start = new Date(p.joiningDate)
      const months = Math.max(1, Math.round((end - start) / (30 * 24 * 3600 * 1000)))
      if (!map.has(name)) map.set(name, { name, monthsExperience: 0, sourceCount: 0, certified: false })
      map.get(name).monthsExperience += months
      map.get(name).sourceCount++
    }
    for (const jr of jobRoles) {
      if (!map.has(jr.name)) map.set(jr.name, { name: jr.name, monthsExperience: 0, sourceCount: 0, certified: false, beginner: true })
    }
    return Array.from(map.values())
  }, [certs.length, placements.length, jobRoles.length])

  if (loading) return <Loading />
  if (!t) return <Empty />

  // ── KPI summary ──
  const totalExperienceMonths = placements.reduce((acc, p) => {
    const start = new Date(p.joiningDate)
    const end = p.state === 'verified' ? new Date() : new Date()
    return acc + Math.max(0, Math.round((end - start) / (30 * 24 * 3600 * 1000)))
  }, 0)

  // readiness: aadhaar verified + has certs + has placement + has retention dual-confirmed
  let readiness = 25 // Aadhaar verified base
  if (certs.length > 0) readiness += 25
  if (placements.length > 0) readiness += 25
  if (placements.some(p => p.state === 'verified')) readiness += 25

  const passportId = `KSK-${(t.aadhaar || '').slice(-4)}-${t.id?.slice(-4).toUpperCase()}`
  const issuedYear = certs[0]?.issuedAt ? new Date(certs[0].issuedAt).getFullYear() : new Date().getFullYear()
  const updatedDate = t.updatedAt
    ? new Date(t.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* ── Blue hero band — kept short so the white card sits visibly inside ── */}
      <div className="bg-primary px-5 pt-4 pb-12 relative">
        <div className="flex items-center justify-end gap-2">
          <IconBtn icon={<Pencil className="w-4 h-4" />}   title="Edit"     onClick={() => showToast({ kind: 'info',    text: 'Edit mode opens here' })} />
          <IconBtn icon={<Share2 className="w-4 h-4" />}   title="Share"    onClick={() => showToast({ kind: 'success', text: 'Share link copied'    })} />
          <IconBtn icon={<Download className="w-4 h-4" />} title="DigiLocker" onClick={() => showToast({ kind: 'success', text: 'Pushed to DigiLocker' })} />
        </div>
      </div>

      {/* ── Identity card overlapping the blue band ── */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="rounded-2xl bg-white shadow-card border border-bdr-light p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[2px] text-txt-secondary">Kaushal Samiksha Skill Passport</div>
              <div className="text-[24px] font-bold text-txt-primary mt-1 leading-tight">{t.name}</div>
              <div className="text-[12px] text-txt-secondary mt-1">
                ID: <span className="font-mono font-semibold">{passportId}</span> · Issued {issuedYear}
              </div>
              <div className="text-[11px] text-txt-tertiary mt-0.5">Updated {updatedDate}</div>
            </div>
            <div className="w-16 h-16 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
              <QrCode className="w-9 h-9 text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-bdr-light">
            <Kpi value={skills.length} label="Skills" />
            <Kpi value={certs.length} label="Certificates" />
            <Kpi value={fmtExperience(totalExperienceMonths)} label="Experience" />
            <Kpi value={`${readiness}%`} label="Readiness" />
          </div>

          <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-ok transition-all" style={{ width: `${readiness}%` }} />
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <VerPill icon={<ShieldCheck className="w-3 h-3" />} text="Aadhaar verified" tone="ok" />
            <VerPill icon={<BadgeCheck  className="w-3 h-3" />} text="NSDC linked"      tone="ok" />
            {t.batch?.scheme?.code && <VerPill icon={<BadgeCheck className="w-3 h-3" />} text={`${t.batch.scheme.code} enrolled`} tone="info" />}
            {placements.some(p => p.state === 'verified') && <VerPill icon={<BadgeCheck className="w-3 h-3" />} text="Maker-checker verified" tone="ok" />}
          </div>

          {/* Trust logos — DigiLocker + NSDC official integrations */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-bdr-light">
            <span className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary">Verified by</span>
            <LogoBadge name="DigiLocker" subtitle="Govt. of India" tone="amber" />
            <LogoBadge name="NSDC"       subtitle="Skill India"    tone="primary" />
            <LogoBadge name="EPFO"       subtitle="Min. of Labour" tone="emerald" optional />
          </div>
        </div>
      </div>

      {/* ── Personal details + preferences (self-declared, optional) ── */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl bg-white border border-bdr-light p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              Personal & Preferences
              <span className="text-[10px] text-txt-tertiary normal-case font-medium">(self-declared · helps Career Counsellor)</span>
            </div>
            <button onClick={() => setEditing(e => !e)} className="text-[12px] font-bold text-primary inline-flex items-center gap-1">
              {editing ? <><X className="w-3 h-3" /> Done</> : <><Pencil className="w-3 h-3" /> Edit</>}
            </button>
          </div>
          {editing
            ? <PersonalForm self={self} onChange={persistSelf} />
            : <PersonalView self={self} />}
        </div>
      </div>

      {/* ── Academic background (board exam results) ── */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl bg-white border border-bdr-light p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary inline-flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3 text-violet-700" />
              Academic background
            </div>
            <button onClick={() => setEditing(e => !e)} className="text-[12px] font-bold text-primary inline-flex items-center gap-1">
              {editing ? <><X className="w-3 h-3" /> Done</> : <><Pencil className="w-3 h-3" /> Edit</>}
            </button>
          </div>
          {editing
            ? <AcademicForm self={self} onChange={persistSelf} />
            : <AcademicView self={self} />}
        </div>
      </div>

      {/* ── Skills + Certifications (2-col on wide canvases) ── */}
      <div className="px-4 mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Skills */}
        <Section
          title="Skills"
          action={<button className="text-[12px] font-bold text-primary inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>}>
          {skills.length === 0 && <EmptyRow icon={<Star className="w-4 h-4" />}>Skills will appear after your first batch.</EmptyRow>}
          {skills.map(s => (
            <Row key={s.name}
              icon={<Star className="w-4 h-4" />}
              iconTone={s.certified ? 'sky' : 'amber'}
              title={s.name}
              subtitle={s.beginner ? 'In training · No work experience yet' : `${SKILL_LEVEL(s.monthsExperience)} · ${fmtExperienceLong(s.monthsExperience)}`}
              badge={s.certified ? <Pill tone="ok">Verified</Pill> : <Pill tone="warn">Pending</Pill>}
            />
          ))}
        </Section>

        {/* Certifications */}
        <Section title="Certifications">
          {certs.length === 0 && <EmptyRow icon={<Award className="w-4 h-4" />}>No certifications issued yet.</EmptyRow>}
          {certs.map(c => (
            <Row key={c.id}
              icon={<Award className="w-4 h-4" />}
              iconTone="violet"
              title={c.jobRole?.name || 'Certificate'}
              subtitle={`${c.jobRole?.sector?.name || 'NSDC'} · ${new Date(c.issuedAt).getFullYear()}${c.digiLockerRef ? ` · DL ${c.digiLockerRef}` : ''}`}
              badge={<Pill tone="ok">Verified</Pill>}
            />
          ))}
        </Section>
      </div>

      {/* ── Work experience ── */}
      <div className="px-4 mt-5">
        <Header title="Work experience" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {placements.length === 0 && (
            <div className="md:col-span-2"><EmptyRow icon={<Briefcase className="w-4 h-4" />}>Placements will appear here after your first job.</EmptyRow></div>
          )}
          {placements.map(p => {
            const fromY = new Date(p.joiningDate).getFullYear()
            const isCurrent = p.state === 'verified' || p.state === 'partially_verified'
            const toY = isCurrent ? 'Present' : new Date(p.updatedAt || p.joiningDate).getFullYear()
            return (
              <div key={p.id} className="rounded-2xl bg-white border border-bdr-light p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[14px] text-txt-primary truncate">{p.role}</div>
                  <div className="text-[12px] text-txt-secondary truncate">
                    {p.employer?.name} · {fromY} – {toY} · {p.employer?.state || 'India'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Bottom CTAs ── */}
      <div className="px-4 mt-6 mb-5 flex flex-col sm:flex-row gap-3">
        <button onClick={() => showToast({ kind: 'info', text: 'Edit mode opens here' })}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-pill border-2 border-primary text-primary font-bold text-[14px] bg-white">
          <Pencil className="w-4 h-4" /> Edit Passport
        </button>
        <button onClick={() => showToast({ kind: 'info', text: 'Resume builder will launch next session' })}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-pill bg-primary text-white font-bold text-[14px] shadow-modal">
          <FileText className="w-4 h-4" /> Open Resume Builder
        </button>
      </div>
    </div>
  )
}

// ─── helpers ────────────────────────────────────────────────────────────────
function Loading() { return <div className="p-6 text-sm text-txt-secondary">Loading your Skill Passport…</div> }
function Empty() {
  return (
    <div className="p-6 text-center">
      <AlertCircle className="w-10 h-10 text-warn mx-auto mb-2" />
      <div className="text-sm text-txt-secondary">No trainee profile attached to this account.</div>
    </div>
  )
}

function IconBtn({ icon, title, onClick }) {
  return (
    <button onClick={onClick} title={title}
      className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white">
      {icon}
    </button>
  )
}

function Kpi({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-[26px] font-bold text-primary leading-none">{value}</div>
      <div className="text-[10px] uppercase font-bold tracking-wider text-txt-secondary mt-1">{label}</div>
    </div>
  )
}

function VerPill({ icon, text, tone = 'ok' }) {
  const css = tone === 'ok'   ? 'bg-ok-light text-ok'
            : tone === 'warn' ? 'bg-warn-light text-warn'
            : 'bg-primary-light text-primary'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-[11px] font-bold ${css}`}>
      {icon}{text}
    </span>
  )
}

function Section({ title, action, children }) {
  return (
    <div>
      <Header title={title} action={action} />
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Header({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-txt-secondary">{title}</div>
      {action}
    </div>
  )
}

const ROW_TONES = {
  sky:    'bg-sky-100 text-sky-600',
  amber:  'bg-amber-100 text-amber-600',
  violet: 'bg-violet-100 text-violet-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  emerald:'bg-emerald-100 text-emerald-600',
}
function Row({ icon, iconTone = 'sky', title, subtitle, badge }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white border border-bdr-light p-3">
      <div className={`w-9 h-9 rounded-xl ${ROW_TONES[iconTone] || ROW_TONES.sky} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[14px] text-txt-primary truncate">{title}</div>
        <div className="text-[11px] text-txt-secondary truncate">{subtitle}</div>
      </div>
      {badge}
    </div>
  )
}

function Pill({ tone = 'ok', children }) {
  const css = tone === 'ok'   ? 'bg-ok-light text-ok'
            : tone === 'warn' ? 'bg-warn-light text-warn'
            : 'bg-primary-light text-primary'
  return <span className={`px-2 py-0.5 rounded-pill text-[10px] font-bold ${css}`}>{children}</span>
}

function EmptyRow({ icon, children }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white border border-dashed border-bdr-light p-3 text-txt-secondary">
      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="text-[12px]">{children}</div>
    </div>
  )
}

// ── New: logo badge (Govt-of-India trust signals) ────────────────────────
const LOGO_TONES = {
  amber:   { bg: 'bg-amber-100',   fg: 'text-amber-700',   ring: 'ring-amber-300' },
  primary: { bg: 'bg-primary-light',fg: 'text-primary-dark',ring: 'ring-primary/40' },
  emerald: { bg: 'bg-emerald-100', fg: 'text-emerald-700', ring: 'ring-emerald-300' },
}
function LogoBadge({ name, subtitle, tone = 'primary', optional = false }) {
  const t = LOGO_TONES[tone] || LOGO_TONES.primary
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${t.bg} ${t.fg} ring-1 ${t.ring} ${optional ? 'opacity-60' : ''}`}>
      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[9px] font-extrabold tracking-tight">{name.slice(0,2)}</div>
      <div className="leading-tight">
        <div className="text-[10px] font-bold uppercase tracking-wider">{name}</div>
        <div className="text-[9px] opacity-70">{subtitle}</div>
      </div>
      {!optional && <Check className="w-3 h-3 ml-0.5" />}
    </div>
  )
}

// ── Personal & Preferences ───────────────────────────────────────────────
function PersonalView({ self }) {
  const empty = !self.hometown && !self.currentLocation && !(self.preferredSkills?.length) && !(self.preferredLocations?.length)
  if (empty) return (
    <div className="text-[12px] text-txt-tertiary py-2">
      Add a few details — Career Counsellor + Find Jobs use these to give you better recommendations.
    </div>
  )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
      <KV icon={Home}    label="Hometown"          value={self.hometown} />
      <KV icon={MapPin}  label="Current location"  value={self.currentLocation} />
      <KV icon={Sparkles} label="Preferred skills"  value={(self.preferredSkills || []).join(', ')} fullWidth />
      <KV icon={MapPin}  label="Preferred work locations" value={(self.preferredLocations || []).join(', ')} fullWidth />
    </div>
  )
}
function KV({ icon: Icon, label, value, fullWidth }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary inline-flex items-center gap-1">
        <Icon className="w-3 h-3" />{label}
      </div>
      <div className="text-[13px] text-txt-primary">{value || <span className="text-txt-tertiary italic font-normal">not set</span>}</div>
    </div>
  )
}
function PersonalForm({ self, onChange }) {
  const update = (patch) => onChange({ ...self, ...patch })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Hometown (district, state)" icon={Home}
        value={self.hometown || ''} onChange={v => update({ hometown: v })} placeholder="e.g. Patna, Bihar" />
      <Field label="Current location" icon={MapPin}
        value={self.currentLocation || ''} onChange={v => update({ currentLocation: v })} placeholder="e.g. Pune, Maharashtra" />
      <ChipList label="Preferred skill areas" icon={Sparkles}
        items={self.preferredSkills || []}
        onChange={list => update({ preferredSkills: list })}
        placeholder="e.g. Electrician, Solar PV"
        suggestions={['Electrician','Solar PV','Welder','Fitter','BPO / Customer Care','Retail','Healthcare','Beauty & Wellness','Tailoring','Auto-Mechanic']}
        fullWidth />
      <ChipList label="Preferred work locations" icon={MapPin}
        items={self.preferredLocations || []}
        onChange={list => update({ preferredLocations: list })}
        placeholder="e.g. Bengaluru, Delhi NCR"
        fullWidth />
    </div>
  )
}

// ── Academic background ──────────────────────────────────────────────────
function AcademicView({ self }) {
  const e10 = self.exam10, e12 = self.exam12
  if (!e10 && !e12) return (
    <div className="text-[12px] text-txt-tertiary py-2">
      Add your Class 10 / Class 12 board results — helps surface RPL + eligibility-based course matches.
    </div>
  )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
      <ExamCard label="Class 10" exam={e10} />
      <ExamCard label="Class 12" exam={e12} />
    </div>
  )
}
function ExamCard({ label, exam }) {
  if (!exam) return (
    <div className="rounded-xl border border-dashed border-bdr-light p-3 text-[12px] text-txt-tertiary">{label}: not set</div>
  )
  return (
    <div className="rounded-xl bg-violet-50/40 border border-violet-100 p-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-violet-700">{label}</div>
      <div className="font-bold text-[14px] text-txt-primary mt-0.5">{exam.board || 'Board not set'}</div>
      <div className="text-[11px] text-txt-secondary">
        {exam.year ? `Passed ${exam.year}` : 'Year not set'}{exam.percentage ? ` · ${exam.percentage}%` : ''}{exam.stream ? ` · ${exam.stream}` : ''}
      </div>
    </div>
  )
}
function AcademicForm({ self, onChange }) {
  const update = (patch) => onChange({ ...self, ...patch })
  const e10 = self.exam10 || {}
  const e12 = self.exam12 || {}
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ExamForm label="Class 10" exam={e10} onChange={(e) => update({ exam10: e })} />
      <ExamForm label="Class 12" exam={e12} onChange={(e) => update({ exam12: e })} showStream />
    </div>
  )
}
function ExamForm({ label, exam, onChange, showStream }) {
  const set = (patch) => onChange({ ...exam, ...patch })
  return (
    <div className="rounded-xl border border-bdr-light p-3 space-y-2">
      <div className="text-[10px] uppercase tracking-wider font-bold text-violet-700">{label}</div>
      <Field label="Board" value={exam.board || ''} onChange={v => set({ board: v })} placeholder="e.g. CBSE, ICSE, Bihar Board" />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Year passed" value={exam.year || ''} onChange={v => set({ year: v })} placeholder="2024" />
        <Field label="Percentage" value={exam.percentage || ''} onChange={v => set({ percentage: v })} placeholder="78" suffix="%" />
      </div>
      {showStream && (
        <Field label="Stream" value={exam.stream || ''} onChange={v => set({ stream: v })} placeholder="Science / Commerce / Arts / Vocational" />
      )}
    </div>
  )
}

// ── Tiny form primitives ─────────────────────────────────────────────────
function Field({ label, icon: Icon, value, onChange, placeholder, suffix, fullWidth }) {
  return (
    <label className={fullWidth ? 'sm:col-span-2 block' : 'block'}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary inline-flex items-center gap-1 mb-1">
        {Icon && <Icon className="w-3 h-3" />}{label}
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-bdr px-2 focus-within:border-primary">
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="flex-1 bg-transparent py-1.5 text-[13px] outline-none" />
        {suffix && <span className="text-[11px] text-txt-tertiary">{suffix}</span>}
      </div>
    </label>
  )
}
function ChipList({ label, icon: Icon, items, onChange, placeholder, suggestions = [], fullWidth }) {
  const [input, setInput] = useState('')
  function add(v) {
    const t = (v || '').trim()
    if (!t || items.includes(t)) return
    onChange([...items, t])
    setInput('')
  }
  function remove(t) { onChange(items.filter(x => x !== t)) }
  const avail = suggestions.filter(s => !items.includes(s))
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary inline-flex items-center gap-1 mb-1">
        {Icon && <Icon className="w-3 h-3" />}{label}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map(t => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary text-white text-[11px] font-bold">
            {t}
            <button onClick={() => remove(t)} className="hover:bg-white/20 rounded-full w-3 h-3 flex items-center justify-center">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-[11px] text-txt-tertiary italic">none yet</span>}
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-bdr px-2 focus-within:border-primary">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input) } }}
          placeholder={placeholder}
          className="flex-1 bg-transparent py-1.5 text-[13px] outline-none" />
        <button onClick={() => add(input)} disabled={!input.trim()}
          className="text-[11px] font-bold text-primary disabled:opacity-40">Add</button>
      </div>
      {avail.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {avail.slice(0, 6).map(s => (
            <button key={s} onClick={() => add(s)} className="text-[10px] px-2 py-0.5 rounded-pill border border-bdr-light text-txt-secondary hover:border-primary hover:text-primary">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
