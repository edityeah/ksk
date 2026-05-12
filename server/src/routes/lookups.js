// Public lookups — no auth needed. Used for dropdowns and discovery.
import { Router } from 'express'
import { prisma } from '../db.js'

const r = Router()

r.get('/schemes', async (req, res, next) => {
  try {
    const list = await prisma.scheme.findMany({ where: { active: true } })
    res.json({ schemes: list })
  } catch (e) { next(e) }
})

r.get('/sectors', async (req, res, next) => {
  try {
    const list = await prisma.sector.findMany({ include: { ssc: true } })
    res.json({ sectors: list })
  } catch (e) { next(e) }
})

r.get('/job-roles', async (req, res, next) => {
  try {
    const list = await prisma.jobRole.findMany({ include: { sector: true }, take: 500 })
    res.json({ jobRoles: list })
  } catch (e) { next(e) }
})

r.get('/courses', async (req, res, next) => {
  // Available tracks (presented as "courses" to a trainee discovering)
  try {
    const tracks = await prisma.track.findMany({
      include: {
        tp: true,
        jobRoles: { include: { jobRole: { include: { sector: true } } } },
      },
      take: 200,
    })
    res.json({ courses: tracks })
  } catch (e) { next(e) }
})

r.get('/demo-users', async (req, res, next) => {
  // For the demo login screen credential picker.
  try {
    const users = await prisma.user.findMany({
      select: { id: true, role: true, name: true, phone: true, aadhaar: true, sidhId: true },
      orderBy: { role: 'asc' },
    })
    res.json({ users })
  } catch (e) { next(e) }
})

export default r
