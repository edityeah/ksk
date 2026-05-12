import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

r.get('/queue', requireRole('assessor'), async (req, res, next) => {
  try {
    const rows = await prisma.assessment.findMany({
      where: { assessorId: req.user.id, state: { in: ['scheduled', 'conducted'] } },
      include: { trainee: true, jobRole: true },
      orderBy: { scheduledAt: 'asc' },
    })
    res.json({ assessments: rows })
  } catch (e) { next(e) }
})

r.post('/:id/submit', requireRole('assessor'), async (req, res, next) => {
  try {
    const body = z.object({
      result: z.enum(['pass', 'fail', 'reattempt']),
      score: z.number().int(),
      modality: z.enum(['oral', 'ocr', 'mixed', 'viva']).default('mixed'),
      evidence: z.array(z.object({ type: z.string(), ref: z.string() })).default([]),
    }).parse(req.body)
    const a = await prisma.assessment.findUnique({ where: { id: req.params.id } })
    if (!a || a.assessorId !== req.user.id) return res.status(403).json({ error: 'forbidden' })
    const updated = await prisma.assessment.update({
      where: { id: a.id },
      data: {
        result: body.result, score: body.score, modality: body.modality,
        evidence: JSON.stringify(body.evidence), conductedAt: new Date(), state: 'conducted',
      },
    })
    // notify the trainee to ack
    const t = await prisma.trainee.findUnique({ where: { id: a.traineeId } })
    if (t?.userId) {
      await prisma.notification.create({
        data: {
          type: 'system', title: 'Your assessment result', category: 'certification_deadline',
          message: `Assessor recorded ${body.result.toUpperCase()} for your competency assessment.`,
          targetUserId: t.userId,
          action: JSON.stringify({ label: 'View result', type: 'OPEN_ASSESSMENT_ACK', payload: { assessmentId: a.id } }),
        },
      })
    }
    // if pass — issue certificate
    if (body.result === 'pass') {
      await prisma.certificate.create({
        data: {
          traineeId: a.traineeId, jobRoleId: a.jobRoleId, issuedAt: new Date(),
          pdfUrl: null, digiLockerRef: 'DEMO-DL-' + a.id.slice(-6).toUpperCase(),
        },
      })
    }
    res.json({ assessment: updated })
  } catch (e) { next(e) }
})

r.post('/:id/ack', requireRole('trainee'), async (req, res, next) => {
  try {
    const a = await prisma.assessment.findUnique({ where: { id: req.params.id } })
    const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    if (!a || !t || a.traineeId !== t.id) return res.status(403).json({ error: 'forbidden' })
    const updated = await prisma.assessment.update({ where: { id: a.id }, data: { traineeAckAt: new Date(), state: 'acked' } })
    res.json({ assessment: updated })
  } catch (e) { next(e) }
})

export default r
