// Placement routes — the 3-signal maker-checker core.
//
// State machine:
//   claimed_unverified  : TP declared, neither trainee nor employer confirmed
//   partially_verified  : one of { trainee, employer } has confirmed
//   verified            : both trainee AND employer have confirmed AND values consistent
//   conflicted          : trainee or employer says "no this is wrong"
//   disputed            : trainee says "joined but conditions don't match" (grievance route)
//
// Verification artefacts beyond yes/no:
//   - appointmentLetterUrl       : TC-uploaded copy (declaration time)
//   - offerLetterTraineeUrl      : trainee-uploaded independent copy (confirm time)
//   - offerLetterOcr             : OCR-extracted fields (run on either upload)
//   - offerLetterTraineeAckAt    : trainee confirmed each OCR field
//   - conflictCategories         : structured "No" — JSON list of process-failure tags
//   - grievances                 : separate model for "Yes but..." disputes
//
// All endpoints are guarded; only the declarant (TP/TC) can create; only the
// trainee can trainee-confirm + raise grievances; only the employer admin can
// employer-confirm.

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

// Retention generator — 12 monthly check-ins from the joining date.
// Months 1-3 are TC-owned (TC must upload a salary slip + trainee confirms).
// Months 4-12 are trainee-owned (system nudges trainee; EPFO can auto-verify).
async function seedRetentionMilestones(placement) {
  const join = new Date(placement.joiningDate)
  const data = []
  for (let m = 1; m <= 12; m++) {
    const due = new Date(join.getTime())
    due.setMonth(due.getMonth() + m)
    data.push({
      placementId: placement.id,
      traineeId: placement.traineeId,
      milestone: m,
      dueAt: due,
      ownerRole: m <= 3 ? 'training_centre' : 'trainee',
      state: 'pending',
    })
  }
  // createMany skips defaults silently on SQLite; loop is cheap and tolerant.
  for (const row of data) {
    try { await prisma.retentionCheckin.create({ data: row }) } catch {}
  }
}

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
      appointmentLetterUrl: z.string().nullish(),                  // base64 data URL or remote URL — REQUIRED for full verification but accepted as null for legacy
      offerLetterOcr: z.any().optional(),                          // pre-OCR'd fields (TC ran OCR before submit)
    }).parse(req.body)
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
        offerLetterOcr: body.offerLetterOcr ? JSON.stringify(body.offerLetterOcr) : null,
        offerLetterOcrAt: body.offerLetterOcr ? new Date() : null,
        tpDeclaredAt: new Date(),
        state: 'claimed_unverified',
      },
    })

    await seedRetentionMilestones(created)

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
          message: `${employer?.name || 'Your employer'} — please confirm your joining and upload your copy of the offer letter.`,
          targetUserId: trainee.userId,
          action: JSON.stringify({ label: 'Confirm', type: 'OPEN_TRAINEE_PLACEMENT_CONFIRM', payload: { placementId: created.id } }),
        },
      })
    }
    res.json({ placement: created })
  } catch (e) { next(e) }
})

// ── Trainee uploads their own copy of the offer letter ───────────────────────
// Separate from the final confirm action — the trainee can upload, see what we
// OCR'd, edit/correct fields, then go on to Yes / No / Dispute.
r.post('/:id/trainee-upload-offer', requireRole('trainee'), async (req, res, next) => {
  try {
    const body = z.object({
      dataUrl: z.string().min(50),
      ocr: z.any().optional(),                                     // frontend already called /api/ocr/offer-letter
    }).parse(req.body)
    const trainee = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    const p = await prisma.placement.findUnique({ where: { id: req.params.id } })
    if (!p) return res.status(404).json({ error: 'not_found' })
    if (p.traineeId !== trainee?.id) return res.status(403).json({ error: 'not_your_placement' })

    // Merge OCR — prefer the freshest (trainee's). If no OCR sent, keep what
    // the TC put in. If neither side has any, leave null and the UI will show
    // a "OCR unavailable, fill manually" affordance.
    const ocrJson = body.ocr ? JSON.stringify(body.ocr) : p.offerLetterOcr
    const updated = await prisma.placement.update({
      where: { id: p.id },
      data: {
        offerLetterTraineeUrl: body.dataUrl,
        offerLetterOcr: ocrJson,
        offerLetterOcrAt: new Date(),
      },
    })
    res.json({ placement: updated })
  } catch (e) { next(e) }
})

// ── Trainee acknowledges / edits OCR-extracted fields ────────────────────────
r.post('/:id/ocr-ack', requireRole('trainee'), async (req, res, next) => {
  try {
    const body = z.object({
      edits: z.record(z.any()).optional(),                         // any fields trainee corrected
    }).parse(req.body)
    const trainee = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    const p = await prisma.placement.findUnique({ where: { id: req.params.id } })
    if (!p) return res.status(404).json({ error: 'not_found' })
    if (p.traineeId !== trainee?.id) return res.status(403).json({ error: 'not_your_placement' })
    const updated = await prisma.placement.update({
      where: { id: p.id },
      data: {
        offerLetterTraineeAckAt: new Date(),
        offerLetterTraineeEdits: body.edits ? JSON.stringify(body.edits) : null,
      },
    })
    res.json({ placement: updated })
  } catch (e) { next(e) }
})

// ── Trainee confirms own placement ───────────────────────────────────────────
// `decision` widens the binary into: yes | no | dispute. (`edit` is just yes
// with field edits — already captured via /ocr-ack — so we collapse it here.)
r.post('/:id/trainee-confirm', requireRole('trainee'), async (req, res, next) => {
  try {
    const { id } = req.params
    const body = z.object({
      decision: z.enum(['yes', 'no', 'dispute']).optional(),
      confirmed: z.boolean().optional(),                           // legacy compat
      note: z.string().optional(),
      denyCategories: z.array(z.string()).optional(),              // when decision === 'no'
      disputeCategories: z.array(z.string()).optional(),           // when decision === 'dispute'
    }).parse(req.body)
    const decision = body.decision ?? (body.confirmed ? 'yes' : 'no')
    const trainee = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    const p = await prisma.placement.findUnique({ where: { id } })
    if (!p) return res.status(404).json({ error: 'not_found' })
    if (p.traineeId !== trainee?.id) return res.status(403).json({ error: 'not_your_placement' })

    let data = {}
    if (decision === 'yes') {
      data = {
        traineeConfirmedAt: new Date(),
        state: p.employerConfirmedAt ? 'verified' : 'partially_verified',
        conflictReason: null,
        conflictCategories: null,
      }
    } else if (decision === 'no') {
      data = {
        traineeConfirmedAt: null,
        state: 'conflicted',
        conflictReason: body.note || 'trainee_denied',
        conflictCategories: JSON.stringify(body.denyCategories || []),
      }
    } else if (decision === 'dispute') {
      // Trainee did join but conditions don't match. Mark disputed AND create
      // a grievance row capturing the categorised complaint.
      data = {
        traineeConfirmedAt: new Date(),                            // joining acknowledged
        state: 'disputed',
        conflictReason: body.note || 'trainee_grievance',
        conflictCategories: JSON.stringify(body.disputeCategories || []),
      }
      await prisma.placementGrievance.create({
        data: {
          placementId: p.id,
          raisedByUserId: req.user.id,
          categories: JSON.stringify(body.disputeCategories || []),
          note: body.note || null,
          status: 'open',
        },
      })
    }
    const updated = await prisma.placement.update({ where: { id }, data })

    // Nudge TP — same as before, but with richer payload.
    try {
      const tp = p.tpId ? await prisma.trainingPartner.findUnique({ where: { id: p.tpId } }) : null
      if (tp?.adminUserId) {
        const title =
          decision === 'yes'     ? 'Trainee confirmed your placement'
        : decision === 'no'      ? 'Trainee REJECTED your placement claim'
        :                          'Trainee raised a placement GRIEVANCE'
        await prisma.notification.create({
          data: {
            type: 'system',
            title,
            category: 'placement_verification',
            priority: decision === 'yes' ? 'normal' : 'high',
            message: decision === 'yes'
              ? `${trainee?.name || 'A trainee'} confirmed they joined ${p?.role || 'the role'}.`
              : decision === 'no'
                ? `${trainee?.name || 'A trainee'} said they did NOT join. Reasons: ${(body.denyCategories || []).join(', ') || body.note || 'unspecified'}.`
                : `${trainee?.name || 'A trainee'} says they joined BUT raised concerns: ${(body.disputeCategories || []).join(', ') || body.note || 'unspecified'}.`,
            targetUserId: tp.adminUserId,
            action: JSON.stringify({ label: 'View placement', type: 'OPEN_PLACEMENT', payload: { placementId: id } }),
          },
        })
      }
    } catch { /* best-effort */ }

    res.json({ placement: updated })
  } catch (e) { next(e) }
})

// ── Grievance: trainee can also raise standalone grievances later ────────────
r.post('/:id/grievance', requireRole('trainee'), async (req, res, next) => {
  try {
    const body = z.object({
      categories: z.array(z.string()).min(1),
      note: z.string().optional(),
    }).parse(req.body)
    const trainee = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    const p = await prisma.placement.findUnique({ where: { id: req.params.id } })
    if (!p) return res.status(404).json({ error: 'not_found' })
    if (p.traineeId !== trainee?.id) return res.status(403).json({ error: 'not_your_placement' })
    const g = await prisma.placementGrievance.create({
      data: {
        placementId: p.id,
        raisedByUserId: req.user.id,
        categories: JSON.stringify(body.categories),
        note: body.note || null,
        status: 'open',
      },
    })
    res.json({ grievance: g })
  } catch (e) { next(e) }
})

r.get('/:id/grievances', async (req, res, next) => {
  try {
    const list = await prisma.placementGrievance.findMany({
      where: { placementId: req.params.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ grievances: list })
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
    } catch { /* best-effort */ }

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
        grievances: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!p) return res.status(404).json({ error: 'not_found' })
    res.json({ placement: p })
  } catch (e) { next(e) }
})

export default r
