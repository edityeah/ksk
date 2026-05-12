// SSC accreditation queue — approve/reject new TPs and TCs.
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

r.get('/queue', requireRole('ssc'), async (req, res, next) => {
  try {
    const ssc = await prisma.ssc.findFirst({ where: { adminId: req.user.id }, include: { sectors: true } })
    const pending = await prisma.trainingPartner.findMany({
      where: { accreditationState: 'pending', parentSscId: ssc?.id },
      include: { centres: true },
    })
    res.json({ pending })
  } catch (e) { next(e) }
})

r.post('/:tpId/decide', requireRole('ssc'), async (req, res, next) => {
  try {
    const body = z.object({ decision: z.enum(['accredited', 'revoked']), note: z.string().optional() }).parse(req.body)
    const updated = await prisma.trainingPartner.update({
      where: { id: req.params.tpId },
      data: { accreditationState: body.decision, accreditedBy: req.user.id },
    })
    res.json({ tp: updated })
  } catch (e) { next(e) }
})

export default r
