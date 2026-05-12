import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

r.get('/', async (req, res, next) => {
  try {
    const role = req.user.role
    const where = {}
    if (role === 'training_centre') {
      const tc = await prisma.trainingCentre.findUnique({ where: { adminUserId: req.user.id } })
      where.centreId = tc?.id || '__none__'
    } else if (role === 'training_partner') {
      const tp = await prisma.trainingPartner.findUnique({ where: { adminUserId: req.user.id }, include: { centres: true } })
      where.centreId = { in: (tp?.centres || []).map(c => c.id) }
    } else if (role === 'trainer') {
      where.trainerId = req.user.id
    }
    const batches = await prisma.batch.findMany({
      where,
      include: { centre: true, track: true, trainer: true, scheme: true, trainees: true },
      orderBy: { startDate: 'desc' },
    })
    res.json({ batches })
  } catch (e) { next(e) }
})

r.get('/:id', async (req, res, next) => {
  try {
    const b = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: { centre: true, track: { include: { jobRoles: { include: { jobRole: true } } } }, scheme: true, trainer: true, trainees: true, attendance: true },
    })
    if (!b) return res.status(404).json({ error: 'not_found' })
    res.json({ batch: b })
  } catch (e) { next(e) }
})

export default r
