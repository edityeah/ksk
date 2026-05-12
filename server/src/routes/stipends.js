import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

r.get('/queue', requireRole('stipend_officer'), async (req, res, next) => {
  try {
    const filter = req.query.filter || 'all'   // all | pending | failed | success
    const where = {}
    if (filter !== 'all') where.disbursalState = filter
    const list = await prisma.stipend.findMany({
      where,
      include: { trainee: true, scheme: true },
      orderBy: { scheduledAt: 'desc' },
      take: 500,
    })
    res.json({ stipends: list })
  } catch (e) { next(e) }
})

r.post('/:id/retry', requireRole('stipend_officer'), async (req, res, next) => {
  try {
    const s = await prisma.stipend.findUnique({ where: { id: req.params.id } })
    if (!s) return res.status(404).json({ error: 'not_found' })
    if (s.disbursalState !== 'failed') return res.status(400).json({ error: 'not_in_failed_state' })
    // simulate retry — 80% success
    const success = Math.random() < 0.8
    const updated = await prisma.stipend.update({
      where: { id: s.id },
      data: {
        disbursalState: success ? 'success' : 'failed',
        utr: success ? 'UTR' + Math.random().toString(36).slice(2, 10).toUpperCase() : null,
        disbursedAt: success ? new Date() : null,
        retryCount: s.retryCount + 1,
        failureReason: success ? null : (s.failureReason || 'aadhaar_bank_mismatch'),
      },
    })
    res.json({ stipend: updated })
  } catch (e) { next(e) }
})

r.get('/mine', requireRole('trainee'), async (req, res, next) => {
  try {
    const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    if (!t) return res.json({ stipends: [] })
    const list = await prisma.stipend.findMany({ where: { traineeId: t.id }, include: { scheme: true }, orderBy: { month: 'desc' } })
    res.json({ stipends: list })
  } catch (e) { next(e) }
})

export default r
