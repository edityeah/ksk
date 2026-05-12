import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

r.get('/', async (req, res, next) => {
  try {
    let profile = {}
    try { profile = JSON.parse(req.user.profile || '{}') } catch {}
    // hydrate the role-specific snapshot
    const role = req.user.role
    let extra = {}
    if (role === 'trainee') {
      const t = await prisma.trainee.findUnique({
        where: { userId: req.user.id },
        include: {
          batch: { include: { centre: true, track: { include: { jobRoles: { include: { jobRole: true } } } }, trainer: true, scheme: true } },
          certificates: { include: { jobRole: { include: { sector: true } } }, orderBy: { issuedAt: 'desc' } },
          placements: { include: { employer: true, retentionCheckins: true, salarySlips: { orderBy: { month: 'desc' }, take: 6 } }, orderBy: { joiningDate: 'desc' } },
          assessments: { include: { jobRole: true }, orderBy: { scheduledAt: 'desc' } },
          stipends: { include: { scheme: true }, orderBy: { month: 'desc' }, take: 6 },
          retentionCheckins: { orderBy: { milestone: 'asc' } },
        },
      })
      extra = { trainee: t }
    } else if (role === 'training_centre') {
      const tc = await prisma.trainingCentre.findUnique({
        where: { adminUserId: req.user.id },
        include: { parentTp: true, batches: { include: { track: true, scheme: true } } },
      })
      extra = { centre: tc }
    } else if (role === 'training_partner') {
      const tp = await prisma.trainingPartner.findUnique({
        where: { adminUserId: req.user.id },
        include: { centres: true, tracks: { include: { jobRoles: { include: { jobRole: true } } } } },
      })
      extra = { tp }
    } else if (role === 'employer') {
      const emp = await prisma.employer.findUnique({
        where: { adminUserId: req.user.id },
      })
      extra = { employer: emp }
    } else if (role === 'ssc') {
      const ssc = await prisma.ssc.findFirst({ where: { adminId: req.user.id }, include: { sectors: true, partners: true } })
      extra = { ssc }
    } else if (role === 'trainer') {
      const batches = await prisma.batch.findMany({
        where: { trainerId: req.user.id },
        include: { centre: true, track: true, trainees: true },
      })
      extra = { batches }
    }
    res.json({
      user: {
        id: req.user.id, role, name: req.user.name, phone: req.user.phone,
        aadhaar: req.user.aadhaar ? `XXXXXXXX${req.user.aadhaar.slice(-4)}` : null,
        sidhId: req.user.sidhId, language: req.user.language, profile,
      },
      ...extra,
    })
  } catch (e) { next(e) }
})

export default r
