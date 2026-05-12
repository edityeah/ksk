// /api/ai — Swifty endpoint. Tries action classification first; if low confidence
// or the question is question-shaped, falls through to RAG.

import { Router } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../auth/middleware.js'
import { interpretAction } from '../llm/interpret.js'
import { ragAnswer } from '../llm/rag.js'
import { hasOpenAI } from '../llm/openai.js'

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
