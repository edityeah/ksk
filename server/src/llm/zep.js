// Zep Cloud — per-user conversation memory. Thread per (userId × persona).
//
// Calls are best-effort and silent on failure: if Zep is down or misconfigured,
// the conversation continues without long-term memory rather than 500-ing.

import { ZepClient } from '@getzep/zep-cloud'

let _client = null

function client() {
  if (_client) return _client
  if (!process.env.ZEP_API_KEY) return null
  try {
    _client = new ZepClient({ apiKey: process.env.ZEP_API_KEY })
    return _client
  } catch (e) {
    console.warn('[zep] init failed:', e?.message || e)
    return null
  }
}

// Ensure the user exists in Zep + a thread for this persona is present.
// Returns the thread ID (idempotent). Null if Zep isn't configured.
export async function ensureThread(userId, persona = 'general', userMeta = {}) {
  const c = client()
  if (!c) return null
  const threadId = `${userId}--${persona}`
  try {
    await c.user.add({
      userId: String(userId),
      firstName: userMeta.firstName || undefined,
      email: userMeta.email || undefined,
    })
  } catch (e) {
    // ignore — user.add throws on duplicate, which is expected
  }
  try {
    await c.thread.create({ threadId, userId: String(userId) })
  } catch (e) {
    // ignore — thread.create throws on duplicate
  }
  return threadId
}

export async function addMessage(threadId, role, content) {
  const c = client()
  if (!c || !threadId || !content) return
  try {
    await c.thread.addMessages(threadId, {
      messages: [{ role, content: String(content).slice(0, 8000) }],
    })
  } catch (e) {
    console.warn('[zep] addMessage failed:', e?.message || e)
  }
}

// Fetch the rolling memory context Zep maintains (summary + relevant facts).
// Returns a short text block we can inject into the system prompt.
export async function getContext(threadId) {
  const c = client()
  if (!c || !threadId) return ''
  try {
    const ctx = await c.thread.getUserContext(threadId)
    return ctx?.context || ''
  } catch (e) {
    console.warn('[zep] getContext failed:', e?.message || e)
    return ''
  }
}

export function isConfigured() {
  return !!process.env.ZEP_API_KEY
}
