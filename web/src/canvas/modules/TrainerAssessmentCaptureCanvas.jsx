// Trainer · Assessment Scanner — Capture
//
// Flow:
//   1. Trainer picks a batch + student from their roster
//   2. Uploads or shoots an image of the marked answer sheet
//   3. We call /api/trainer-assessments/scan → OpenAI Vision OCR
//   4. During the round-trip, a scanning-progress overlay plays
//      (mirrors the XAMTA-scanner UX shown to us)
//   5. Trainer reviews the extracted totals, edits if needed,
//      then Saves → /api/trainer-assessments POST
//
// Nothing is persisted until the trainer confirms the extracted values.

import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import {
  Loader2, Upload, Camera, ChevronDown, X, CheckCircle2, RefreshCw, Sparkles,
  ScanLine, Save, Users, ClipboardList, ArrowRight,
} from 'lucide-react'

// Resize an image file to ≤1600px on the longest edge, JPEG @ 82% quality.
// Keeps the payload under ~2MB base64 (the /scan cap) while preserving
// enough sharpness for OCR of handwritten marks.
async function imageFileToDataUrl(file, maxEdge = 1600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read_failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode_failed'))
      img.onload = () => {
        const ratio = Math.min(maxEdge / img.width, maxEdge / img.height, 1)
        const w = Math.round(img.width  * ratio)
        const h = Math.round(img.height * ratio)
        const cv = document.createElement('canvas')
        cv.width = w; cv.height = h
        cv.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(cv.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// Four stages we surface in the scan overlay. Each has a label + minimum
// dwell time (ms) so the progress feels grounded even when the model is
// fast. Total floor ≈ 2.4s; a slow OCR call may add on top.
const SCAN_STAGES = [
  { pct:  20, label: 'Reading the paper…',        dwellMs: 500 },
  { pct:  55, label: 'Matching with answer key…', dwellMs: 700 },
  { pct:  85, label: 'Computing marks…',          dwellMs: 700 },
  { pct: 100, label: 'Finalising…',               dwellMs: 500 },
]

export default function TrainerAssessmentCaptureCanvas() {
  const { showToast, openCanvas } = useApp()

  const [roster, setRoster]     = useState([])   // [{ id, name, trainees: [...] }]
  const [loadingRoster, setLoadingRoster] = useState(true)
  const [rosterError, setRosterError] = useState('')

  const [batchId,    setBatchId]    = useState('')
  const [traineeId,  setTraineeId]  = useState('')
  const [title,      setTitle]      = useState('')
  const [totalMarks, setTotalMarks] = useState(100)
  const [image,      setImage]      = useState(null)     // data URL preview
  const [imageName,  setImageName]  = useState(null)

  const [scanState, setScanState] = useState('idle')    // idle | scanning | done | error
  const [scanStage, setScanStage] = useState(0)         // index into SCAN_STAGES
  const [scanError, setScanError] = useState('')
  const [result,    setResult]    = useState(null)      // scored/total/percentage/grade/…
  const [saving,    setSaving]    = useState(false)

  const fileRef = useRef(null)
  const cameraRef = useRef(null)

  // ── Load the trainer's roster on mount ──────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoadingRoster(true); setRosterError('')
    api.get('/api/trainer-assessments/roster')
      .then(r => {
        if (cancelled) return
        const batches = (r?.batches || []).filter(b => b.trainees && b.trainees.length > 0)
        setRoster(batches)
        // Default-select the first batch with trainees so the flow feels
        // primed the moment the canvas opens.
        if (batches.length && !batchId) {
          setBatchId(batches[0].id)
          if (batches[0].trainees.length) setTraineeId(batches[0].trainees[0].id)
        }
      })
      .catch(e => { if (!cancelled) setRosterError(e?.message || 'roster_failed') })
      .finally(() => { if (!cancelled) setLoadingRoster(false) })
    return () => { cancelled = true }
  }, [])

  const currentBatch = useMemo(() => roster.find(b => b.id === batchId), [roster, batchId])
  const currentTrainee = useMemo(
    () => currentBatch?.trainees.find(t => t.id === traineeId),
    [currentBatch, traineeId],
  )

  async function onFile(e, opts) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!/^image\//.test(f.type)) {
      showToast?.({ msg: 'Please choose an image file', type: 'error' })
      return
    }
    try {
      const dataUrl = await imageFileToDataUrl(f)
      setImage(dataUrl)
      setImageName(f.name || (opts?.source === 'camera' ? 'photo.jpg' : 'upload.jpg'))
      setResult(null)
      setScanState('idle')
    } catch {
      showToast?.({ msg: 'Could not read that image', type: 'error' })
    }
  }

  function clearImage() {
    setImage(null); setImageName(null); setResult(null); setScanState('idle')
  }

  // Drives the multi-stage progress overlay. Deliberately time-boxed so
  // the UI can't sit at 0% forever if OpenAI is slow — each stage
  // advances on its own timer, and the actual API response is awaited
  // in parallel. When the response lands, we jump to 100%.
  async function runScan() {
    if (!image || !traineeId || !batchId) return
    setScanState('scanning'); setScanStage(0); setScanError(''); setResult(null)

    // Kick off the API call
    const apiPromise = api.post('/api/trainer-assessments/scan', {
      image,
      hintTitle:      title || undefined,
      hintTotalMarks: Number(totalMarks) || undefined,
    })

    // Advance the stage bar; each stage waits its minimum dwell.
    let stageIdx = 0
    const stageTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, SCAN_STAGES.length - 1)
      setScanStage(stageIdx)
    }, 700)

    try {
      const r = await apiPromise
      clearInterval(stageTimer)
      setScanStage(SCAN_STAGES.length - 1)
      // Small settle-delay so the "Finalising…" beat is visible.
      await new Promise(res => setTimeout(res, 400))
      setResult(r)
      setScanState('done')
      // If the OCR guessed a student name, and it maps to a trainee in
      // this batch, auto-select them.
      const guess = (r?.studentNameGuess || '').toLowerCase().trim()
      if (guess && currentBatch) {
        const match = currentBatch.trainees.find(t => t.name.toLowerCase().includes(guess) || guess.includes(t.name.toLowerCase()))
        if (match && match.id !== traineeId) setTraineeId(match.id)
      }
    } catch (e) {
      clearInterval(stageTimer)
      setScanState('error')
      setScanError(e?.message || 'scan_failed')
    }
  }

  async function saveAssessment() {
    if (!result || !traineeId || !batchId) return
    setSaving(true)
    try {
      const body = {
        batchId,
        traineeId,
        title: title || (currentTrainee ? `Assessment for ${currentTrainee.name}` : 'Assessment'),
        totalMarks:    Number(result.totalMarks),
        scoredMarks:   Number(result.scoredMarks),
        method:        'scan',
        scanImage:     image || undefined,
        ocrConfidence: result.confidence,
        ocrExtract:    result.rawExtract,
      }
      await api.post('/api/trainer-assessments', body)
      showToast?.({ msg: `Saved: ${currentTrainee?.name || 'assessment'} — ${result.scoredMarks}/${result.totalMarks}`, type: 'success' })
      // Reset for the next capture but keep batch selection.
      clearImage()
      setTitle('')
    } catch (e) {
      showToast?.({ msg: e?.message || 'Save failed', type: 'error' })
    } finally { setSaving(false) }
  }

  // Manual score edit — trainer overrides the OCR result before saving.
  function editScoredMarks(delta) {
    setResult(r => {
      if (!r) return r
      const next = Math.max(0, Math.min(r.totalMarks, r.scoredMarks + delta))
      const pct  = Number(((next / r.totalMarks) * 100).toFixed(1))
      const grade = bandFromPercent(pct)
      return { ...r, scoredMarks: next, percentage: pct, grade }
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-amber-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-amber-700 inline-flex items-center gap-1">
          <ScanLine className="w-3 h-3" /> Trainer · Assessment Scanner
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">
          Capture a marked answer sheet
        </h2>
        <div className="text-[12px] text-txt-secondary mt-1 max-w-2xl">
          Pick a student, take a photo of their marked paper, and let the OCR extract the score. Review it, then save — the mark goes straight into that trainee's record.
        </div>
      </div>

      {/* Roster loading / error */}
      {loadingRoster && (
        <div className="p-6 text-center text-[13px] text-txt-secondary inline-flex items-center gap-2 mx-auto">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your batches…
        </div>
      )}
      {!loadingRoster && rosterError && (
        <div className="m-4 rounded-2xl border border-rose-200 bg-rose-50/40 p-5 text-[13px] text-rose-700">
          Couldn't load your roster: <span className="font-mono text-[11px]">{rosterError}</span>
        </div>
      )}
      {!loadingRoster && !rosterError && roster.length === 0 && (
        <div className="m-4 rounded-2xl border border-dashed border-bdr-light bg-surface-page/30 p-6 text-center">
          <Users className="w-6 h-6 text-txt-tertiary mx-auto" />
          <div className="text-[14px] font-bold text-txt-primary mt-2">No batches assigned yet</div>
          <div className="text-[12px] text-txt-secondary mt-1 max-w-md mx-auto">
            You need at least one active batch with trainees to start capturing assessments. Ask your Centre Head to assign you one.
          </div>
        </div>
      )}

      {/* Main body */}
      {!loadingRoster && !rosterError && roster.length > 0 && (
        <div className="p-4 space-y-4">

          {/* Step 1 — pick batch + student */}
          <StepCard n={1} label="Pick a batch and student">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                label="Batch"
                value={batchId}
                onChange={v => { setBatchId(v); const b = roster.find(x => x.id === v); if (b?.trainees?.[0]) setTraineeId(b.trainees[0].id) }}
                options={roster.map(b => ({ value: b.id, label: `${b.code} · ${b.name}${b.track ? ` (${b.track})` : ''}` }))}
              />
              <Select
                label="Student"
                value={traineeId}
                onChange={setTraineeId}
                options={(currentBatch?.trainees || []).map(t => ({ value: t.id, label: `${t.name}${t.district ? ` · ${t.district}` : ''}` }))}
              />
            </div>
          </StepCard>

          {/* Step 2 — image + optional title/marks */}
          <StepCard n={2} label="Upload or click a photo of the answer sheet">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              <div>
                {!image ? (
                  <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-6 text-center">
                    <Upload className="w-5 h-5 text-amber-600 mx-auto" />
                    <div className="text-[13px] text-txt-primary mt-2 font-bold">Add the marked paper</div>
                    <div className="text-[12px] text-txt-tertiary mt-1">JPG or PNG. Handwritten marks are fine.</div>
                    <div className="flex items-center gap-2 justify-center mt-3">
                      <button onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-white border border-amber-300 text-amber-800 text-[12px] font-bold hover:bg-amber-50">
                        <Upload className="w-3.5 h-3.5" /> Upload
                      </button>
                      <button onClick={() => cameraRef.current?.click()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-amber-600 text-white text-[12px] font-bold hover:bg-amber-700">
                        <Camera className="w-3.5 h-3.5" /> Take photo
                      </button>
                    </div>
                    <input ref={fileRef}   type="file" accept="image/*"                   onChange={e => onFile(e, { source: 'upload' })} hidden />
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={e => onFile(e, { source: 'camera' })} hidden />
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-bdr-light bg-slate-900">
                    <img src={image} alt={imageName || 'paper'} className="w-full max-h-80 object-contain bg-slate-900" />
                    <button onClick={clearImage}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white inline-flex items-center justify-center hover:bg-black/80">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {imageName && (
                      <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white/80 bg-black/40 rounded px-2 py-0.5">
                        {imageName}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <TextField label="Assessment title (optional)"
                  placeholder="e.g. Chapter 3 – Retail SOP quiz"
                  value={title} onChange={setTitle} />
                <NumberField label="Total marks (hint for OCR)"
                  value={totalMarks} onChange={v => setTotalMarks(Math.max(1, Number(v) || 100))} />
                <button
                  onClick={runScan}
                  disabled={!image || !traineeId || scanState === 'scanning'}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-pill bg-amber-600 text-white text-[13px] font-bold disabled:opacity-40 hover:bg-amber-700 transition">
                  {scanState === 'scanning' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {scanState === 'scanning' ? 'Scanning…' : 'Scan this paper'}
                </button>
                {scanState === 'error' && (
                  <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                    Scan failed: <span className="font-mono text-[11px]">{scanError}</span>
                  </div>
                )}
              </div>
            </div>
          </StepCard>

          {/* Step 3 — review + save */}
          {result && (
            <StepCard n={3} label="Review the extracted score" tone="emerald">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <StatTile label="Scored" value={`${result.scoredMarks}`} adjust={{ inc: () => editScoredMarks(1), dec: () => editScoredMarks(-1) }} />
                <StatTile label="Out of" value={`${result.totalMarks}`} />
                <StatTile label="Percentage" value={`${result.percentage}%`} accent />
                <StatTile label="Grade" value={result.grade || '—'} accent />
              </div>
              {result.confidence != null && (
                <div className="text-[11px] text-txt-tertiary mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3 h-3 ${result.confidence >= 0.7 ? 'text-emerald-600' : 'text-amber-600'}`} />
                  OCR confidence: {(result.confidence * 100).toFixed(0)}%
                  {result.notes && <span className="text-txt-secondary italic">· {result.notes}</span>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={saveAssessment}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-emerald-600 text-white text-[13px] font-bold disabled:opacity-50 hover:bg-emerald-700">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving…' : `Save mark for ${currentTrainee?.name || 'this student'}`}
                </button>
                <button
                  onClick={runScan}
                  disabled={scanState === 'scanning'}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-pill bg-white border border-bdr text-txt-secondary text-[12px] hover:bg-slate-50">
                  <RefreshCw className="w-3 h-3" /> Re-scan
                </button>
              </div>
            </StepCard>
          )}

          {/* Handy shortcut back to the dashboard */}
          <div className="text-center pt-2">
            <button
              onClick={() => openCanvas({ type: 'trainer_assessment_view' })}
              className="inline-flex items-center gap-1 text-[12px] text-amber-700 hover:underline">
              <ClipboardList className="w-3.5 h-3.5" />
              See all assessments you've captured
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Scan-progress overlay */}
      {scanState === 'scanning' && image && (
        <ScanOverlay stage={SCAN_STAGES[scanStage]} totalStages={SCAN_STAGES.length} imageName={imageName} />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StepCard({ n, label, tone, children }) {
  const t = tone === 'emerald'
    ? { bg: 'from-emerald-50/60', ring: 'border-emerald-200', num: 'bg-emerald-600' }
    : { bg: 'from-amber-50/40',   ring: 'border-bdr-light',    num: 'bg-amber-600' }
  return (
    <div className={`rounded-2xl border ${t.ring} bg-gradient-to-br ${t.bg} to-white p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-5 h-5 rounded-full ${t.num} text-white text-[11px] font-bold inline-flex items-center justify-center`}>{n}</span>
        <span className="text-[11px] uppercase tracking-wider font-bold text-txt-secondary">{label}</span>
      </div>
      {children}
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-[11px] text-txt-tertiary font-medium mb-1">{label}</div>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-bdr bg-white px-3 py-2 pr-8 text-[13px] text-txt-primary focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        >
          {options.length === 0 && <option value="">(nothing to pick)</option>}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="w-4 h-4 text-txt-tertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </label>
  )
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <div className="text-[11px] text-txt-tertiary font-medium mb-1">{label}</div>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-bdr bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
    </label>
  )
}
function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <div className="text-[11px] text-txt-tertiary font-medium mb-1">{label}</div>
      <input type="number" min={1} max={1000} value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-bdr bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
    </label>
  )
}

function StatTile({ label, value, accent, adjust }) {
  return (
    <div className={`rounded-xl border ${accent ? 'border-emerald-200 bg-emerald-50/60' : 'border-bdr-light bg-white'} px-3 py-2`}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary">{label}</div>
      <div className="flex items-center gap-2 mt-0.5">
        <div className={`text-[18px] font-bold tabular-nums ${accent ? 'text-emerald-700' : 'text-txt-primary'}`}>{value}</div>
        {adjust && (
          <div className="ml-auto flex items-center gap-1">
            <button onClick={adjust.dec} className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-[11px]">−</button>
            <button onClick={adjust.inc} className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-[11px]">+</button>
          </div>
        )}
      </div>
    </div>
  )
}

// Full-canvas overlay that plays while the /scan request is in flight.
// Deliberately blocks interaction — the trainer shouldn't touch the form
// mid-scan, and the modal reinforces that the model is doing real work.
function ScanOverlay({ stage, totalStages, imageName }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[3px] text-amber-300 font-bold">
            KSK Assessment Scanner
          </div>
          <div className="text-[18px] font-bold text-white mt-1">Scanning in progress…</div>
        </div>

        {/* Scan window with a moving laser line */}
        <div className="relative mt-5 rounded-2xl border-2 border-amber-400/60 bg-slate-900/60 overflow-hidden aspect-[4/3] shadow-2xl">
          <div className="absolute inset-0 grid place-items-center text-slate-600 text-[10px] font-mono">
            {imageName || 'paper.jpg'}
          </div>
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-b from-amber-400 to-amber-400/0 animate-scanline" />
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-amber-300" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-amber-300" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-amber-300" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-amber-300" />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[12px] mb-1.5">
            <span className="text-amber-200 font-medium">{stage.label}</span>
            <span className="text-amber-200 tabular-nums">{stage.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full bg-amber-400 transition-all duration-700 ease-out" style={{ width: `${stage.pct}%` }} />
          </div>
          <div className="text-[10px] text-slate-400 text-center mt-2">
            Processing with KSK Assessment Engine
          </div>
        </div>
      </div>

      {/* Local keyframes for the scanline. Inlined so we don't need a
          global CSS edit. */}
      <style>{`
        @keyframes scanline-move {
          0%   { transform: translateY(0);   opacity: 1; }
          50%  { opacity: 1; }
          100% { transform: translateY(300px); opacity: 0.4; }
        }
        .animate-scanline { animation: scanline-move 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

// Mirror of bandFromPercent in server/src/routes/trainerAssessments.js —
// re-applied on the client only when the trainer edits scored marks after
// the OCR, so grade + percentage stay consistent without a re-fetch.
function bandFromPercent(pct) {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 40) return 'D'
  return 'F'
}
