// /api/ai — Swifty endpoint family.
//   /message    one-shot intent classification + RAG fallback (used by Ask Swifty home box)
//   /stream     SSE streaming chat (used by avatar text/voice/video modes)
//   /search     web-search-only one-shot (used by Discover Courses + Find Jobs)
//   /ask        legacy RAG-only
//   /interpret  legacy intent-only

import { Router } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../auth/middleware.js'
import { interpretAction } from '../llm/interpret.js'
import { ragAnswer } from '../llm/rag.js'
import { hasOpenAI } from '../llm/openai.js'
import { streamChat, webSearch } from '../llm/stream.js'
import { getPersona } from '../llm/anam.js'
import { ensureThread, addMessage, getContext } from '../llm/zep.js'

const r = Router()
r.use(requireAuth)

const perSession = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_HOUR || 50),
  keyGenerator: req => req.user?.id || req.ip,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})
r.use(perSession)

function isQuestionLike(text) {
  return /\?\s*$/.test(text) || /\b(why|how|what|when|where|explain|kya|kyun|kaise|samjhao|batao)\b/i.test(text)
}

r.post('/message', async (req, res, next) => {
  try {
    if (!hasOpenAI()) return res.json({ responseType: 'none', reason: 'openai_not_configured' })
    const body = z.object({ text: z.string().min(1), language: z.string().optional() }).parse(req.body)
    const text = body.text.trim()
    const role = req.user.role

    const questionFirst = isQuestionLike(text)

    if (questionFirst) {
      const rag = await ragAnswer({ question: text, role })
      if (rag.answer) {
        return res.json({
          responseType: 'answer',
          answer: { text: rag.answer, citations: rag.citations, language: body.language || 'en' },
        })
      }
    }

    const intent = await interpretAction({ text, role, language: body.language })
    if (intent?.intent && intent.confidence >= 0.5) {
      return res.json({
        responseType: 'action',
        actionId: intent.intent,
        module: intent.module,
        entities: intent.entities,
        confidence: intent.confidence,
        meta: { assistantText: intent.assistantText, chips: intent.chips, language: intent.language },
      })
    }

    if (!questionFirst) {
      const rag = await ragAnswer({ question: text, role })
      if (rag.answer) {
        return res.json({
          responseType: 'answer',
          answer: { text: rag.answer, citations: rag.citations, language: body.language || 'en' },
        })
      }
    }

    return res.json({
      responseType: 'none',
      assistantText: intent?.assistantText || "I'm not sure how to help with that yet. Try one of the suggested chips.",
      chips: intent?.chips || [],
    })
  } catch (e) { next(e) }
})

// ── Streaming chat (text + avatar voice/video modes) ──────────────────────
// Body: {
//   persona: 'career-counsellor' | 'mock-interviewer' | 'learning-assistant' | 'general',
//   messages: [{role:'user'|'assistant', content:'...'}, ...],
//   extraSystem?: string,   // additional context appended to persona prompt
//   useWebSearch?: boolean, // override persona default
// }
// Streams SSE: data: {"delta":"…"}\n\n   … then data: {"done":true}\n\n
r.post('/stream', async (req, res, next) => {
  try {
    if (!hasOpenAI()) {
      return res.status(503).json({ error: 'openai_not_configured' })
    }
    const body = z.object({
      persona: z.string().default('general'),
      messages: z.array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string() })).min(1),
      extraSystem: z.string().optional(),
      useWebSearch: z.boolean().optional(),
    }).parse(req.body)

    const persona = getPersona(body.persona)
    const useWebSearch = body.useWebSearch ?? !!persona.useWebSearch

    // Zep memory — best-effort
    const threadId = await ensureThread(req.user.id, body.persona, { firstName: req.user.name?.split(' ')[0] })
    const memCtx = await getContext(threadId)

    let system = persona.systemPrompt
    if (body.extraSystem) system += '\n\nAdditional context:\n' + body.extraSystem
    if (memCtx)           system += '\n\nWhat you remember about this user:\n' + memCtx

    // Save the latest user message
    const lastUser = [...body.messages].reverse().find(m => m.role === 'user')
    if (lastUser) await addMessage(threadId, 'user', lastUser.content)

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    let fullText = ''
    const citations = []
    try {
      await streamChat({
        system,
        messages: body.messages.filter(m => m.role !== 'system'),
        useWebSearch,
        onChunk: (delta) => {
          fullText += delta
          res.write(`data: ${JSON.stringify({ delta })}\n\n`)
        },
        onCitation: (c) => {
          if (c.url) {
            citations.push({ url: c.url, title: c.title || c.url })
            res.write(`data: ${JSON.stringify({ citation: { url: c.url, title: c.title || c.url } })}\n\n`)
          }
        },
      })
    } catch (e) {
      console.error('[ai/stream]', e)
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`)
    }

    // Persist assistant response
    if (fullText) await addMessage(threadId, 'assistant', fullText)

    res.write(`data: ${JSON.stringify({ done: true, citations })}\n\n`)
    res.end()
  } catch (e) { next(e) }
})

// ── Web search one-shot (Discover Courses / Find Jobs) ────────────────────
r.post('/search', async (req, res, next) => {
  try {
    if (!hasOpenAI()) return res.status(503).json({ error: 'openai_not_configured' })
    const body = z.object({
      query: z.string().min(1),
      instructions: z.string().optional(),
    }).parse(req.body)
    const out = await webSearch({ query: body.query, instructions: body.instructions })
    res.json(out)
  } catch (e) { next(e) }
})

// pure RAG (used by Ask AI panel when user explicitly asks a knowledge question)
r.post('/ask', async (req, res, next) => {
  try {
    const body = z.object({ question: z.string().min(1), module: z.string().optional() }).parse(req.body)
    const out = await ragAnswer({ question: body.question, role: req.user.role, module: body.module ?? null })
    res.json(out)
  } catch (e) { next(e) }
})

// pure intent classification (frontend can use directly)
r.post('/interpret', async (req, res, next) => {
  try {
    const body = z.object({ text: z.string().min(1) }).parse(req.body)
    const out = await interpretAction({ text: body.text, role: req.user.role })
    res.json(out || { intent: null })
  } catch (e) { next(e) }
})

export default r
