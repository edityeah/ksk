// /api/posts — global community feed.
//
// Anyone logged in can read the feed. Authoring is open to trainees, training
// centres, training partners, and mentors (per the product spec: "a learner
// can create a post, similarly a TC, TP and mentor"). Other roles get a 403.
//
// v1 scope:
//   - text body (required) + optional single image as a data URL
//   - optional sector tag
//   - global feed, newest first, paginated by `before` cursor
//   - no likes / comments / shares — deferred

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

const POST_AUTHOR_ROLES = new Set(['trainee', 'training_centre', 'training_partner', 'mentor'])

// Reusable client-side shape so the feed + mentor profile use the same field
// set. Author meta carries the role so the UI can stamp a per-role chip
// ("Mentor · Reliance Retail", "Learner · Patna").
function shapePost(p) {
  return {
    id:        p.id,
    title:     p.title || null,
    body:      p.body,
    imageData: p.imageData,
    sector:    p.sector ? { code: p.sector.code, name: p.sector.name } : null,
    kind:      p.kind || 'note',
    eventAt:   p.eventAt,
    venue:     p.venue,
    ctaLabel:  p.ctaLabel,
    ctaUrl:    p.ctaUrl,
    createdAt: p.createdAt,
    author: {
      id:    p.author?.id,
      name:  p.author?.name || 'Unknown',
      role:  p.author?.role || null,
      // Mentor-specific meta — title/company/photo — when the author is a
      // mentor. Lets the feed card render "Suresh · Store Operations Lead,
      // Reliance" + the actual headshot without a second roundtrip.
      mentorTitle:    p.author?.mentorProfile?.title    || null,
      mentorCompany:  p.author?.mentorProfile?.company  || null,
      mentorPhotoUrl: p.author?.mentorProfile?.photoUrl || null,
    },
  }
}

// ── GET /api/posts ──────────────────────────────────────────────────────────
// Optional query:
//   ?authorId=<userId>     → posts by one user only
//   ?sector=<sectorCode>   → posts tagged to a sector
//   ?before=<ISO datetime> → cursor for infinite scroll
//   ?limit=20              → page size, clamped 1..50
r.get('/', async (req, res, next) => {
  try {
    const authorId = req.query.authorId ? String(req.query.authorId) : null
    const sector   = req.query.sector ? String(req.query.sector) : null
    const before   = req.query.before ? new Date(String(req.query.before)) : null
    const limit    = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

    const where = {}
    if (authorId) where.authorId = authorId
    if (sector)   where.sector = { code: sector }
    if (before && !isNaN(before.getTime())) where.createdAt = { lt: before }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: { include: { mentorProfile: true } },
        sector: true,
      },
    })
    res.json({ posts: posts.map(shapePost) })
  } catch (e) { next(e) }
})

// ── GET /api/posts/:id ──────────────────────────────────────────────────────
// Detail view (LinkedIn-style expanded post page).
r.get('/:id', async (req, res, next) => {
  try {
    const p = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { author: { include: { mentorProfile: true } }, sector: true },
    })
    if (!p) return res.status(404).json({ error: 'post_not_found' })
    res.json({ post: shapePost(p) })
  } catch (e) { next(e) }
})

// ── POST /api/posts ─────────────────────────────────────────────────────────
r.post('/', async (req, res, next) => {
  try {
    if (!POST_AUTHOR_ROLES.has(req.user.role)) {
      return res.status(403).json({ error: 'role_cannot_post' })
    }
    const body = z.object({
      title:     z.string().max(200).optional(),
      body:      z.string().min(1).max(4000),
      imageData: z.string().max(2_500_000).optional(), // ~1.8MB base64 cap
      sectorId:  z.string().optional(),
      sectorCode: z.string().optional(),
      kind:      z.enum(['note', 'event', 'opening', 'announcement', 'milestone']).optional(),
      eventAt:   z.string().datetime().optional(),
      venue:     z.string().max(200).optional(),
      ctaLabel:  z.string().max(40).optional(),
      ctaUrl:    z.string().max(500).optional(),
    }).parse(req.body || {})

    // Resolve sector by code if provided that way (UX-friendlier from the
    // composer — picks code "RAS" instead of needing the cuid).
    let sectorId = body.sectorId || null
    if (!sectorId && body.sectorCode) {
      const s = await prisma.sector.findUnique({ where: { code: body.sectorCode } })
      sectorId = s?.id || null
    }

    const created = await prisma.post.create({
      data: {
        authorId:  req.user.id,
        title:     body.title || null,
        body:      body.body,
        imageData: body.imageData || null,
        sectorId,
        kind:      body.kind || 'note',
        eventAt:   body.eventAt ? new Date(body.eventAt) : null,
        venue:     body.venue || null,
        ctaLabel:  body.ctaLabel || null,
        ctaUrl:    body.ctaUrl || null,
      },
      include: { author: { include: { mentorProfile: true } }, sector: true },
    })
    res.status(201).json({ post: shapePost(created) })
  } catch (e) { next(e) }
})

// ── DELETE /api/posts/:id ───────────────────────────────────────────────────
// Author-only delete. No soft-delete; this is a demo.
r.delete('/:id', async (req, res, next) => {
  try {
    const p = await prisma.post.findUnique({ where: { id: req.params.id } })
    if (!p) return res.status(404).json({ error: 'post_not_found' })
    if (p.authorId !== req.user.id) return res.status(403).json({ error: 'not_author' })
    await prisma.post.delete({ where: { id: p.id } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

export default r
