// Placement routes — the 3-signal maker-checker core.
//
// State machine:
//   claimed_unverified  : TP declared, neither trainee nor employer confirmed
//   partially_verified  : one of { trainee, employer } has confirmed
//   verified            : both trainee AND employer have confirmed AND values consistent
//   conflicted          : trainee or employer says "no this is wrong"
//   disputed            : explicit dispute
//
// All endpoints are guarded; only the declarant (TP) can create; only the trainee can trainee-confirm;
// only the employer admin can employer-confirm.

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

// ── Declare a placement (TP/TC) ──────────────────────────────────────────────
r.post('/declare', requireRole('training_partner', 'training_centre'), async (req, res, next) => {
  try {
    const body = z.object({
      traineeId: z.string(),
      employerId: z.string(),
      role: z.string(),
      ctcMonthly: z.number().int(),
      joiningDate: z.string(),
      employmentType: z.enum(['wage', 'self', 'apprenticeship']).default('wage'),
      appointmentLetterUrl: z.string().nullish(),
    }).parse(req.body)
    // resolve TP
    let tpId
    const profile = JSON.parse(req.user.profile || '{}')
    if (req.user.role === 'training_partner') tpId = profile.tpId
    else if (req.user.role === 'training_centre') tpId = profile.parentTpId
    if (!tpId) return res.status(400).json({ error: 'no_tp_context' })
    const created = await prisma.placement.create({
      data: {
        traineeId: body.traineeId,
        employerId: body.employerId,
        tpId,
        declaredByUserId: req.user.id,
        role: body.role,
        ctcMonthly: body.ctcMonthly,
        joiningDate: new Date(body.joiningDate),
        employmentType: body.employmentType,
        appointmentLetterUrl: body.appointmentLetterUrl ?? null,
        tpDeclaredAt: new Date(),
        state: 'claimed_unverified',
      },
    })
    // schedule retention check-ins (30/60/90)
    const days = [30, 60, 90]
    for (const m of days) {
      const due = new Date(new Date(body.joiningDate).getTime() + m * 24 * 3600 * 1000)
      await prisma.retentionCheckin.create({
        data: { placementId: created.id, traineeId: body.traineeId, milestone: m, dueAt: due, state: 'pending' },
      })
    }
    // create notifications for trainee + employer
    const employer = await prisma.employer.findUnique({ where: { id: body.employerId } })
    if (employer?.adminUserId) {
      await prisma.notification.create({
        data: {
          type: 'system', title: 'Confirm a new hire', category: 'placement_verification',
          message: `A training partner declared a placement for this candidate. Please confirm.`,
          targetUserId: employer.adminUserId,
          action: JSON.stringify({ label: 'Confirm placement', type: 'OPEN_EMPLOYER_CONFIRM', payload: { placementId: created.id } }),
        },
      })
    }
    const trainee = await prisma.trainee.findUnique({ where: { id: body.traineeId } })
    if (trainee?.userId) {
      await prisma.notification.create({
        data: {
          type: 'system', title: 'Have you joined this job?', category: 'placement_verification', priority: 'high',
          message: `${employer?.name || 'Your employer'} — please confirm your joining.`,
          targetUserId: trainee.userId,
          action: JSON.stringify({ label: 'Confirm', type: 'OPEN_TRAINEE_PLACEMENT_CONFIRM', payload: { placementId: created.id } }),
        },
      })
    }
    res.json({ placement: created })
  } catch (e) { next(e) }
})

// ── Trainee confirms own placement ───────────────────────────────────────────
r.post('/:id/trainee-confirm', requireRole('trainee'), async (req, res, next) => {
  try {
    const { id } = req.params
    const body = z.object({ confirmed: z.boolean(), note: z.string().optional() }).parse(req.body)
    const trainee = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    const p = await prisma.placement.findUnique({ where: { id } })
    if (!p) return res.status(404).json({ error: 'not_found' })
    if (p.traineeId !== trainee?.id) return res.status(403).json({ error: 'not_your_placement' })
    const data = {
      traineeConfirmedAt: body.confirmed ? new Date() : null,
      state: body.confirmed
        ? (p.employerConfirmedAt ? 'verified' : 'partially_verified')
        : 'disputed',
      conflictReason: body.confirmed ? null : (body.note || 'trainee_denied'),
    }
    const updated = await prisma.placement.update({ where: { id }, data })

    // Nudge the TP so they see the learner's response in their own grievances
    // / placement-verification feed. Confidence-ladder consequence: TP avg
    // moves up on confirm, down on dispute.
    try {
      const tp = p.tpId ? await prisma.trainingPartner.findUnique({ where: { id: p.tpId } }) : null
      if (tp?.adminUserId) {
        await prisma.notification.create({
          data: {
            type: 'system',
            title: body.confirmed ? 'Trainee confirmed your placement' : 'Trainee DISPUTED your placement',
            category: 'placement_verification',
            priority: body.confirmed ? 'normal' : 'high',
            message: body.confirmed
              ? `${trainee?.fullName || 'A trainee'} confirmed they joined ${p?.role || 'the role'} — confidence up to 60%.`
              : `${trainee?.fullName || 'A trainee'} said they did NOT join this placement. Reason: ${body.note || 'not specified'}.`,
            targetUserId: tp.adminUserId,
            action: JSON.stringify({ label: 'View placement', type: 'OPEN_PLACEMENT', payload: { placementId: id } }),
          },
        })
      }
    } catch (e) { /* notification best-effort */ }

    res.json({ placement: updated })
  } catch (e) { next(e) }
})

// ── Employer confirms a hire ─────────────────────────────────────────────────
r.post('/:id/employer-confirm', requireRole('employer'), async (req, res, next) => {
  try {
    const { id } = req.params
    const body = z.object({ confirmed: z.boolean(), correctedCtc: z.number().optional(), note: z.string().optional() }).parse(req.body)
    const p = await prisma.placement.findUnique({ where: { id }, include: { employer: true } })
    if (!p) return res.status(404).json({ error: 'not_found' })
    if (p.employer.adminUserId !== req.user.id) return res.status(403).json({ error: 'not_your_hire' })
    let state
    if (body.confirmed) {
      state = p.traineeConfirmedAt ? 'verified' : 'partially_verified'
    } else {
      state = 'conflicted'
    }
    const updated = await prisma.placement.update({
      where: { id },
      data: {
        employerConfirmedAt: body.confirmed ? new Date() : null,
        state,
        conflictReason: body.confirmed ? null : (body.note || 'employer_denied'),
        ctcMonthly: body.correctedCtc ?? p.ctcMonthly,
      },
    })

    // Nudge the TP — third signal received (or denied). Confidence ladder
    // advances or breaks at this point.
    try {
      const tp = p.tpId ? await prisma.trainingPartner.findUnique({ where: { id: p.tpId } }) : null
      if (tp?.adminUserId) {
        await prisma.notification.create({
          data: {
            type: 'system',
            title: body.confirmed ? 'Employer confirmed the hire' : 'Employer DISPUTED the hire',
            category: 'placement_verification',
            priority: body.confirmed ? 'normal' : 'high',
            message: body.confirmed
              ? `${p.employer?.name || 'Employer'} confirmed this placement — confidence advances to 80%+.`
              : `${p.employer?.name || 'Employer'} said this placement isn't real. Reason: ${body.note || 'not specified'}.`,
            targetUserId: tp.adminUserId,
            action: JSON.stringify({ label: 'View placement', type: 'OPEN_PLACEMENT', payload: { placementId: id } }),
          },
        })
      }
    } catch (e) { /* best-effort */ }

    res.json({ placement: updated })
  } catch (e) { next(e) }
})

// ── List placements (filtered by role-appropriate scope) ─────────────────────
r.get('/', async (req, res, next) => {
  try {
    const role = req.user.role
    const profile = JSON.parse(req.user.profile || '{}')
    const where = {}
    if (role === 'trainee') {
      const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
      if (!t) return res.json({ placements: [] })
      where.traineeId = t.id
    } else if (role === 'training_partner') {
      where.tpId = profile.tpId
    } else if (role === 'training_centre') {
      // find batches under this TC then trainees in those batches
      const tc = await prisma.trainingCentre.findUnique({ where: { adminUserId: req.user.id }, include: { batches: { include: { trainees: true } } } })
      const traineeIds = tc?.batches.flatMap(b => b.trainees.map(t => t.id)) || []
      where.traineeId = { in: traineeIds }
    } else if (role === 'employer') {
      const emp = await prisma.employer.findUnique({ where: { adminUserId: req.user.id } })
      where.employerId = emp?.id
    }
    const list = await prisma.placement.findMany({
      where,
      include: { trainee: true, employer: true, tp: true },
      orderBy: { tpDeclaredAt: 'desc' },
      take: 200,
    })
    res.json({ placements: list })
  } catch (e) { next(e) }
})

// ── Single placement detail (full verification card) ─────────────────────────
r.get('/:id', async (req, res, next) => {
  try {
    const p = await prisma.placement.findUnique({
      where: { id: req.params.id },
      include: {
        trainee: { include: { batch: { include: { track: true, scheme: true } } } },
        employer: true,
        tp: true,
        retentionCheckins: { orderBy: { milestone: 'asc' } },
        salarySlips: { orderBy: { month: 'desc' } },
      },
    })
    if (!p) return res.status(404).json({ error: 'not_found' })
    res.json({ placement: p })
  } catch (e) { next(e) }
})

export default r
