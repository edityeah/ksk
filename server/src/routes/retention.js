// Retention check-ins — 30/60/90 day flow.
// Trainee responds via mobile chat; employer responds at day 90.

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

r.get('/due', requireRole('trainee', 'employer'), async (req, res, next) => {
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
    if (role === 'employer') {
      const emp = await prisma.employer.findUnique({ where: { adminUserId: req.user.id } })
      if (!emp) return res.json({ checkins: [] })
      const ck = await prisma.retentionCheckin.findMany({
        where: { milestone: 90, placement: { employerId: emp.id }, employerRespondedAt: null, dueAt: { lte: now } },
        include: { placement: { include: { trainee: true } } },
        orderBy: { dueAt: 'asc' },
      })
      return res.json({ checkins: ck })
    }
    res.json({ checkins: [] })
  } catch (e) { next(e) }
})

r.post('/:id/trainee-respond', requireRole('trainee'), async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(['employed', 'not_employed', 'switched']),
      note: z.string().optional(),
    }).parse(req.body)
    const ck = await prisma.retentionCheckin.findUnique({ where: { id: req.params.id } })
    if (!ck) return res.status(404).json({ error: 'not_found' })
    const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    if (!t || ck.traineeId !== t.id) return res.status(403).json({ error: 'forbidden' })
    let state = ck.state
    if (ck.milestone === 90) {
      state = ck.employerRespondedAt
        ? (body.status === ck.employerStatus ? 'dual_confirmed' : 'conflicted')
        : 'trainee_only'
    } else {
      state = body.status === 'employed' ? 'trainee_only' : 'conflicted'
    }
    const updated = await prisma.retentionCheckin.update({
      where: { id: req.params.id },
      data: { traineeRespondedAt: new Date(), traineeStatus: body.status, traineeNote: body.note ?? null, state },
    })
    res.json({ checkin: updated })
  } catch (e) { next(e) }
})

r.post('/:id/employer-respond', requireRole('employer'), async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(['employed', 'not_employed']),
      note: z.string().optional(),
    }).parse(req.body)
    const ck = await prisma.retentionCheckin.findUnique({ where: { id: req.params.id }, include: { placement: { include: { employer: true } } } })
    if (!ck) return res.status(404).json({ error: 'not_found' })
    if (ck.placement.employer.adminUserId !== req.user.id) return res.status(403).json({ error: 'forbidden' })
    let state = ck.state
    if (ck.traineeRespondedAt) {
      state = (
        (body.status === 'employed' && ck.traineeStatus === 'employed') ||
        (body.status === 'not_employed' && ck.traineeStatus === 'not_employed')
      ) ? 'dual_confirmed' : 'conflicted'
    } else {
      state = 'employer_only'
    }
    const updated = await prisma.retentionCheckin.update({
      where: { id: req.params.id },
      data: { employerRespondedAt: new Date(), employerStatus: body.status, employerNote: body.note ?? null, state },
    })
    res.json({ checkin: updated })
  } catch (e) { next(e) }
})

export default r
