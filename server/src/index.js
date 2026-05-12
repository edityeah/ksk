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
import dashboardRoutes from './routes/dashboards.js'
import accreditationRoutes from './routes/accreditation.js'

const app = express()

app.use(express.json({ limit: '5mb' }))
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173', credentials: true }))

// global rate limit (lenient — per-IP)
app.use(rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}))

// health
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }))

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
app.use('/api/dashboards', dashboardRoutes)
app.use('/api/accreditation', accreditationRoutes)

// ─── Production: also serve the built Vite SPA from /web/dist ────────────────
// In production (Render), the same Express service hosts both /api/* and the
// React frontend. In dev, Vite proxies /api → :8787 so we don't serve static
// files (Vite handles them).
if (process.env.NODE_ENV === 'production') {
  const webDist = path.resolve(__dirname, '../../web/dist')
  app.use(express.static(webDist, { maxAge: '1h', index: false }))
  // SPA fallback — every non-/api/* path returns index.html so client-side routing works.
  app.get(/^\/(?!api(\/|$)).*/, (req, res) => {
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
