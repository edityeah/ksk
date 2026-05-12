// KSK Skill Passport — Pravasi-Setu-style identity card with stats,
// skills + certifications grid, work-experience cards, and bottom CTAs.

import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import {
  Pencil, Share2, Download, QrCode, Star, Award, Briefcase,
  ShieldCheck, BadgeCheck, AlertCircle, FileText, Plus,
} from 'lucide-react'

const SKILL_LEVEL = (months) => {
  if (months >= 36) return 'Skilled'
  if (months >= 12) return 'Semi-skilled'
  return 'Beginner'
}
const yrs = (months) => Math.max(0, Math.round(months / 12))

export default function SkillPassportCanvas() {
  const { showToast } = useApp()
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.me().then(setMe).finally(() => setLoading(false)) }, [])

  if (loading) return <Loading />
  const t = me?.trainee
  if (!t) return <Empty />

  const certs = t.certificates || []
  const placements = t.placements || []
  const batchTrack = t.batch?.track
  const jobRoles = batchTrack?.jobRoles?.map(jr => jr.jobRole) || []

  // ── Build the SKILLS list from certified job roles + placement roles ──
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
    // Add job-role-from-batch as Beginner if no other source
    for (const jr of jobRoles) {
      if (!map.has(jr.name)) map.set(jr.name, { name: jr.name, monthsExperience: 0, sourceCount: 0, certified: false, beginner: true })
    }
    return Array.from(map.values())
  }, [certs.length, placements.length, jobRoles.length])

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
    <div className="flex flex-col" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* ── Blue hero band ── */}
      <div className="bg-primary text-white px-5 pt-5 pb-24 relative">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-[20px] font-bold leading-tight">Skill Passport</div>
            <div className="text-[12px] opacity-80">Updated {updatedDate}</div>
          </div>
          <div className="flex items-center gap-2">
            <IconBtn icon={<Pencil className="w-4 h-4" />} title="Edit"     onClick={() => showToast({ kind: 'info', text: 'Edit mode opens here' })} />
            <IconBtn icon={<Share2 className="w-4 h-4" />} title="Share"    onClick={() => showToast({ kind: 'success', text: 'Share link copied' })} />
            <IconBtn icon={<Download className="w-4 h-4" />} title="Download" onClick={() => showToast({ kind: 'success', text: 'Pushed to DigiLocker' })} />
          </div>
        </div>
      </div>

      {/* ── Identity card (overlaps the blue band) ── */}
      <div className="px-4 -mt-20">
        <div className="rounded-2xl bg-white shadow-card border border-bdr-light p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[2px] text-txt-secondary">Kaushal Samiksha Skill Passport</div>
              <div className="text-[24px] font-bold text-txt-primary mt-1 leading-tight truncate">{t.name}</div>
              <div className="text-[12px] text-txt-secondary mt-1">
                ID: <span className="font-mono font-semibold">{passportId}</span> · Issued {issuedYear}
              </div>
            </div>
            <div className="w-16 h-16 rounded-xl border-2 border-primary-light flex items-center justify-center flex-shrink-0">
              <QrCode className="w-9 h-9 text-primary" />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-bdr-light">
            <Kpi value={skills.length} label="Skills" />
            <Kpi value={certs.length} label="Certificates" />
            <Kpi value={`${yrs(totalExperienceMonths)}y`} label="Experience" />
            <Kpi value={`${readiness}%`} label="Readiness" />
          </div>

          {/* Readiness bar */}
          <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-ok" style={{ width: `${readiness}%` }} />
          </div>

          {/* Verification pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            <VerPill icon={<ShieldCheck className="w-3 h-3" />} text="Aadhaar verified" tone="ok" />
            <VerPill icon={<BadgeCheck  className="w-3 h-3" />} text="NSDC linked"      tone="ok" />
            {t.batch?.scheme?.code && <VerPill icon={<BadgeCheck className="w-3 h-3" />} text={`${t.batch.scheme.code} enrolled`} tone="info" />}
            {placements.some(p => p.state === 'verified') && <VerPill icon={<BadgeCheck className="w-3 h-3" />} text="Maker-checker verified" tone="ok" />}
          </div>
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
              subtitle={`${s.beginner ? 'In training' : SKILL_LEVEL(s.monthsExperience)} · ${yrs(s.monthsExperience)} yr${yrs(s.monthsExperience) === 1 ? '' : 's'} experience`}
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
