// EPFO (Employees' Provident Fund Organisation) bridge — used by the retention
// flow to auto-confirm employment without anyone having to upload anything.
//
// The real EPFO Member Sewa portal exposes per-UAN passbook + employer history,
// but only behind UIDAI-grade auth. For the KSK prototype we mock the upstream
// call deterministically: any 12-digit UAN whose last digit is even passes; we
// also pretend the user's "current employer" matches the placement employer
// whenever placementId is provided (so demo flows always green-light).
//
// The architecture is intentionally swap-friendly: a real EPFO connector can
// drop into `lookupEpfoSnapshot()` without touching anything else.

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

// ── Mock EPFO upstream ──────────────────────────────────────────────────────
async function lookupEpfoSnapshot(uan, employerHint) {
  // Real impl would: call EPFO API → parse passbook → return latest employer.
  // Mock: 12-digit UAN with even last digit "matches" hint employer.
  const valid = /^\d{12}$/.test(uan)
  if (!valid) return { ok: false, reason: 'invalid_uan' }
  const lastDigitEven = Number(uan.slice(-1)) % 2 === 0
  if (!lastDigitEven) {
    return { ok: true, currentEmployer: 'TruJet Hospitality Pvt Ltd', matched: false }
  }
  return {
    ok: true,
    currentEmployer: employerHint || 'Bharat Skills Employer Pvt Ltd',
    matched: true,
    contributions: [
      { month: new Date().toISOString().slice(0, 7), amount: 1800 },
    ],
  }
}

// ── Link a UAN to the trainee's profile ──────────────────────────────────────
r.post('/link', requireRole('trainee'), async (req, res, next) => {
  try {
    const body = z.object({ uan: z.string().regex(/^\d{12}$/, 'uan_must_be_12_digits') }).parse(req.body)
    const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    if (!t) return res.status(404).json({ error: 'trainee_not_found' })
    const snap = await lookupEpfoSnapshot(body.uan, null)
    const updated = await prisma.trainee.update({
      where: { id: t.id },
      data: {
        epfoUan: body.uan,
        epfoLinkedAt: new Date(),
        epfoEmployerName: snap.currentEmployer ?? null,
        epfoLastSyncAt: new Date(),
      },
    })
    res.json({ trainee: updated, snapshot: snap })
  } catch (e) { next(e) }
})

r.post('/unlink', requireRole('trainee'), async (req, res, next) => {
  try {
    const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    if (!t) return res.status(404).json({ error: 'trainee_not_found' })
    const updated = await prisma.trainee.update({
      where: { id: t.id },
      data: { epfoUan: null, epfoLinkedAt: null, epfoEmployerName: null, epfoLastSyncAt: null },
    })
    res.json({ trainee: updated })
  } catch (e) { next(e) }
})

r.get('/status', requireRole('trainee'), async (req, res, next) => {
  try {
    const t = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
    if (!t) return res.json({ linked: false })
    res.json({
      linked: Boolean(t.epfoUan),
      uan: t.epfoUan ? `XXXX-XXXX-${t.epfoUan.slice(-4)}` : null,
      employerName: t.epfoEmployerName,
      linkedAt: t.epfoLinkedAt,
      lastSyncAt: t.epfoLastSyncAt,
    })
  } catch (e) { next(e) }
})

// ── Verify employment against a placement / retention check-in ──────────────
// Runs the EPFO lookup and persists the result on the retention check-in (if
// retentionCheckinId given) and / or returns the snapshot to the caller. Safe
// to call repeatedly — last-write-wins.
r.post('/verify', async (req, res, next) => {
  try {
    const body = z.object({
      placementId: z.string().optional(),
      retentionCheckinId: z.string().optional(),
    }).parse(req.body)
    if (!body.placementId && !body.retentionCheckinId) {
      return res.status(400).json({ error: 'placementId_or_retentionCheckinId_required' })
    }
    let placement = null
    if (body.placementId) {
      placement = await prisma.placement.findUnique({ where: { id: body.placementId }, include: { employer: true, trainee: true } })
    } else if (body.retentionCheckinId) {
      const ck = await prisma.retentionCheckin.findUnique({ where: { id: body.retentionCheckinId }, include: { placement: { include: { employer: true, trainee: true } } } })
      placement = ck?.placement
    }
    if (!placement) return res.status(404).json({ error: 'placement_not_found' })

    const trainee = await prisma.trainee.findUnique({ where: { id: placement.traineeId } })
    if (!trainee?.epfoUan) return res.json({ verified: false, reason: 'no_uan_linked' })

    const snap = await lookupEpfoSnapshot(trainee.epfoUan, placement.employer?.name)
    const verified = Boolean(snap.ok && snap.matched)

    if (body.retentionCheckinId) {
      await prisma.retentionCheckin.update({
        where: { id: body.retentionCheckinId },
        data: {
          epfoCheckedAt: new Date(),
          epfoVerified: verified,
          epfoEmployerName: snap.currentEmployer ?? null,
        },
      })
    }
    // refresh trainee snapshot too
    await prisma.trainee.update({
      where: { id: trainee.id },
      data: { epfoEmployerName: snap.currentEmployer ?? null, epfoLastSyncAt: new Date() },
    })

    res.json({ verified, snapshot: snap })
  } catch (e) { next(e) }
})

export default r
