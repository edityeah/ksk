// Upload Payslip canvas — trainee uploads a monthly salary slip (PDF / image).
// OCR runs server-side, parses out employer, gross / net amount, deductions
// and pay month; the trainee confirms and the verified slip is pushed to
// DigiLocker as evidence for retention check-ins (Day 30/60/90).
//
// Prototype scope: the actual OCR pipeline isn't built end-to-end yet, so we
// stash the upload in memory and surface a confirm-screen with mock parsed
// fields. The UI is what we ship for the demo.

import { useRef, useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { applyCredit } from '../../utils/aiCredits.js'
import { Upload, FileText, ImageIcon, CheckCircle2, ChevronRight, X, ShieldCheck, Calendar, IndianRupee, Building2 } from 'lucide-react'

// Local fixture so the recent-uploads strip has content for the demo.
function defaultHistory() {
  const now = new Date()
  const month = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  }
  return [
    { id: 'h1', month: month(1), employer: 'Trent Hypermarket — Star Bazaar', gross: 18500, net: 15800, status: 'verified', uploadedAt: 'last month' },
    { id: 'h2', month: month(2), employer: 'Trent Hypermarket — Star Bazaar', gross: 18500, net: 15800, status: 'verified', uploadedAt: '2 months ago' },
  ]
}

function readableSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/(1024*1024)).toFixed(1)} MB`
}

export default function SalarySlipCanvas() {
  const { meExtra, showToast, user } = useApp() || {}
  const t = meExtra?.trainee
  const fileInputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [pending, setPending] = useState(null)   // { file, parsed } once a file is picked
  const [history, setHistory] = useState(defaultHistory())
  const [submitting, setSubmitting] = useState(false)

  function pickFile(file) {
    if (!file) return
    if (!/^(application\/pdf|image\/(jpe?g|png|webp))$/i.test(file.type)) {
      showToast?.({ kind: 'warn', text: 'Upload a PDF or image (JPG/PNG/WebP).' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast?.({ kind: 'warn', text: 'File too large (max 10 MB).' })
      return
    }
    // Mock OCR parse — the real pipeline would call /api/ai/parse-payslip.
    // For the prototype we pre-fill plausible values that the trainee then
    // verifies / corrects before submitting.
    const parsed = {
      month: 'Oct 2026',
      employer: t?.placements?.[0]?.employer?.name || 'Trent Hypermarket — Star Bazaar',
      gross: 18500,
      net: 15800,
      deductions: 2700,
      payDate: '02 Nov 2026',
      ifsc: 'HDFC0001234',
    }
    setPending({ file, parsed })
  }

  function onDrop(e) {
    e.preventDefault(); setDrag(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) pickFile(file)
  }

  async function submit() {
    if (!pending) return
    setSubmitting(true)
    // Simulate upload — real impl: FormData → /api/payslips with the file +
    // confirmed fields → server runs OCR + writes to DigiLocker.
    await new Promise(r => setTimeout(r, 900))
    setHistory(h => [{
      id: 'new-' + Date.now(),
      month: pending.parsed.month,
      employer: pending.parsed.employer,
      gross: pending.parsed.gross,
      net: pending.parsed.net,
      status: 'verified',
      uploadedAt: 'just now',
    }, ...h])
    setPending(null); setSubmitting(false)
    // Award credits on upload — once per (month, employer) pair.
    const uniqueId = `${pending.parsed.month}--${pending.parsed.employer}`
    const next = applyCredit(user?.id, 'upload_payslip', { uniqueId })
    showToast?.({ kind: 'success', text: `Payslip verified · DigiLocker updated · +25 AI credits (balance ${next.balance})` })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-lime-50/70 to-white flex-shrink-0">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-lime-700">Upload payslip</div>
        <h2 className="text-[20px] font-bold text-txt-primary leading-tight mt-1">Verify your monthly salary slip</h2>
        <p className="text-[12px] text-txt-secondary mt-1">
          OCR-verified slips become evidence for Day 30 / 60 / 90 retention check-ins and stored to your DigiLocker.
        </p>
      </div>

      {/* Pending file → confirm screen */}
      {pending ? (
        <div className="px-5 py-5 flex-1">
          <div className="rounded-2xl border border-bdr bg-white p-4 shadow-card max-w-2xl">
            <div className="flex items-start gap-3 pb-3 border-b border-bdr-light">
              <div className="w-12 h-12 rounded-xl bg-lime-100 text-lime-700 flex items-center justify-center flex-shrink-0">
                {pending.file.type.includes('pdf') ? <FileText className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-txt-primary truncate">{pending.file.name}</div>
                <div className="text-[11px] text-txt-secondary">{readableSize(pending.file.size)} · OCR scan complete</div>
              </div>
              <button onClick={() => setPending(null)} className="p-1.5 rounded-pill hover:bg-slate-100">
                <X className="w-4 h-4 text-txt-secondary" />
              </button>
            </div>

            <div className="mt-4 text-[11px] uppercase tracking-wider font-bold text-txt-tertiary">Check the parsed details</div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ParsedField icon={Calendar}    label="Pay month"  value={pending.parsed.month} onChange={(v) => setPending(p => ({ ...p, parsed: { ...p.parsed, month: v } }))} />
              <ParsedField icon={Building2}   label="Employer"   value={pending.parsed.employer} onChange={(v) => setPending(p => ({ ...p, parsed: { ...p.parsed, employer: v } }))} />
              <ParsedField icon={IndianRupee} label="Gross"      value={pending.parsed.gross} onChange={(v) => setPending(p => ({ ...p, parsed: { ...p.parsed, gross: Number(v) || v } }))} type="number" />
              <ParsedField icon={IndianRupee} label="Net (in hand)" value={pending.parsed.net} onChange={(v) => setPending(p => ({ ...p, parsed: { ...p.parsed, net: Number(v) || v } }))} type="number" />
              <ParsedField icon={IndianRupee} label="Deductions" value={pending.parsed.deductions} onChange={(v) => setPending(p => ({ ...p, parsed: { ...p.parsed, deductions: Number(v) || v } }))} type="number" />
              <ParsedField icon={Calendar}    label="Pay date"   value={pending.parsed.payDate} onChange={(v) => setPending(p => ({ ...p, parsed: { ...p.parsed, payDate: v } }))} />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => setPending(null)} disabled={submitting}
                className="px-4 py-2 rounded-pill border border-bdr text-[13px] font-bold text-txt-primary hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={submit} disabled={submitting}
                className="px-4 py-2 rounded-pill bg-lime-600 text-white font-bold text-[13px] inline-flex items-center gap-2 hover:bg-lime-700 disabled:opacity-60">
                <ShieldCheck className="w-4 h-4" />
                {submitting ? 'Uploading…' : 'Verify & save to DigiLocker'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 py-5 flex-1">
          {/* Drop zone */}
          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={`block rounded-2xl border-2 border-dashed ${drag ? 'border-primary bg-primary-light/30' : 'border-bdr bg-surface-page/40'} hover:border-primary hover:bg-primary-light/20 transition cursor-pointer p-8 text-center`}
          >
            <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])} />
            <div className="w-14 h-14 rounded-2xl bg-lime-100 text-lime-700 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div className="mt-3 text-[15px] font-bold text-txt-primary">Drop your payslip here</div>
            <div className="text-[12px] text-txt-secondary mt-1">
              PDF, JPG, PNG or WebP · up to 10 MB
            </div>
            <div className="mt-4 inline-flex items-center gap-2">
              <span className="px-3 py-2 rounded-pill bg-primary text-white font-bold text-[13px]">Choose file</span>
              <span className="text-[11px] text-txt-tertiary">or take a photo of the slip</span>
            </div>
          </label>

          {/* History */}
          <div className="mt-6 max-w-2xl">
            <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">Recently uploaded</div>
            {history.length === 0 ? (
              <div className="text-[12px] text-txt-tertiary py-3">Nothing uploaded yet.</div>
            ) : (
              <ul className="rounded-2xl border border-bdr-light divide-y divide-bdr-light bg-white overflow-hidden">
                {history.map(h => (
                  <li key={h.id} className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-txt-primary truncate">{h.month} · {h.employer}</div>
                      <div className="text-[11px] text-txt-secondary truncate">Net ₹{Number(h.net).toLocaleString('en-IN')} · Gross ₹{Number(h.gross).toLocaleString('en-IN')} · uploaded {h.uploadedAt}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-pill flex-shrink-0">{h.status}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-txt-tertiary flex-shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ParsedField({ icon: Icon, label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1 inline-flex items-center gap-1">
        <Icon className="w-3 h-3" />{label}
      </div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-bdr text-[13px] text-txt-primary focus:border-primary outline-none" />
    </label>
  )
}
