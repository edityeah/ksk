// /api/mentors — Industry mentor directory + per-mentor profile + subscribe.
//
// Read endpoints are open to any logged-in user (a learner needs to browse +
// subscribe to a mentor; a TC head might browse to see who their cohort is
// engaging with). Write endpoints (create, update profile) belong to the
// mentor themselves and are guarded by role.
//
// The "recent posts" surfaced on a mentor's profile come from the same Post
// table that backs the global posts feed.

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

// ── helpers ─────────────────────────────────────────────────────────────────
function parseLanguages(raw) {
  try { const a = JSON.parse(raw || '[]'); return Array.isArray(a) ? a : [] } catch { return [] }
}

// Shape a MentorProfile + its joined relations into the JSON we ship to the
// client. Keeping this central so list + detail responses don't drift.
function shapeMentor(m, { subscriberCount = 0, isSubscribed = false, recentPosts = [] } = {}) {
  return {
    id:         m.id,
    userId:     m.userId,
    name:       m.user?.name || '',
    title:      m.title,
    company:    m.company,
    sector:     m.sector ? { id: m.sector.id, code: m.sector.code, name: m.sector.name } : null,
    yearsExp:   m.yearsExp,
    bio:        m.bio,
    languages:  parseLanguages(m.languages),
    city:       m.city,
    state:      m.state,
    photoUrl:   m.photoUrl,
    hourlyRate: m.hourlyRate,
    available:  m.available,
    subscriberCount,
    isSubscribed,
    recentPosts,
    createdAt:  m.createdAt,
  }
}

// ── GET /api/mentors ────────────────────────────────────────────────────────
// Optional ?sector=RAS to filter by sector code. Returns subscriber counts
// + whether the current user is already subscribed so the directory card can
// flip its "Subscribe" button to "Subscribed" without a second roundtrip.
r.get('/', async (req, res, next) => {
  try {
    const sectorCode = req.query.sector ? String(req.query.sector) : null
    const where = {}
    if (sectorCode) where.sector = { code: sectorCode }
    const mentors = await prisma.mentorProfile.findMany({
      where,
      include: { user: true, sector: true },
      orderBy: [{ available: 'desc' }, { yearsExp: 'desc' }],
      take: 50,
    })
    // Batch-count subscribers + my-subscription status to keep N+1 down.
    const ids = mentors.map(m => m.id)
    const [counts, mine] = await Promise.all([
      prisma.mentorSubscription.groupBy({
        by: ['mentorProfileId'],
        where: { mentorProfileId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.mentorSubscription.findMany({
        where: { subscriberId: req.user.id, mentorProfileId: { in: ids } },
        select: { mentorProfileId: true },
      }),
    ])
    const countMap = new Map(counts.map(c => [c.mentorProfileId, c._count._all]))
    const mineSet = new Set(mine.map(x => x.mentorProfileId))
    res.json({
      mentors: mentors.map(m => shapeMentor(m, {
        subscriberCount: countMap.get(m.id) || 0,
        isSubscribed:    mineSet.has(m.id),
      })),
    })
  } catch (e) { next(e) }
})

// ── GET /api/mentors/:id ────────────────────────────────────────────────────
// Full mentor profile + the last N posts they authored, so the profile page
// can render the "Recent posts" strip in a single request.
r.get('/:id', async (req, res, next) => {
  try {
    const m = await prisma.mentorProfile.findUnique({
      where: { id: req.params.id },
      include: { user: true, sector: true },
    })
    if (!m) return res.status(404).json({ error: 'mentor_not_found' })
    const [subscriberCount, subbed, posts] = await Promise.all([
      prisma.mentorSubscription.count({ where: { mentorProfileId: m.id } }),
      prisma.mentorSubscription.findFirst({
        where: { mentorProfileId: m.id, subscriberId: req.user.id },
        select: { id: true },
      }),
      prisma.post.findMany({
        where: { authorId: m.userId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { author: true, sector: true },
      }),
    ])
    res.json({
      mentor: shapeMentor(m, {
        subscriberCount,
        isSubscribed: !!subbed,
        recentPosts: posts.map(p => ({
          id:        p.id,
          body:      p.body,
          imageData: p.imageData,
          sector:    p.sector ? { code: p.sector.code, name: p.sector.name } : null,
          createdAt: p.createdAt,
        })),
      }),
    })
  } catch (e) { next(e) }
})

// ── POST /api/mentors/:id/subscribe ─────────────────────────────────────────
// Idempotent toggle. Body: { subscribed: true | false }. If unset, just flips
// the current state. Returns the new state + fresh subscriber count.
r.post('/:id/subscribe', async (req, res, next) => {
  try {
    const body = z.object({ subscribed: z.boolean().optional() }).parse(req.body || {})
    const m = await prisma.mentorProfile.findUnique({ where: { id: req.params.id } })
    if (!m) return res.status(404).json({ error: 'mentor_not_found' })
    if (m.userId === req.user.id) return res.status(400).json({ error: 'cannot_subscribe_self' })

    const existing = await prisma.mentorSubscription.findUnique({
      where: { mentorProfileId_subscriberId: { mentorProfileId: m.id, subscriberId: req.user.id } },
    })
    const targetSubscribed = body.subscribed === undefined ? !existing : !!body.subscribed
    if (targetSubscribed && !existing) {
      await prisma.mentorSubscription.create({
        data: { mentorProfileId: m.id, subscriberId: req.user.id },
      })
    } else if (!targetSubscribed && existing) {
      await prisma.mentorSubscription.delete({ where: { id: existing.id } })
    }
    const subscriberCount = await prisma.mentorSubscription.count({ where: { mentorProfileId: m.id } })
    res.json({ subscribed: targetSubscribed, subscriberCount })
  } catch (e) { next(e) }
})

// ── PUT /api/mentors/me ─────────────────────────────────────────────────────
// Mentor self-service: update their own profile fields. Available only to
// users whose role === 'mentor'. We do a partial update — only provided
// fields are written.
r.put('/me', async (req, res, next) => {
  try {
    if (req.user.role !== 'mentor') return res.status(403).json({ error: 'mentors_only' })
    const body = z.object({
      title:      z.string().optional(),
      company:    z.string().optional(),
      bio:        z.string().optional(),
      yearsExp:   z.number().int().min(0).optional(),
      hourlyRate: z.number().int().min(0).nullable().optional(),
      available:  z.boolean().optional(),
      languages:  z.array(z.string()).optional(),
      city:       z.string().optional(),
      state:      z.string().optional(),
    }).parse(req.body || {})
    const data = { ...body }
    if (body.languages) data.languages = JSON.stringify(body.languages)
    const m = await prisma.mentorProfile.update({
      where: { userId: req.user.id },
      data,
      include: { user: true, sector: true },
    })
    res.json({ mentor: shapeMentor(m) })
  } catch (e) { next(e) }
})

export default r
