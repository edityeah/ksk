import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

r.get('/', async (req, res, next) => {
  try {
    const sectorCode = req.query.sector
    const location = req.query.location
    const where = { state: 'open' }
    if (sectorCode) where.employer = { sector: { code: String(sectorCode) } }
    if (location) where.location = { contains: String(location) }
    const jobs = await prisma.jobPosting.findMany({ where, include: { employer: { include: { sector: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })
    res.json({ jobs })
  } catch (e) { next(e) }
})

r.post('/', requireRole('employer'), async (req, res, next) => {
  try {
    const body = z.object({
      title: z.string(), jobRoleQp: z.string().optional(),
      ctcMonthly: z.number().int(), location: z.string(), openings: z.number().int().default(1),
    }).parse(req.body)
    const emp = await prisma.employer.findUnique({ where: { adminUserId: req.user.id } })
    if (!emp) return res.status(400).json({ error: 'no_employer_context' })
    const created = await prisma.jobPosting.create({ data: { ...body, employerId: emp.id } })
    res.json({ job: created })
  } catch (e) { next(e) }
})

export default r
