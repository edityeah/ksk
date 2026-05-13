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
import { openai } from '../llm/openai.js'
import { getPersona } from '../llm/anam.js'
import { ensureThread, addMessage, getContext } from '../llm/zep.js'
import { CardParser } from '../llm/cardParser.js'
import { CARD_TOOLBOX } from '../llm/cardPrompts.js'

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
    // Card toolbox — tells the LLM *when* and *how* to emit
    // <<<KSKCARD>>>...<<<END>>> fences for the 12 KSK card types. The fences
    // are parsed out server-side by CardParser and forwarded as a separate
    // SSE "card" event so the client can render real React components.
    system += '\n\n' + CARD_TOOLBOX
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
    // Streaming card parser: pulls <<<KSKCARD>>>...<<<END>>> blocks out of the
    // raw LLM text and emits them as `card` SSE events. Everything outside
    // those fences passes through to the client as normal `delta` events.
    const cardParser = new CardParser({
      onText: (text) => {
        fullText += text
        res.write(`data: ${JSON.stringify({ delta: text })}\n\n`)
      },
      onCard: (card) => {
        res.write(`data: ${JSON.stringify({ card })}\n\n`)
      },
    })
    try {
      await streamChat({
        system,
        messages: body.messages.filter(m => m.role !== 'system'),
        useWebSearch,
        onChunk: (delta) => { cardParser.feed(delta) },
        onCitation: (c) => {
          if (c.url) {
            citations.push({ url: c.url, title: c.title || c.url })
            res.write(`data: ${JSON.stringify({ citation: { url: c.url, title: c.title || c.url } })}\n\n`)
          }
        },
      })
      cardParser.flush()
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

// /describe-screen — vision-driven screen-share guidance.
//
// Body: { image: 'data:image/jpeg;base64,...', persona?: string, lastQuestion?: string,
//         role?: string }
//
// Used by AvatarCall while the user is screen-sharing: every few seconds we
// post the current frame, get back a short description (UI in view, actions
// available, KSK-context where possible). The client injects this back into
// the live Realtime conversation as system context so the agent can guide the
// user — "tap the Discover Courses tile in the top right", etc.
//
// Cost guard: 60/hr/user is plenty for a demo; bump in prod if needed.
r.post('/describe-screen',
  rateLimit({ windowMs: 60 * 60 * 1000, limit: 60, keyGenerator: (req) => req.user?.id || req.ip }),
  async (req, res, next) => {
    try {
      const body = z.object({
        image:        z.string().min(20),    // data URL
        persona:      z.string().optional(),
        lastQuestion: z.string().optional(),
        role:         z.string().optional(),
      }).parse(req.body)
      if (!hasOpenAI()) return res.status(503).json({ error: 'openai_not_configured' })

      const roleLine = body.role ? `User's role on KSK: ${body.role}.` : ''
      const askLine  = body.lastQuestion ? `User just asked: "${body.lastQuestion}".` : ''
      const system = [
        "You are the eyes of a live AI assistant guiding an Indian skilling-platform user (KSK — Kaushal Samiksha Kendra).",
        "Look at the screenshot and reply with ONE compact paragraph (≤60 words) describing:",
        "1) which KSK screen is visible (Home / a specific module / a dialog), 2) the key clickable elements the user can tap RIGHT NOW (by visible label + location, e.g. \"top-right blue 'New chat' button\", \"the third card labelled 'Skill Passport' in the OPEN AN APP grid\"), 3) any in-progress state the user might be stuck on.",
        "Do NOT speculate beyond what's visible. Use the exact button / card labels you can read. No markdown, no preamble — just the description.",
        roleLine, askLine,
      ].filter(Boolean).join(' ')

      const resp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: [
            { type: 'text', text: 'Describe the current screen.' },
            { type: 'image_url', image_url: { url: body.image, detail: 'low' } },
          ] },
        ],
        max_tokens: 220,
        temperature: 0.2,
      })
      const description = resp.choices?.[0]?.message?.content?.trim() || ''
      res.json({ description })
    } catch (e) {
      console.error('[describe-screen] failed', e?.message || e)
      next(e)
    }
  }
)

// pure intent classification (frontend can use directly)
r.post('/interpret', async (req, res, next) => {
  try {
    const body = z.object({ text: z.string().min(1) }).parse(req.body)
    const out = await interpretAction({ text: body.text, role: req.user.role })
    res.json(out || { intent: null })
  } catch (e) { next(e) }
})

export default r
