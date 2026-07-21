// /api/arise — Samsung ARISE MX digital-twin classroom.
//
// The voice call itself is minted via /api/realtime/session (with persona
// 'arise_mx_teacher'); this route owns everything ELSE: progress tracking,
// lesson audit rows, chapter meta, dashboard.
//
// Endpoints:
//   POST /session/start   → returns { currentDay, currentChapter, chapterTitle }
//                           and creates the enrolment row if missing
//   GET  /progress        → full progress snapshot (all completed days + lessons)
//   POST /lesson/end      → persist a session (transcript, whiteboard state)
//   POST /day/complete    → mark a day complete + advance to the next
//   POST /chapter/jump    → jump to a specific chapter (1..17)
//
// Read endpoints are trainee-only (their own row). No cross-trainee views
// here; that's a trainer/TC-side dashboard for a later phase.

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/middleware.js'
import { ARISE_MX_CHAPTERS, chapterMeta } from '../voice/arisePersona.js'

const r = Router()
r.use(requireAuth)

// Every ARISE endpoint operates on the caller's enrolment row. Only trainees
// have Trainee rows — other roles get 403.
async function requireTrainee(req, res, next) {
  if (req.user?.role !== 'trainee') return res.status(403).json({ error: 'trainees_only' })
  const trainee = await prisma.trainee.findUnique({ where: { userId: req.user.id } })
  if (!trainee) return res.status(404).json({ error: 'no_trainee_profile' })
  req.trainee = trainee
  next()
}

// Get or create the enrolment row. Idempotent — every call returns the row,
// creating one at day 1 / chapter 1 on first touch.
async function getOrCreateEnrolment(traineeId) {
  const existing = await prisma.ariseEnrolment.findUnique({ where: { traineeId } })
  if (existing) return existing
  return prisma.ariseEnrolment.create({
    data: { traineeId, course: 'arise_mx', currentDay: 1, currentChapter: 1 },
  })
}

// ── POST /session/start ───────────────────────────────────────────────────
r.post('/session/start', requireTrainee, async (req, res, next) => {
  try {
    const en = await getOrCreateEnrolment(req.trainee.id)
    await prisma.ariseEnrolment.update({
      where: { id: en.id },
      data:  { lastSessionAt: new Date() },
    })
    const chapter = chapterMeta(en.currentChapter)
    res.json({
      enrolmentId:    en.id,
      currentDay:     en.currentDay,
      currentChapter: en.currentChapter,
      chapterTitle:   chapter.title,
      certifiedAt:    en.certifiedAt,
      totalDays:      21,
      totalChapters:  ARISE_MX_CHAPTERS.length,
    })
  } catch (e) { next(e) }
})

// ── GET /progress ─────────────────────────────────────────────────────────
r.get('/progress', requireTrainee, async (req, res, next) => {
  try {
    const en = await getOrCreateEnrolment(req.trainee.id)
    const lessons = await prisma.ariseLesson.findMany({
      where: { enrolmentId: en.id },
      orderBy: { startedAt: 'desc' },
      take: 30,
      select: {
        id: true, dayNumber: true, chapterNumber: true, chapterTitle: true,
        startedAt: true, endedAt: true, notes: true,
      },
    })
    res.json({
      enrolmentId:    en.id,
      startedAt:      en.startedAt,
      currentDay:     en.currentDay,
      currentChapter: en.currentChapter,
      certifiedAt:    en.certifiedAt,
      totalDays:      21,
      totalChapters:  ARISE_MX_CHAPTERS.length,
      chapters:       ARISE_MX_CHAPTERS,
      lessons,
    })
  } catch (e) { next(e) }
})

// ── POST /lesson/end ──────────────────────────────────────────────────────
// Persist an ended session. Called by the client when the voice call ends.
// All fields optional so a hard-disconnect leaves an audit row without
// clobbering unset columns.
r.post('/lesson/end', requireTrainee, async (req, res, next) => {
  try {
    const body = z.object({
      dayNumber:     z.number().int().min(1).max(21).optional(),
      chapterNumber: z.number().int().min(1).max(17).optional(),
      chapterTitle:  z.string().max(200).optional(),
      transcript:    z.string().max(200_000).optional(),
      whiteboard:    z.string().max(200_000).optional(),   // JSON stringified
      notes:         z.string().max(4000).optional(),
      startedAt:     z.string().datetime().optional(),
    }).parse(req.body || {})

    const en = await getOrCreateEnrolment(req.trainee.id)
    const lesson = await prisma.ariseLesson.create({
      data: {
        enrolmentId:   en.id,
        dayNumber:     body.dayNumber     ?? en.currentDay,
        chapterNumber: body.chapterNumber ?? en.currentChapter,
        chapterTitle:  body.chapterTitle  ?? chapterMeta(en.currentChapter).title,
        transcript:    body.transcript    || null,
        whiteboard:    body.whiteboard    || null,
        notes:         body.notes         || null,
        startedAt:     body.startedAt ? new Date(body.startedAt) : new Date(),
        endedAt:       new Date(),
      },
    })
    res.status(201).json({ lessonId: lesson.id })
  } catch (e) { next(e) }
})

// ── POST /day/complete ────────────────────────────────────────────────────
// Advance the enrolment's currentDay. Also bumps currentChapter to the FIRST
// chapter whose `days` array contains the new day, so the persona's next
// session opens on the right topic.
r.post('/day/complete', requireTrainee, async (req, res, next) => {
  try {
    const body = z.object({
      day_number: z.number().int().min(1).max(21).optional(),
    }).parse(req.body || {})
    const en = await getOrCreateEnrolment(req.trainee.id)

    const targetDay = Math.min(21, (body.day_number ?? en.currentDay) + 1)
    const nextChapter = ARISE_MX_CHAPTERS.find(c => c.days.includes(targetDay)) || chapterMeta(en.currentChapter)
    const certifiedAt = targetDay >= 21 ? new Date() : en.certifiedAt

    const updated = await prisma.ariseEnrolment.update({
      where: { id: en.id },
      data: {
        currentDay:     targetDay,
        currentChapter: nextChapter.n,
        certifiedAt,
      },
    })
    res.json({
      currentDay:     updated.currentDay,
      currentChapter: updated.currentChapter,
      chapterTitle:   nextChapter.title,
      certifiedAt:    updated.certifiedAt,
    })
  } catch (e) { next(e) }
})

// ── POST /chapter/jump ────────────────────────────────────────────────────
// Move the trainee to a specific chapter without changing their day — useful
// when they explicitly ask for a different topic mid-course.
r.post('/chapter/jump', requireTrainee, async (req, res, next) => {
  try {
    const body = z.object({
      chapter_number: z.number().int().min(1).max(17),
    }).parse(req.body || {})
    const en = await getOrCreateEnrolment(req.trainee.id)
    const chapter = chapterMeta(body.chapter_number)
    const updated = await prisma.ariseEnrolment.update({
      where: { id: en.id },
      data:  { currentChapter: body.chapter_number },
    })
    res.json({
      currentDay:     updated.currentDay,
      currentChapter: updated.currentChapter,
      chapterTitle:   chapter.title,
    })
  } catch (e) { next(e) }
})

export default r
