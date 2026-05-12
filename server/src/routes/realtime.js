// /api/realtime/session — mint an ephemeral OpenAI Realtime session.
//
// Why this exists: the browser cannot hold OPENAI_API_KEY (a leaked key is a
// blank cheque on the project). OpenAI's Realtime API issues short-lived
// ephemeral tokens for exactly this case: server uses its real key to ask for
// a session, browser uses the ephemeral `client_secret` to open a WebRTC
// connection direct to OpenAI for ~1 minute.
//
// Docs: https://platform.openai.com/docs/api-reference/realtime-sessions
//
// We accept a persona + extraSystem so we can stamp the conversational
// instructions and voice on the session at creation time.

import { Router } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../auth/middleware.js'

const r = Router()
r.use(requireAuth)

// Cap mint rate per user — each session can chew tokens, so we don't want a
// runaway client spawning hundreds.
r.use(rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 120,                       // ~2 sessions / minute / user
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}))

const MODEL  = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17'
// `verse` and `ballad` are the warmest Indian-English-friendly OpenAI voices.
const VOICE  = process.env.OPENAI_REALTIME_VOICE || 'verse'

// Persona system prompts kept close to /api/ai/stream so behaviour is consistent
// across text and voice modes. Voice replies are intentionally short — long
// monologues are painful to listen to.
const PERSONA_PROMPTS = {
  'career-counsellor':
    "You are Karuna, an empathetic AI career counsellor for Indian skilling-scheme trainees on the KSK platform. " +
    "Be specific, practical and warm. Refer to schemes (PMKVY, DDU-GKY, NAPS, SIB) by name when relevant. " +
    "In voice mode, keep replies under 4 sentences unless asked for detail. Never invent salary numbers.",
  'mock-interviewer':
    "You are Sharma ji, a strict-but-supportive interview coach for entry-level NSQF L3-L5 roles. " +
    "Ask one question at a time. Score the answer briefly after the candidate responds. Cover technical and behavioural questions. Keep turns short.",
  'learning-assistant':
    "You are Guru ji, an AI tutor for Indian skilling trainees. Teach in micro-lessons (3 steps: what it is, real example, quick check). " +
    "Speak simply, use Indian context, and check understanding often. Keep voice turns short.",
  'general':
    "You are Swifty, the friendly assistant for the KSK platform (Kaushal Samiksha Kendra). " +
    "Help users navigate, answer policy questions, or suggest which KSK module to open. Keep voice replies brief and natural.",
}

// Hard language constraint applied to every persona. Without this, the model
// drifts to Devanagari / Urdu / other scripts when the user code-switches to
// Hindi. The user wants strict Hinglish/English only — both for what they
// read (assistant transcript) and what's shown back from their own speech.
const LANGUAGE_RULE =
  "LANGUAGE RULES (strict, non-negotiable):\n" +
  "- Reply ONLY in English or Hinglish (Hindi words written in Latin / Roman script, like 'aap kaise ho').\n" +
  "- NEVER use Devanagari, Urdu, Arabic, Tamil, Bengali or any other non-Latin script — not even for a single word.\n" +
  "- If the user speaks Hindi to you, reply in Hinglish (Latin script). If they speak English, reply in English. Mirror their register.\n" +
  "- Numbers, names and place names always in Latin script."

const BodySchema = z.object({
  persona: z.string().optional(),
  extraSystem: z.string().max(4000).optional(),
  language: z.string().optional(),     // hint only; the model auto-detects
  voice: z.string().optional(),
})

r.post('/session', async (req, res, next) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'openai_not_configured' })
    }
    const body = BodySchema.parse(req.body || {})
    const base = PERSONA_PROMPTS[body.persona] || PERSONA_PROMPTS.general
    const parts = [base, LANGUAGE_RULE]
    if (body.extraSystem) parts.push(body.extraSystem)
    const instructions = parts.join('\n\n')

    const payload = {
      model: MODEL,
      voice: body.voice || VOICE,
      modalities: ['audio', 'text'],
      instructions,
      // Server-side voice activity detection — OpenAI handles turn-taking,
      // including barge-in, natively. Tunables kept reasonable for Indian-
      // English speakers (a bit more patience than the defaults).
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 700,
        create_response: true,
        interrupt_response: true,
      },
      // Pin transcription to English. This forces Whisper to write everything
      // in Latin script — so when the user speaks Hindi, we get Hinglish on
      // screen instead of Whisper guessing Urdu / Arabic from the phonetics.
      input_audio_transcription: { model: 'whisper-1', language: 'en' },
    }

    const r2 = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: JSON.stringify(payload),
    })
    if (!r2.ok) {
      const txt = await r2.text().catch(() => '')
      console.error('[realtime] session mint failed', r2.status, txt.slice(0, 400))
      return res.status(502).json({ error: 'realtime_mint_failed', detail: txt.slice(0, 200) })
    }
    const session = await r2.json()
    // Return the bits the browser needs: ephemeral key + model name.
    res.json({
      clientSecret: session.client_secret?.value,
      expiresAt: session.client_secret?.expires_at,
      model: MODEL,
      voice: payload.voice,
    })
  } catch (e) {
    console.error('[realtime] error', e?.message || e)
    next(e)
  }
})

export default r
