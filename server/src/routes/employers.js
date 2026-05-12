import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

r.get('/', async (req, res, next) => {
  try {
    const rows = await prisma.employer.findMany({ include: { sector: true }, take: 200 })
    res.json({ employers: rows })
  } catch (e) { next(e) }
})

r.get('/:id', async (req, res, next) => {
  try {
    const emp = await prisma.employer.findUnique({
      where: { id: req.params.id },
      include: { sector: true, placements: { include: { trainee: true } } },
    })
    if (!emp) return res.status(404).json({ error: 'not_found' })
    res.json({ employer: emp })
  } catch (e) { next(e) }
})

export default r
