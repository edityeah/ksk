// Retention check-ins — monthly cadence over the 12-month post-placement window.
//
// Ownership:
//   - Months 1, 2, 3       : TRAINING CENTRE owns. TC uploads a salary slip
//                            for the month. Trainee must also confirm with
//                            evidence (selfie at venue / ID card / pay slip).
//   - Months 4 .. 12       : TRAINEE owns. System nudges monthly; trainee
//                            confirms with evidence. EPFO auto-check can
//                            short-circuit the human signal.
//
// State machine on a check-in:
//   pending          : nothing yet
//   tc_only          : TC responded, trainee hasn't
//   trainee_only     : trainee responded, TC hasn't (relevant for m4+)
//   dual_confirmed   : both said employed (or any side + EPFO verified)
//   conflicted       : sides disagree
//   epfo_verified    : EPFO confirmed; humans optional

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

function recomputeState(ck) {
  // EPFO is the strongest signal — if verified, mark dual unless both humans
  // explicitly say "not employed".
  const traineeSaysOk = ck.traineeStatus === 'employed'
  const tcSaysOk      = ck.tcStatus === 'employed'
  const empSaysOk     = ck.employerStatus === 'employed'

  if (ck.epfoVerified && (traineeSaysOk || tcSaysOk || (!ck.traineeStatus && !ck.tcStatus))) {
    return 'epfo_verified'
  }

  if (ck.ownerRole === 'training_centre') {
    // months 1-3: TC + trainee must agree
    if (ck.tcRespondedAt && ck.traineeRespondedAt) {
      return tcSaysOk === traineeSaysOk ? 'dual_confirmed' : 'conflicted'
    }
    if (ck.tcRespondedAt)     return 'tc_only'
    if (ck.traineeRespondedAt) return 'trainee_only'
    return 'pending'
  }

  // months 4-12: trainee owns; employer signal optional, EPFO preferred
  if (ck.traineeRespondedAt && ck.employerRespondedAt) {
    return traineeSaysOk === empSaysOk ? 'dual_confirmed' : 'conflicted'
  }
  if (ck.traineeRespondedAt) return 'trainee_only'
  if (ck.employerRespondedAt) return 'employer_only'
  return 'pending'
}

// ── List check-ins due for the calling role ─────────────────────────────────
r.get('/due', requireRole('trainee', 'employer', 'training_centre', 'training_partner'), async (req, res, next) => {
  try {
    const role = req.user.role
    const now = new Date()
    if (role === 'trainee') {
      const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
      if (!t) return res.json({ checkins: [] })
      const ck = await prisma.retentionCheckin.findMany({
        where: { traineeId: t.id, dueAt: { lte: now }, traineeRespondedAt: null },
        include: { placement: { include: { employer: true } } },
        orderBy: { dueAt: 'asc' },
      })
      return res.json({ checkins: ck })
    }
    if (role === 'training_centre') {
      const tc = await prisma.trainingCentre.findUnique({ where: { adminUserId: req.user.id }, include: { batches: { include: { trainees: true } } } })
      const traineeIds = tc?.batches.flatMap(b => b.trainees.map(t => t.id)) || []
      const ck = await prisma.retentionCheckin.findMany({
        where: {
          traineeId: { in: traineeIds },
          ownerRole: 'training_centre',
          tcRespondedAt: null,
          dueAt: { lte: now },
        },
        include: { placement: { include: { employer: true, trainee: true } } },
        orderBy: { dueAt: 'asc' },
      })
      return res.json({ checkins: ck })
    }
    if (role === 'training_partner') {
      const profile = JSON.parse(req.user.profile || '{}')
      const ck = await prisma.retentionCheckin.findMany({
        where: { placement: { tpId: profile.tpId }, state: { in: ['pending', 'conflicted'] } },
        include: { placement: { include: { trainee: true, employer: true } } },
        orderBy: { dueAt: 'asc' },
        take: 50,
      })
      return res.json({ checkins: ck })
    }
    if (role === 'employer') {
      const emp = await prisma.employer.findUnique({ where: { adminUserId: req.user.id } })
      if (!emp) return res.json({ checkins: [] })
      const ck = await prisma.retentionCheckin.findMany({
        where: { placement: { employerId: emp.id }, employerRespondedAt: null, dueAt: { lte: now } },
        include: { placement: { include: { trainee: true } } },
        orderBy: { dueAt: 'asc' },
      })
      return res.json({ checkins: ck })
    }
    res.json({ checkins: [] })
  } catch (e) { next(e) }
})

// ── Training Centre responds with a salary slip + status (months 1-3) ────────
r.post('/:id/tc-respond', requireRole('training_centre', 'training_partner'), async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(['employed', 'not_employed']),
      salarySlipUrl: z.string().min(20).optional(),                // base64 data URL or remote URL
      salarySlipMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      note: z.string().optional(),
    }).parse(req.body)

    const ck = await prisma.retentionCheckin.findUnique({
      where: { id: req.params.id },
      include: { placement: true, trainee: true },
    })
    if (!ck) return res.status(404).json({ error: 'not_found' })

    // Scope check: TC can only respond on its own trainees; TP can override
    // for trainees under it (e.g. if the TC is unresponsive).
    if (req.user.role === 'training_centre') {
      const tc = await prisma.trainingCentre.findUnique({ where: { adminUserId: req.user.id }, include: { batches: { include: { trainees: true } } } })
      const traineeIds = tc?.batches.flatMap(b => b.trainees.map(t => t.id)) || []
      if (!traineeIds.includes(ck.traineeId)) return res.status(403).json({ error: 'not_your_trainee' })
    } else if (req.user.role === 'training_partner') {
      const profile = JSON.parse(req.user.profile || '{}')
      if (ck.placement.tpId !== profile.tpId) return res.status(403).json({ error: 'not_your_tp' })
    }

    // For months 1-3 a salary slip is mandatory when status is "employed".
    if (ck.ownerRole === 'training_centre' && body.status === 'employed' && !body.salarySlipUrl) {
      return res.status(400).json({ error: 'salary_slip_required_for_employed_status' })
    }

    const next = await prisma.retentionCheckin.update({
      where: { id: ck.id },
      data: {
        tcRespondedAt: new Date(),
        tcStatus: body.status,
        tcSalarySlipUrl: body.salarySlipUrl ?? ck.tcSalarySlipUrl,
        tcSalarySlipMonth: body.salarySlipMonth ?? ck.tcSalarySlipMonth,
        tcNote: body.note ?? ck.tcNote,
      },
    })
    const finalState = recomputeState(next)
    const persisted = await prisma.retentionCheckin.update({ where: { id: ck.id }, data: { state: finalState } })

    // If TC has uploaded a slip, also mirror it onto the SalarySlip table so
    // dashboards / NSDC officer flows can browse them as first-class records.
    if (body.salarySlipUrl) {
      try {
        await prisma.salarySlip.create({
          data: {
            placementId: ck.placementId,
            traineeId: ck.traineeId,
            month: body.salarySlipMonth || new Date().toISOString().slice(0, 7),
            grossSalary: ck.placement.ctcMonthly,
            employerName: '(from slip)',
            fileUrl: body.salarySlipUrl,
            state: 'uploaded',
          },
        })
      } catch { /* duplicate month — fine */ }
    }

    // Nudge the trainee to confirm
    try {
      const trainee = await prisma.trainee.findUnique({ where: { id: ck.traineeId } })
      if (trainee?.userId) {
        await prisma.notification.create({
          data: {
            type: 'system', title: `Confirm your month ${ck.milestone} status`,
            category: 'retention', priority: 'high',
            message: 'Your training centre uploaded a salary slip for this month. Please confirm whether you are still employed and upload evidence.',
            targetUserId: trainee.userId,
            action: JSON.stringify({ label: 'Confirm', type: 'OPEN_RETENTION', payload: { checkinId: ck.id } }),
          },
        })
      }
    } catch { /* best-effort */ }

    res.json({ checkin: persisted })
  } catch (e) { next(e) }
})

// ── Trainee responds ─────────────────────────────────────────────────────────
r.post('/:id/trainee-respond', requireRole('trainee'), async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(['employed', 'not_employed', 'switched']),
      note: z.string().optional(),
      evidenceUrl: z.string().min(20).optional(),                  // selfie / ID card / pay slip
    }).parse(req.body)
    const ck = await prisma.retentionCheckin.findUnique({ where: { id: req.params.id } })
    if (!ck) return res.status(404).json({ error: 'not_found' })
    const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    if (!t || ck.traineeId !== t.id) return res.status(403).json({ error: 'forbidden' })

    const next = await prisma.retentionCheckin.update({
      where: { id: ck.id },
      data: {
        traineeRespondedAt: new Date(),
        traineeStatus: body.status,
        traineeNote: body.note ?? null,
        traineeEvidenceUrl: body.evidenceUrl ?? ck.traineeEvidenceUrl,
      },
    })
    const finalState = recomputeState(next)
    const persisted = await prisma.retentionCheckin.update({ where: { id: ck.id }, data: { state: finalState } })
    res.json({ checkin: persisted })
  } catch (e) { next(e) }
})

// ── Employer responds (legacy 90-day path; still allowed) ───────────────────
r.post('/:id/employer-respond', requireRole('employer'), async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(['employed', 'not_employed']),
      note: z.string().optional(),
    }).parse(req.body)
    const ck = await prisma.retentionCheckin.findUnique({ where: { id: req.params.id }, include: { placement: { include: { employer: true } } } })
    if (!ck) return res.status(404).json({ error: 'not_found' })
    if (ck.placement.employer.adminUserId !== req.user.id) return res.status(403).json({ error: 'forbidden' })
    const next = await prisma.retentionCheckin.update({
      where: { id: ck.id },
      data: { employerRespondedAt: new Date(), employerStatus: body.status, employerNote: body.note ?? null },
    })
    const finalState = recomputeState(next)
    const persisted = await prisma.retentionCheckin.update({ where: { id: ck.id }, data: { state: finalState } })
    res.json({ checkin: persisted })
  } catch (e) { next(e) }
})

// ── List ALL check-ins for a placement (for dashboards / trainee history) ────
r.get('/by-placement/:placementId', async (req, res, next) => {
  try {
    const list = await prisma.retentionCheckin.findMany({
      where: { placementId: req.params.placementId },
      orderBy: { milestone: 'asc' },
    })
    res.json({ checkins: list })
  } catch (e) { next(e) }
})

export default r
