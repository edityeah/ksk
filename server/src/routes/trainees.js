import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

r.get('/', async (req, res, next) => {
  try {
    const role = req.user.role
    const profile = JSON.parse(req.user.profile || '{}')
    const where = {}
    if (role === 'training_centre') {
      const tc = await prisma.trainingCentre.findUnique({ where: { adminUserId: req.user.id }, include: { batches: true } })
      where.batchId = { in: (tc?.batches || []).map(b => b.id) }
    } else if (role === 'training_partner') {
      const tp = await prisma.trainingPartner.findUnique({ where: { adminUserId: req.user.id }, include: { centres: { include: { batches: true } } } })
      const batchIds = (tp?.centres || []).flatMap(c => c.batches.map(b => b.id))
      where.batchId = { in: batchIds }
    } else if (role === 'trainer') {
      const batches = await prisma.batch.findMany({ where: { trainerId: req.user.id } })
      where.batchId = { in: batches.map(b => b.id) }
    } else if (role === 'trainee') {
      const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
      return res.json({ trainees: t ? [t] : [] })
    } else if (role === 'employer' || role === 'nsdc_officer' || role === 'funder' || role === 'ssc') {
      // employer & funder can list all anonymously; for v1 simply return all
    }
    const list = await prisma.trainee.findMany({
      where,
      include: { batch: { include: { centre: true, track: true } } },
      take: 500,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ trainees: list })
  } catch (e) { next(e) }
})

r.get('/:id', async (req, res, next) => {
  try {
    const t = await prisma.trainee.findUnique({
      where: { id: req.params.id },
      include: {
        batch: { include: { centre: true, track: true, scheme: true, trainer: true } },
        certificates: { include: { jobRole: true } },
        placements: { include: { employer: true, retentionCheckins: true, salarySlips: true } },
        attendance: { take: 30, orderBy: { date: 'desc' } },
        assessments: { include: { jobRole: true } },
        stipends: { orderBy: { month: 'desc' } },
        retentionCheckins: { orderBy: { milestone: 'asc' } },
      },
    })
    if (!t) return res.status(404).json({ error: 'not_found' })
    res.json({ trainee: t })
  } catch (e) { next(e) }
})

r.post('/:id/enrolment-confirm', requireRole('trainee'), async (req, res, next) => {
  try {
    const t = await prisma.trainee.findUnique({ where: { id: req.params.id } })
    if (!t || t.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' })
    const updated = await prisma.trainee.update({
      where: { id: t.id },
      data: { enrolmentConfirmedAt: new Date(), enrolmentState: 'confirmed' },
    })
    res.json({ trainee: updated })
  } catch (e) { next(e) }
})

export default r
