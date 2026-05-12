// Aggregate dashboards — NSDC officer + funder views. Pure read-side queries.
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

r.get('/national-overview', async (req, res, next) => {
  try {
    const [enrolled, certs, placements, retention90Verified, batches] = await Promise.all([
      prisma.trainee.count(),
      prisma.certificate.count(),
      prisma.placement.count(),
      prisma.retentionCheckin.count({ where: { milestone: 90, state: 'dual_confirmed' } }),
      prisma.batch.count(),
    ])
    const verifiedPlacements = await prisma.placement.count({ where: { state: 'verified' } })
    const placementRate = placements ? Math.round(100 * placements / Math.max(certs, 1)) : 0
    const verifiedRate  = placements ? Math.round(100 * verifiedPlacements / placements) : 0
    const placementsByScheme = await prisma.batch.findMany({
      select: { schemeId: true, _count: { select: { trainees: true } }, scheme: { select: { code: true, name: true } } },
    })
    res.json({
      kpis: {
        totalEnrolled: enrolled,
        totalCertified: certs,
        certificationRate: enrolled ? Math.round(100 * certs / enrolled) : 0,
        totalPlacements: placements,
        verifiedPlacements,
        placementRate,
        verifiedRate,
        retention90Verified,
        activeBatches: batches,
      },
      byScheme: placementsByScheme,
    })
  } catch (e) { next(e) }
})

r.get('/placement-funnel', async (req, res, next) => {
  try {
    const enrolled = await prisma.trainee.count()
    const certified = await prisma.certificate.count()
    const declared = await prisma.placement.count()
    const partial = await prisma.placement.count({ where: { state: 'partially_verified' } })
    const verified = await prisma.placement.count({ where: { state: 'verified' } })
    const conflicted = await prisma.placement.count({ where: { state: { in: ['conflicted', 'disputed'] } } })
    res.json({
      funnel: [
        { stage: 'Enrolled', count: enrolled },
        { stage: 'Certified', count: certified },
        { stage: 'Declared (TP)', count: declared },
        { stage: 'Partially Verified', count: partial },
        { stage: 'Verified (Maker-Checker)', count: verified },
        { stage: 'Conflicted / Disputed', count: conflicted },
      ],
    })
  } catch (e) { next(e) }
})

r.get('/retention-cohorts', async (req, res, next) => {
  try {
    const milestones = [30, 60, 90]
    const out = []
    for (const m of milestones) {
      const total = await prisma.retentionCheckin.count({ where: { milestone: m } })
      const dual  = await prisma.retentionCheckin.count({ where: { milestone: m, state: 'dual_confirmed' } })
      const traineeOnly = await prisma.retentionCheckin.count({ where: { milestone: m, state: 'trainee_only' } })
      const conflicted  = await prisma.retentionCheckin.count({ where: { milestone: m, state: 'conflicted' } })
      out.push({ milestone: m, total, dual, traineeOnly, conflicted, retentionPct: total ? Math.round(100 * (dual + traineeOnly) / total) : 0 })
    }
    res.json({ milestones: out })
  } catch (e) { next(e) }
})

r.get('/state-leaderboard', async (req, res, next) => {
  try {
    const trainees = await prisma.trainee.findMany({ select: { state: true } })
    const placements = await prisma.placement.findMany({
      where: { state: 'verified' },
      include: { trainee: { select: { state: true } } },
    })
    const totals = {}
    for (const t of trainees) totals[t.state] = (totals[t.state] || { enrolled: 0, verifiedPlacements: 0 }); totals[t.state].enrolled++
    for (const p of placements) {
      const s = p.trainee.state; if (!totals[s]) totals[s] = { enrolled: 0, verifiedPlacements: 0 }; totals[s].verifiedPlacements++
    }
    const rows = Object.entries(totals).map(([state, v]) => ({
      state, enrolled: v.enrolled, verifiedPlacements: v.verifiedPlacements,
      verifiedRate: v.enrolled ? Math.round(100 * v.verifiedPlacements / v.enrolled) : 0,
    })).sort((a, b) => b.verifiedRate - a.verifiedRate)
    res.json({ rows })
  } catch (e) { next(e) }
})

r.get('/funder-outcomes', async (req, res, next) => {
  try {
    // Verified outcomes only, no PII.
    const schemes = await prisma.scheme.findMany()
    const out = []
    for (const s of schemes) {
      const enrolled = await prisma.trainee.count({ where: { batch: { schemeId: s.id } } })
      const certified = await prisma.certificate.count({ where: { trainee: { batch: { schemeId: s.id } } } })
      const verified = await prisma.placement.count({ where: { state: 'verified', trainee: { batch: { schemeId: s.id } } } })
      const ret90 = await prisma.retentionCheckin.count({ where: { milestone: 90, state: 'dual_confirmed', placement: { trainee: { batch: { schemeId: s.id } } } } })
      out.push({ scheme: s.code, name: s.name, enrolled, certified, verifiedPlacements: verified, retention90Verified: ret90 })
    }
    res.json({ schemes: out })
  } catch (e) { next(e) }
})

export default r
