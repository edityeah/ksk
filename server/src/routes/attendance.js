import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

// trainer marks daily attendance
r.post('/mark', requireRole('trainer'), async (req, res, next) => {
  try {
    const body = z.object({
      batchId: z.string(),
      date: z.string(),
      marks: z.array(z.object({ traineeId: z.string(), mark: z.enum(['present', 'absent', 'half-day']) })),
    }).parse(req.body)
    const date = new Date(body.date)
    const results = []
    for (const m of body.marks) {
      const existing = await prisma.attendance.findUnique({
        where: { batchId_traineeId_date: { batchId: body.batchId, traineeId: m.traineeId, date } },
      })
      const state = existing?.traineeMark
        ? (existing.traineeMark === m.mark ? 'dual-confirmed' : 'conflicted')
        : 'trainer-only'
      const up = await prisma.attendance.upsert({
        where: { batchId_traineeId_date: { batchId: body.batchId, traineeId: m.traineeId, date } },
        update: { trainerMark: m.mark, state },
        create: { batchId: body.batchId, traineeId: m.traineeId, date, trainerMark: m.mark, state: 'trainer-only' },
      })
      results.push(up)
    }
    res.json({ attendance: results })
  } catch (e) { next(e) }
})

// trainee weekly self-confirm
r.post('/self-confirm', requireRole('trainee'), async (req, res, next) => {
  try {
    const body = z.object({
      from: z.string(), to: z.string(), daysPresent: z.number().int().min(0),
    }).parse(req.body)
    const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    if (!t) return res.status(404).json({ error: 'no_trainee_profile' })
    // Best-effort: find batch attendance rows for those dates and mark traineeMark accordingly.
    // For demo, we just record a summary message and let the dashboards reconcile.
    const rows = await prisma.attendance.findMany({
      where: { traineeId: t.id, date: { gte: new Date(body.from), lte: new Date(body.to) } },
    })
    // mark days greedily: top-N by date as present
    const presentSet = new Set(rows.slice().sort((a,b) => b.date - a.date).slice(0, body.daysPresent).map(r => r.id))
    const updates = []
    for (const row of rows) {
      const traineeMark = presentSet.has(row.id) ? 'present' : 'absent'
      const state = row.trainerMark
        ? (row.trainerMark === traineeMark ? 'dual-confirmed' : 'conflicted')
        : 'trainer-only'
      const up = await prisma.attendance.update({ where: { id: row.id }, data: { traineeMark, state } })
      updates.push(up)
    }
    res.json({ updated: updates.length })
  } catch (e) { next(e) }
})

r.get('/batch/:batchId', async (req, res, next) => {
  try {
    const rows = await prisma.attendance.findMany({
      where: { batchId: req.params.batchId },
      include: { trainee: true },
      orderBy: { date: 'desc' },
      take: 1000,
    })
    res.json({ attendance: rows })
  } catch (e) { next(e) }
})

export default r
