// Training partner / training centre flow: declare a placement for a trainee.
//
// The declaration is no longer a bare form — it MUST be backed by the offer /
// appointment letter. We run gpt-4o vision on the uploaded image and prefill
// the form fields from the OCR output so the TC just has to confirm them.
// The full data URL + OCR JSON travel with the /declare body so trainee +
// employer can cross-check from the same source-of-truth artefact.

import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import VerificationBadge from './_VerificationBadge.jsx'
import { readFileAsDataUrl, ACCEPT_LETTER } from '../../utils/fileUpload.js'
import FilePreview from '../../components/FilePreview.jsx'
import {
  Upload, FileText, CheckCircle2, RefreshCw, AlertTriangle, Loader2,
  IndianRupee, Calendar, MapPin, Briefcase, Building2,
} from 'lucide-react'

const DEFAULT_FORM = {
  traineeId: '', employerId: '', role: '',
  ctcMonthly: 14000,
  joiningDate: new Date().toISOString().slice(0, 10),
  noticePeriod: '30 days',
  venue: '',
  onboardingDate: '',
  placementDate: new Date().toISOString().slice(0, 10),
}

export default function PlacementDeclareCanvas() {
  const { showToast } = useApp()
  const [trainees, setTrainees] = useState([])
  const [employers, setEmployers] = useState([])
  const [placements, setPlacements] = useState([])
  const [step, setStep] = useState('list')          // list | new
  const [form, setForm] = useState(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Offer-letter upload + OCR state
  const [letterDataUrl, setLetterDataUrl] = useState(null)
  const [ocr, setOcr] = useState(null)              // raw OCR JSON
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrError, setOcrError] = useState(null)

  useEffect(() => {
    (async () => {
      const [t, e, p] = await Promise.all([api.trainees(), api.get('/api/employers'), api.placements()])
      setTrainees(t.trainees || [])
      setEmployers(e.employers || [])
      setPlacements(p.placements || [])
    })()
  }, [])

  async function handleFile(file) {
    setOcrError(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setLetterDataUrl(dataUrl)
      setOcrBusy(true)
      const { ocr } = await api.ocrOfferLetter(dataUrl, file.name)
      setOcr(ocr)
      // Prefill form from OCR (TC can still override)
      setForm(f => ({
        ...f,
        role:           ocr.role ?? f.role,
        ctcMonthly:     Number(ocr.salaryMonthly || f.ctcMonthly),
        joiningDate:    ocr.joiningDate     || f.joiningDate,
        placementDate:  ocr.placementDate   || f.placementDate,
        onboardingDate: ocr.onboardingDate  || f.onboardingDate,
        venue:          ocr.venue           || f.venue,
        noticePeriod:   ocr.noticePeriod    || f.noticePeriod,
      }))
    } catch (err) {
      setOcrError(err.message || 'Could not read this file. Try a clearer photo.')
    } finally { setOcrBusy(false) }
  }

  async function submit() {
    if (!form.traineeId || !form.employerId || !form.role) {
      showToast({ kind: 'warn', text: 'Fill trainee, employer, role' }); return
    }
    if (!letterDataUrl) {
      showToast({ kind: 'warn', text: 'Upload the offer letter before declaring' }); return
    }
    setSubmitting(true)
    try {
      await api.declarePlacement({
        traineeId: form.traineeId, employerId: form.employerId, role: form.role,
        ctcMonthly: Number(form.ctcMonthly), joiningDate: form.joiningDate,
        employmentType: 'wage',
        appointmentLetterUrl: letterDataUrl,
        offerLetterOcr: ocr ? {
          ...ocr,
          // freeze any TC edits in the OCR record so they're visible to trainee
          placementDate: form.placementDate,
          onboardingDate: form.onboardingDate,
          joiningDate: form.joiningDate,
          salaryMonthly: Number(form.ctcMonthly),
          noticePeriod: form.noticePeriod,
          venue: form.venue,
          role: form.role,
        } : null,
      })
      showToast({ kind: 'success', text: 'Placement declared. Trainee + employer will be asked to confirm.' })
      const p = await api.placements(); setPlacements(p.placements || [])
      setStep('list'); setForm(DEFAULT_FORM); setLetterDataUrl(null); setOcr(null)
    } catch { showToast({ kind: 'danger', text: 'Could not declare placement.' }) }
    finally { setSubmitting(false) }
  }

  if (step === 'new') {
    return (
      <div className="p-5 space-y-4">
        <button onClick={() => setStep('list')} className="text-xs text-primary-dark">‹ Back to list</button>
        <div>
          <h3 className="text-base font-semibold">Declare a new placement</h3>
          <p className="text-xs text-txt-secondary mt-0.5">
            Upload the offer / appointment letter first — we'll auto-fill the form from it. The trainee will receive the same letter to confirm independently.
          </p>
        </div>

        {/* Step 1 — offer letter upload + OCR */}
        <div className="rounded-2xl border border-bdr bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-txt-primary">
            <FileText className="w-4 h-4 text-violet-600" /> Offer / appointment letter <span className="text-danger">*</span>
          </div>
          {!letterDataUrl && (
            <label className="block">
              <div className="rounded-xl border-2 border-dashed border-bdr px-4 py-6 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/30">
                <Upload className="w-6 h-6 text-violet-600 mx-auto mb-1" />
                <div className="text-[13px] font-bold text-txt-primary">Tap to upload</div>
                <div className="text-[11px] text-txt-secondary mt-1">PDF or photo (JPG / PNG / WebP), up to 4 MB</div>
              </div>
              <input type="file" accept={ACCEPT_LETTER} className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          )}
          {letterDataUrl && (
            <div className="rounded-xl border border-bdr-light bg-surface-page/40 p-3 flex gap-3">
              <FilePreview url={letterDataUrl} alt="offer letter" size="md" />
              <div className="flex-1 text-[12px]">
                {ocrBusy && <div className="inline-flex items-center gap-2 text-violet-700 font-medium"><Loader2 className="w-4 h-4 animate-spin" /> Reading the letter…</div>}
                {!ocrBusy && ocr && (
                  <div>
                    <div className="inline-flex items-center gap-1 text-emerald-700 font-bold"><CheckCircle2 className="w-4 h-4" /> OCR done</div>
                    <div className="text-txt-secondary mt-1">Confidence {Math.round((ocr.confidence || 0.6) * 100)}% — confirm fields below.</div>
                  </div>
                )}
                {ocrError && <div className="inline-flex items-center gap-1 text-danger font-bold"><AlertTriangle className="w-4 h-4" /> {ocrError}</div>}
                <button onClick={() => { setLetterDataUrl(null); setOcr(null); setOcrError(null) }}
                  className="mt-2 text-[11px] inline-flex items-center gap-1 text-txt-secondary hover:text-txt-primary">
                  <RefreshCw className="w-3 h-3" /> Replace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2 — the actual placement form (OCR-prefilled) */}
        <div className="rounded-2xl border border-bdr bg-white p-4 space-y-3">
          <div className="text-[13px] font-bold text-txt-primary">Confirm details</div>
          <Field label="Trainee">
            <select value={form.traineeId} onChange={e => setForm({ ...form, traineeId: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2 text-[13px]">
              <option value="">— select —</option>
              {trainees.map(t => <option key={t.id} value={t.id}>{t.name} · {t.state}</option>)}
            </select>
          </Field>
          <Field label="Employer">
            <select value={form.employerId} onChange={e => setForm({ ...form, employerId: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2 text-[13px]">
              <option value="">— select —</option>
              {employers.map(e => <option key={e.id} value={e.id}>{e.name} · {e.city}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Job role"><input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2 text-[13px]" /></Field>
            <Field label="Monthly CTC (₹)"><input value={form.ctcMonthly} onChange={e => setForm({ ...form, ctcMonthly: e.target.value.replace(/\D/g, '') })} className="w-full border border-bdr-light rounded px-3 py-2 text-[13px]" /></Field>
            <Field label="Placement date"><input type="date" value={form.placementDate?.slice(0, 10) || ''} onChange={e => setForm({ ...form, placementDate: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2 text-[13px]" /></Field>
            <Field label="Onboarding date"><input type="date" value={form.onboardingDate?.slice(0, 10) || ''} onChange={e => setForm({ ...form, onboardingDate: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2 text-[13px]" /></Field>
            <Field label="Joining date"><input type="date" value={form.joiningDate?.slice(0, 10) || ''} onChange={e => setForm({ ...form, joiningDate: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2 text-[13px]" /></Field>
            <Field label="Notice period"><input value={form.noticePeriod} onChange={e => setForm({ ...form, noticePeriod: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2 text-[13px]" /></Field>
          </div>
          <Field label="Venue / work address"><input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2 text-[13px]" /></Field>
        </div>

        <button disabled={submitting || !letterDataUrl} onClick={submit}
          className="w-full py-3 rounded-card bg-primary text-white font-bold disabled:bg-slate-300">
          {submitting ? 'Declaring…' : letterDataUrl ? 'Declare placement' : 'Upload offer letter to continue'}
        </button>
        <div className="text-[11px] text-txt-secondary">
          Once declared, the trainee gets a notification to upload their copy + confirm. The employer gets an independent confirmation request. Payment clock starts only when all three agree.
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Placements you've declared</h3>
          <p className="text-xs text-txt-secondary">{placements.length} total</p>
        </div>
        <button onClick={() => setStep('new')} className="px-3 py-1.5 rounded-card bg-primary text-white text-sm">+ New</button>
      </div>
      <div className="divide-y divide-bdr-light rounded-card border border-bdr-light bg-white">
        {placements.map(p => (
          <div key={p.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{p.trainee?.name} → {p.employer?.name}</div>
              <div className="text-xs text-txt-secondary truncate">{p.role} · ₹{p.ctcMonthly?.toLocaleString('en-IN')}/mo · joined {new Date(p.joiningDate).toLocaleDateString()}</div>
            </div>
            <VerificationBadge state={p.state} />
          </div>
        ))}
        {placements.length === 0 && <div className="p-4 text-sm text-txt-secondary">No placements yet.</div>}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return <label className="block"><div className="text-[11px] font-medium text-txt-secondary mb-1">{label}</div>{children}</label>
}
