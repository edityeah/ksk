import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

r.get('/mine', async (req, res, next) => {
  try {
    if (req.user.role !== 'trainee') return res.status(403).json({ error: 'trainee_only' })
    const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    if (!t) return res.json({ certificates: [] })
    const certs = await prisma.certificate.findMany({ where: { traineeId: t.id }, include: { jobRole: true } })
    res.json({ certificates: certs })
  } catch (e) { next(e) }
})

r.get('/trainee/:traineeId', async (req, res, next) => {
  try {
    const certs = await prisma.certificate.findMany({ where: { traineeId: req.params.traineeId }, include: { jobRole: true } })
    res.json({ certificates: certs })
  } catch (e) { next(e) }
})

export default r
