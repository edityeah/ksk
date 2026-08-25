import { PrismaClient } from '@prisma/client'

// Render's *internal* Postgres hostname (`dpg-<id>-a`, no dots) only resolves
// when the web service and the DB live in the same region. Ours don't (DB is
// Singapore). Rewrite any such short-form hostname in DATABASE_URL to its
// public `.singapore-postgres.render.com` counterpart so the connection
// resolves regardless of where the web service is deployed.
try {
  const raw = process.env.DATABASE_URL
  if (raw) {
    const u = new URL(raw)
    if (/^dpg-[a-z0-9]+-a$/i.test(u.hostname)) {
      u.hostname = `${u.hostname}.singapore-postgres.render.com`
      // Render's public Postgres endpoint requires TLS; the internal one
      // didn't. Enforce sslmode=require if the URL doesn't already say so.
      if (!u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'require')
      process.env.DATABASE_URL = u.toString()
      console.log('[db] rewrote DATABASE_URL host →', u.hostname)
    }
  }
} catch (e) {
  console.warn('[db] DATABASE_URL rewrite skipped:', e?.message || e)
}

const globalForPrisma = globalThis
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'],
})
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
