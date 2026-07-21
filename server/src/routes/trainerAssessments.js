// /api/trainer-assessments — in-class assessments captured by the trainer
// (OCR of a paper answer sheet OR manual entry).
//
// Endpoints:
//   POST /scan     → run OCR on a captured image; returns extracted totals
//                    but does NOT save (trainer reviews first)
//   POST /         → persist a final row (either from OCR or manual)
//   GET  /         → list — filtered to the trainer's batches
//   GET  /roster   → trainee list the trainer can score (from their batches)
//   GET  /stats    → dashboard aggregates (avg %, bands, per-batch trends)
//   DELETE /:id    → remove a saved row (author-only)

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'
import { hasOpenAI, openai } from '../llm/openai.js'

const r = Router()
r.use(requireAuth)

// Every write endpoint is trainer-only. The read endpoints are also trainer-
// only for now — a trainee-facing view of their scores can be layered on
// later (they'd need to see aggregates for their own userId only).
const requireTrainer = requireRole('trainer')

// Convenience — grade band from a percentage. Matches the labels most Indian
// skilling programs use.
function bandFromPercent(pct) {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 40) return 'D'
  return 'F'
}

// ── GET /roster — trainees this trainer can score ─────────────────────────
// Returns the union of trainees across all batches the trainer owns, so the
// Capture flow's "pick a student" dropdown can populate without hitting
// multiple endpoints. Includes minimal batch context so the UI can group.
r.get('/roster', requireTrainer, async (req, res, next) => {
  try {
    const batches = await prisma.batch.findMany({
      where: { trainerId: req.user.id },
      include: {
        track:    { select: { name: true } },
        trainees: {
          select: { id: true, name: true, aadhaar: true, gender: true, district: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
    })
    res.json({
      batches: batches.map(b => ({
        id:        b.id,
        code:      b.code,
        name:      b.name,
        track:     b.track?.name || null,
        state:     b.state,
        trainees:  b.trainees.map(t => ({
          id:       t.id,
          name:     t.name,
          aadhaar:  t.aadhaar ? `XXXXXXXX${t.aadhaar.slice(-4)}` : null,
          gender:   t.gender,
          district: t.district,
        })),
      })),
    })
  } catch (e) { next(e) }
})

// ── POST /scan — OCR an answer-sheet image ────────────────────────────────
// Body: { image: 'data:image/jpeg;base64,…', hintTitle?, hintTotalMarks? }
// Returns: { totalMarks, scoredMarks, percentage, grade, studentNameGuess?,
//            perQuestion?, confidence, rawExtract }
//
// We deliberately return EXTRACTED but not-persisted data. Trainer reviews
// on the client, edits if needed, then calls POST / to save. This mirrors
// the OCR-then-ack pattern used for placement offer letters.
r.post('/scan', requireTrainer, async (req, res, next) => {
  try {
    const body = z.object({
      image:          z.string().min(50),           // data URL
      hintTitle:      z.string().max(200).optional(),
      hintTotalMarks: z.number().int().min(1).max(1000).optional(),
    }).parse(req.body || {})

    if (!hasOpenAI()) return res.status(503).json({ error: 'openai_not_configured' })

    const totalHint = body.hintTotalMarks
      ? `The paper is out of ${body.hintTotalMarks} marks. Use this as the ground truth if the OCR is ambiguous about the total.`
      : 'Infer the total marks from the answer key / question paper if visible; otherwise assume 100.'

    const system = [
      'You are an OCR + scoring engine for an Indian skilling programme.',
      'The trainer has photographed a MARKED answer sheet. Read the marks the trainer has written and extract a structured score.',
      totalHint,
      'Return JSON ONLY, no markdown. Schema:',
      '{',
      '  "student_name":     string | null,      // the name written on the sheet, or null',
      '  "total_marks":      integer,',
      '  "scored_marks":     integer,',
      '  "per_question":     [{"q": integer, "scored": number, "outOf": number}] | null,',
      '  "confidence":       number,             // 0..1 — how sure you are',
      '  "notes":            string | null       // one short line if something looked ambiguous',
      '}',
      'If the sheet is unreadable, return confidence < 0.3 and best-effort numbers.',
    ].join('\n')

    let raw = ''
    let parsed = null
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: [
            { type: 'text', text: 'Extract the marks from this answer sheet.' },
            { type: 'image_url', image_url: { url: body.image, detail: 'high' } },
          ] },
        ],
        max_tokens: 500,
        temperature: 0.1,
      })
      raw = resp.choices?.[0]?.message?.content || ''
      parsed = JSON.parse(raw)
    } catch (e) {
      console.error('[trainer-assessments/scan] OCR failed', e?.message || e)
      return res.status(502).json({ error: 'ocr_failed', detail: String(e?.message || e).slice(0, 200) })
    }

    const total  = Math.max(1, Number(parsed.total_marks)  || 100)
    const scored = Math.min(total, Math.max(0, Number(parsed.scored_marks) || 0))
    const pct    = Number(((scored / total) * 100).toFixed(1))
    const grade  = bandFromPercent(pct)
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0))

    res.json({
      studentNameGuess: parsed.student_name || null,
      totalMarks:  total,
      scoredMarks: scored,
      percentage:  pct,
      grade,
      perQuestion: Array.isArray(parsed.per_question) ? parsed.per_question.slice(0, 50) : null,
      confidence,
      notes:       parsed.notes || null,
      rawExtract:  raw,
    })
  } catch (e) { next(e) }
})

// ── POST / — persist a final assessment row ───────────────────────────────
// The client may or may not include the scan image. When present, we store
// it — useful for the View dashboard's "see original" affordance. Also
// caps at ~1.8MB base64 so a runaway image can't fill the DB.
r.post('/', requireTrainer, async (req, res, next) => {
  try {
    const body = z.object({
      batchId:       z.string(),
      traineeId:     z.string(),
      title:         z.string().min(1).max(200),
      subject:       z.string().max(80).optional(),
      totalMarks:    z.number().int().min(1).max(1000),
      scoredMarks:   z.number().int().min(0).max(1000),
      method:        z.enum(['scan', 'manual']).default('scan'),
      scanImage:     z.string().max(2_500_000).optional(),
      ocrConfidence: z.number().min(0).max(1).optional(),
      ocrExtract:    z.string().max(20000).optional(),
      notes:         z.string().max(2000).optional(),
      conductedAt:   z.string().datetime().optional(),
    }).parse(req.body || {})

    if (body.scoredMarks > body.totalMarks) {
      return res.status(400).json({ error: 'scored_exceeds_total' })
    }

    // Confirm the trainer owns this batch — no cross-batch scoring.
    const batch = await prisma.batch.findUnique({ where: { id: body.batchId } })
    if (!batch || batch.trainerId !== req.user.id) {
      return res.status(403).json({ error: 'not_your_batch' })
    }
    // Confirm the trainee is actually in that batch.
    const trainee = await prisma.trainee.findUnique({ where: { id: body.traineeId } })
    if (!trainee || trainee.batchId !== body.batchId) {
      return res.status(400).json({ error: 'trainee_not_in_batch' })
    }

    const percentage = Number(((body.scoredMarks / body.totalMarks) * 100).toFixed(1))
    const grade = bandFromPercent(percentage)

    const row = await prisma.trainerAssessment.create({
      data: {
        batchId:       body.batchId,
        traineeId:     body.traineeId,
        trainerId:     req.user.id,
        title:         body.title,
        subject:       body.subject || null,
        totalMarks:    body.totalMarks,
        scoredMarks:   body.scoredMarks,
        percentage,
        grade,
        method:        body.method,
        scanImage:     body.scanImage || null,
        ocrConfidence: body.ocrConfidence ?? null,
        ocrExtract:    body.ocrExtract || null,
        notes:         body.notes || null,
        conductedAt:   body.conductedAt ? new Date(body.conductedAt) : new Date(),
      },
      include: { trainee: { select: { name: true } }, batch: { select: { code: true, name: true } } },
    })
    res.status(201).json({ assessment: shape(row) })
  } catch (e) { next(e) }
})

// ── GET / — list (default: newest 50) ─────────────────────────────────────
// Query: ?batchId= ?traineeId= ?limit=
r.get('/', requireTrainer, async (req, res, next) => {
  try {
    const where = { trainerId: req.user.id }
    if (req.query.batchId)   where.batchId   = String(req.query.batchId)
    if (req.query.traineeId) where.traineeId = String(req.query.traineeId)
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    const rows = await prisma.trainerAssessment.findMany({
      where,
      include: {
        trainee: { select: { name: true, gender: true, district: true } },
        batch:   { select: { code: true, name: true } },
      },
      orderBy: { conductedAt: 'desc' },
      take: limit,
    })
    res.json({ assessments: rows.map(shape) })
  } catch (e) { next(e) }
})

// ── GET /stats — dashboard aggregates ─────────────────────────────────────
// Per-batch avg, distribution, top / bottom performers, per-day counts. All
// computed in-memory on the trainer's own rows; row counts are small (~100s
// per trainer) so this is fine without SQL aggregation.
r.get('/stats', requireTrainer, async (req, res, next) => {
  try {
    const rows = await prisma.trainerAssessment.findMany({
      where: { trainerId: req.user.id },
      include: {
        trainee: { select: { id: true, name: true } },
        batch:   { select: { id: true, code: true, name: true } },
      },
      orderBy: { conductedAt: 'desc' },
    })

    if (!rows.length) {
      return res.json({
        total:     0,
        avgPct:    null,
        grades:    { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 },
        perBatch:  [],
        topTrainees:    [],
        bottomTrainees: [],
        recent:    [],
      })
    }

    const total = rows.length
    const avgPct = Number((rows.reduce((s, r) => s + r.percentage, 0) / total).toFixed(1))

    const grades = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 }
    for (const r of rows) grades[r.grade || 'F'] = (grades[r.grade || 'F'] || 0) + 1

    // Per-batch aggregation.
    const batchMap = new Map()
    for (const r of rows) {
      const b = batchMap.get(r.batch.id) || {
        id:    r.batch.id,
        code:  r.batch.code,
        name:  r.batch.name,
        count: 0,
        sum:   0,
      }
      b.count += 1
      b.sum   += r.percentage
      batchMap.set(r.batch.id, b)
    }
    const perBatch = [...batchMap.values()]
      .map(b => ({ id: b.id, code: b.code, name: b.name, count: b.count, avgPct: Number((b.sum / b.count).toFixed(1)) }))
      .sort((a, b) => b.count - a.count)

    // Per-trainee: latest score + running avg.
    const tMap = new Map()
    for (const r of rows) {
      const t = tMap.get(r.trainee.id) || {
        id:       r.trainee.id,
        name:     r.trainee.name,
        count:    0,
        sum:      0,
        latest:   r.percentage,
        latestAt: r.conductedAt,
      }
      t.count += 1
      t.sum   += r.percentage
      // rows are sorted desc, so first-seen is latest
      if (t.count === 1) { t.latest = r.percentage; t.latestAt = r.conductedAt }
      tMap.set(r.trainee.id, t)
    }
    const trainees = [...tMap.values()].map(t => ({
      id:       t.id,
      name:     t.name,
      count:    t.count,
      avgPct:   Number((t.sum / t.count).toFixed(1)),
      latest:   t.latest,
      latestAt: t.latestAt,
    }))
    const topTrainees    = [...trainees].sort((a, b) => b.avgPct - a.avgPct).slice(0, 5)
    const bottomTrainees = [...trainees].sort((a, b) => a.avgPct - b.avgPct).slice(0, 5)

    // Last 10 for the "Recent activity" strip.
    const recent = rows.slice(0, 10).map(shape)

    res.json({ total, avgPct, grades, perBatch, topTrainees, bottomTrainees, recent })
  } catch (e) { next(e) }
})

// ── DELETE /:id — remove a saved row (own only) ───────────────────────────
r.delete('/:id', requireTrainer, async (req, res, next) => {
  try {
    const row = await prisma.trainerAssessment.findUnique({ where: { id: req.params.id } })
    if (!row) return res.status(404).json({ error: 'not_found' })
    if (row.trainerId !== req.user.id) return res.status(403).json({ error: 'not_yours' })
    await prisma.trainerAssessment.delete({ where: { id: row.id } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// ── Shape helper ──────────────────────────────────────────────────────────
function shape(row) {
  return {
    id:            row.id,
    batchId:       row.batchId,
    batchCode:     row.batch?.code || null,
    batchName:     row.batch?.name || null,
    traineeId:     row.traineeId,
    traineeName:   row.trainee?.name || null,
    title:         row.title,
    subject:       row.subject,
    totalMarks:    row.totalMarks,
    scoredMarks:   row.scoredMarks,
    percentage:    row.percentage,
    grade:         row.grade,
    method:        row.method,
    hasScanImage:  !!row.scanImage,
    ocrConfidence: row.ocrConfidence,
    notes:         row.notes,
    conductedAt:   row.conductedAt,
    createdAt:     row.createdAt,
  }
}

export default r
