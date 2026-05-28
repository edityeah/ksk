import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

import authRoutes from './routes/auth.js'
import meRoutes from './routes/me.js'
import lookupRoutes from './routes/lookups.js'
import traineeRoutes from './routes/trainees.js'
import batchRoutes from './routes/batches.js'
import attendanceRoutes from './routes/attendance.js'
import assessmentRoutes from './routes/assessments.js'
import certificateRoutes from './routes/certificates.js'
import placementRoutes from './routes/placements.js'
import retentionRoutes from './routes/retention.js'
import employerRoutes from './routes/employers.js'
import jobRoutes from './routes/jobs.js'
import stipendRoutes from './routes/stipends.js'
import notificationRoutes from './routes/notifications.js'
import chatRoutes from './routes/chats.js'
import aiRoutes from './routes/ai.js'
import avatarRoutes from './routes/avatar.js'
import ttsRoutes from './routes/tts.js'
import whisperRoutes from './routes/whisper.js'
import realtimeRoutes from './routes/realtime.js'
import dashboardRoutes from './routes/dashboards.js'
import accreditationRoutes from './routes/accreditation.js'
import ocrRoutes from './routes/ocr.js'
import epfoRoutes from './routes/epfo.js'
import mentorRoutes from './routes/mentors.js'
import postRoutes from './routes/posts.js'

const app = express()

// Trust the Render / Cloudflare proxy so req.ip reflects the real client,
// not the proxy node. Required for express-rate-limit to dedupe correctly
// per visitor instead of bucketing every request to the same IP.
app.set('trust proxy', 1)

app.use(express.json({ limit: '5mb' }))
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173', credentials: true }))

// Dev-only request logger so we can see 401s / 4xx in the terminal while
// smoke-testing the new flows. No-op in production.
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const url = req.originalUrl || req.url
    if (url === '/api/health') return next()
    const t0 = Date.now()
    const tokInfo = req.headers.authorization ? '+jwt' : 'no-jwt'
    res.on('finish', () => {
      const ms = Date.now() - t0
      const code = res.statusCode
      const mark = code >= 400 ? '⚠' : '·'
      console.log(`${mark} ${code} ${req.method} ${url} ${tokInfo} ${ms}ms`)
    })
    next()
  })
}

// Health check — defined BEFORE the rate-limit middleware so Render's internal
// probes never get throttled. Returning fast keeps the service marked healthy.
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }))

// Global rate limit (per real client IP). Skips /api/health and other probes.
app.use(rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 1200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health' || req.path === '/api',
}))

// public
app.use('/api/auth', authRoutes)
app.use('/api/lookups', lookupRoutes)

// authed
app.use('/api/me', meRoutes)
app.use('/api/trainees', traineeRoutes)
app.use('/api/batches', batchRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/assessments', assessmentRoutes)
app.use('/api/certificates', certificateRoutes)
app.use('/api/placements', placementRoutes)
app.use('/api/retention', retentionRoutes)
app.use('/api/employers', employerRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/stipends', stipendRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/avatar', avatarRoutes)
app.use('/api/tts', ttsRoutes)
app.use('/api/whisper', whisperRoutes)
app.use('/api/realtime', realtimeRoutes)
app.use('/api/dashboards', dashboardRoutes)
app.use('/api/accreditation', accreditationRoutes)
app.use('/api/ocr', ocrRoutes)
app.use('/api/epfo', epfoRoutes)
app.use('/api/mentors', mentorRoutes)
app.use('/api/posts', postRoutes)

// ─── Production: also serve the built Vite SPA from /web/dist ────────────────
// In production (Render), the same Express service hosts both /api/* and the
// React frontend. In dev, Vite proxies /api → :8787 so we don't serve static
// files (Vite handles them).
if (process.env.NODE_ENV === 'production') {
  const webDist = path.resolve(__dirname, '../../web/dist')
  // Vite content-hashes every asset filename (e.g. index-DhfxyqJe.js) so /assets/*
  // is safe to cache forever — when the contents change, the filename changes.
  // index.html itself MUST NOT cache, otherwise browsers keep loading the old
  // file and old asset references after a deploy (this is what hid the call-
  // button fix from the user for two cycles).
  app.use('/assets', express.static(path.join(webDist, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }))
  app.use(express.static(webDist, {
    index: false,
    setHeaders: (res, file) => {
      if (file.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      }
    },
  }))
  app.get(/^\/(?!api(\/|$)).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.sendFile(path.join(webDist, 'index.html'))
  })
}

app.use((err, req, res, next) => {
  console.error('[err]', err)
  res.status(err.status || 500).json({ error: err.message || 'internal_error', code: err.code })
})

const port = Number(process.env.PORT || 8787)
app.listen(port, () => {
  console.log(`[ksk] server on http://localhost:${port}  (NODE_ENV=${process.env.NODE_ENV || 'development'})`)
})
