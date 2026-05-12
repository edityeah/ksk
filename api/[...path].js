// Vercel serverless entrypoint — wraps the Express app from ../server/src/index.js
// and re-exports it. Every request to /api/* hits this handler.
//
// On a cold start, the Express app is initialized once and reused for subsequent
// invocations on the same container. Prisma client is also reused via its global
// singleton in ../server/src/db.js.

import app from '../server/src/index.js'

export default app

// Vercel runtime config — Node 20, 512 MB memory, 30 s max duration.
// Override via vercel.json if needed.
export const config = {
  api: {
    bodyParser: false, // Express handles body parsing itself
  },
  maxDuration: 30,
}
