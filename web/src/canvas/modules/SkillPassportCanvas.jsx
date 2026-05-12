// Trainee's verified credentials + lifetime employment record.

import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import VerificationBadge from './_VerificationBadge.jsx'
import { Award, Briefcase, Calendar, IndianRupee, MapPin, Share2, Download } from 'lucide-react'

export default function SkillPassportCanvas() {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.me().then(r => setMe(r)).finally(() => setLoading(false)) }, [])

  if (loading) return <div className="p-6 text-sm text-txt-secondary">Loading…</div>
  const t = me?.trainee
  if (!t) return <div className="p-6 text-sm text-txt-secondary">No trainee profile.</div>

  return (
    <div className="p-5 space-y-4">
      {/* identity card */}
      <div className="rounded-card border border-bdr-light bg-gradient-to-br from-primary-500 to-primary-700 text-white p-5">
        <div className="text-[10px] uppercase tracking-wider opacity-80">Verified Skill Passport · KSK</div>
        <div className="text-xl font-semibold mt-1">{t.name}</div>
        <div className="text-xs opacity-90 mt-0.5">Aadhaar XXXX XXXX {t.aadhaar?.slice(-4)} · {t.state}/{t.district}</div>
        <div className="text-xs opacity-90 mt-2">Latest batch · {t.batch?.code || '—'} ({t.batch?.track?.name || '—'})</div>
        <div className="flex gap-2 mt-3">
          <button className="text-xs px-3 py-1.5 rounded-pill bg-white/15 hover:bg-white/25 inline-flex items-center gap-1"><Share2 className="w-3 h-3" /> Share</button>
          <button className="text-xs px-3 py-1.5 rounded-pill bg-white/15 hover:bg-white/25 inline-flex items-center gap-1"><Download className="w-3 h-3" /> Push to DigiLocker</button>
        </div>
      </div>

      <Section icon={<Award className="w-4 h-4" />} title="Certificates">
        {(t.certificates || []).length === 0 && <Empty>No certificates yet.</Empty>}
        {(t.certificates || []).map(c => (
          <Row key={c.id}>
            <div className="flex-1">
              <div className="text-sm font-medium">{c.jobRole?.name || 'Certificate'}</div>
              <div className="text-xs text-txt-secondary">{c.jobRole?.qpCode} · Issued {new Date(c.issuedAt).toLocaleDateString()}</div>
            </div>
            <VerificationBadge state="verified" />
          </Row>
        ))}
      </Section>

      <Section icon={<Briefcase className="w-4 h-4" />} title="Placements & employment history">
        {(t.placements || []).length === 0 && <Empty>No placements yet.</Empty>}
        {(t.placements || []).map(p => (
          <div key={p.id} className="rounded-card border border-bdr-light bg-white p-3">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{p.role}</div>
                <div className="text-xs text-txt-secondary flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  <span>{p.employer?.name}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.joiningDate).toLocaleDateString()}</span>
                  <span className="inline-flex items-center gap-1"><IndianRupee className="w-3 h-3" />{p.ctcMonthly?.toLocaleString('en-IN')}/mo</span>
                </div>
              </div>
              <VerificationBadge state={p.state} />
            </div>
            {p.retentionCheckins?.length > 0 && (
              <div className="mt-2 flex gap-2 text-[11px] text-txt-secondary">
                {p.retentionCheckins.map(rc => (
                  <span key={rc.id} className={`badge ${rc.state === 'dual_confirmed' ? 'badge-ok' : rc.state === 'pending' ? 'badge-info' : 'badge-warn'}`}>D{rc.milestone} · {rc.state.replace('_', ' ')}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section icon={<MapPin className="w-4 h-4" />} title="Profile">
        <div className="text-sm text-txt-secondary">
          <div>Education: <b className="text-txt-primary">{t.education}</b></div>
          <div>Category: <b className="text-txt-primary">{t.category || '—'}</b></div>
          <div>Gender: <b className="text-txt-primary">{t.gender}</b></div>
        </div>
      </Section>
    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-txt-secondary mb-2">{icon}{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
function Row({ children }) { return <div className="flex items-center gap-3 rounded-card border border-bdr-light bg-white p-3">{children}</div> }
function Empty({ children }) { return <div className="text-xs text-txt-secondary italic px-1">{children}</div> }
