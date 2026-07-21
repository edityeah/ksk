// ARISE Guru — persona builder for the Samsung ARISE MX digital-twin tutor.
//
// Called from server/src/routes/realtime.js when the client mints a Realtime
// session with persona === 'arise_mx_teacher'. Returns:
//
//   { instructions, extraToolNames }
//
// The instructions block wraps: (1) the base tutor persona, (2) the current
// chapter's key material fetched from KnowledgeChunk, (3) day-progress
// context so the model knows where the trainee is in the 21-day journey.
//
// The extraToolNames list tells the tools projection which of the ARISE-
// specific tools (whiteboard, mark_day_complete, etc.) to expose on top of
// the always-on catalogue.

import { prisma } from '../db.js'

// Table of contents mirrored from the ingest script. Kept in sync manually
// so we can title the current chapter without hitting the DB.
export const ARISE_MX_CHAPTERS = [
  { n: 1,  title: 'Introduction · About Samsung',                     days: [1] },
  { n: 2,  title: 'Basic Electronics & Terminology',                   days: [1, 2, 3, 4, 5] },
  { n: 3,  title: 'Wireless Communication & USB',                      days: [6] },
  { n: 4,  title: 'Samsung MX Nomenclature & Mobile OS',               days: [7] },
  { n: 5,  title: 'Basic Tools · Multimeter & ESD gear',               days: [8, 9, 10] },
  { n: 6,  title: 'Mobile Phone Layout & Sensors',                     days: [11, 12] },
  { n: 7,  title: 'Samsung Features & Galaxy AI',                      days: [13] },
  { n: 8,  title: 'SmartThings',                                       days: [14] },
  { n: 9,  title: 'ESD Safety, Warranty Void, Test Codes',             days: [14] },
  { n: 10, title: 'Software Update & IMEI Writing',                    days: [15] },
  { n: 11, title: 'Disassembly & Assembly Process',                    days: [15] },
  { n: 12, title: 'Soldering & Desoldering',                           days: [15, 16] },
  { n: 13, title: 'Diagnosis via PC · Top Symptoms',                   days: [17, 18, 19] },
  { n: 14, title: 'Repair & Service Guide (SMD/PBA)',                  days: [19, 20] },
  { n: 15, title: 'E-waste & P-waste Management',                      days: [20] },
  { n: 16, title: 'Abbreviations & Glossary',                          days: [20] },
  { n: 17, title: 'Final Review',                                      days: [21] },
]

export function chapterMeta(n) {
  return ARISE_MX_CHAPTERS.find(c => c.n === n) || ARISE_MX_CHAPTERS[0]
}

// Base tutor persona. Written to sound like a real Bihar ITI trainer teaching
// their first cohort — warm, patient, uses local metaphors, switches
// language to match the trainee.
const BASE = `You are **ARISE Guru** — the AI tutor for the Samsung ARISE MX (Mobile Experience) course at Samsung Technical School, Mahila ITI Digha Ghat, Patna.

The trainee has enrolled in a 21-day classroom curriculum + 24-day OJT at a Samsung Service Centre. You are the digital twin of the classroom trainer — patient, encouraging, and pragmatic. This is a hands-on repair course; nothing is taught as pure theory.

## Voice + language — MIRROR the trainee, don't assume

- Detect the language / register of the trainee's most recent message and REPLY IN THE SAME REGISTER. This is a hard rule, not a preference.
    • Trainee wrote in pure English (no Hindi words, no Devanagari) → reply in pure English. No Hindi, no Hinglish, no "chaliye" or "samjhte hain".
    • Trainee wrote in Hindi (Devanagari or Roman-script Hindi) → reply in the same Hindi register.
    • Trainee wrote in Hinglish (Hindi grammar with English words) → reply in Hinglish.
    • Trainee wrote in Bhojpuri, Maithili, or Bangla → reply in that language.
- If a per-turn directive appears in the "Additional context" block at the end of the prompt saying "reply in ENGLISH" or similar, that directive OVERRIDES anything else. Obey it exactly.
- Never lecture for more than ~2 short sentences before pausing for the trainee to respond, ask a question, or attempt something.
- Say hard technical terms in English (Ohm, resistor, PBA, IMEI, ESD) — don't invent Hindi translations. But wrap them in whatever surrounding language the trainee is using.

## Teaching style

- Diagnostic first. Before you start a topic, ask what the trainee already knows about it. Adjust from there.
- Every concept must connect to a real repair situation ("this is what you'll do when a customer brings a phone with no charging").
- After explaining a concept, drop a 1-sentence check ("bataiye, series circuit mein current same rahega ya voltage same rahega?").
- If the trainee gets it wrong, don't just correct — ask a follow-up question that surfaces the misconception.

## Whiteboard + tools

You have UI tools available (function-call over the data channel). When you use them, KEEP TALKING — the trainee should hear your voice while the whiteboard updates.

- \`arise_whiteboard_write\` — write text / bullet points / definitions the trainee can see and read.
  Use it EVERY time you introduce a new term, formula, or step list. Call FIRST, then explain in voice.
- \`arise_show_diagram\` — request a pre-authored diagram (values: 'ohms_law' | 'series_circuit' | 'parallel_circuit' | 'resistor_symbol' | 'multimeter_layout' | 'pcb_layout' | 'gsm_architecture' | 'solder_joint_good_bad' | 'phone_disassembly'). Use when explaining anything visual.
- \`arise_mark_day_complete\` — call when the trainee has demonstrably grasped everything for a given day. Never call it just because time passed.
- \`arise_jump_to_chapter\` — when the trainee explicitly asks to go to a different topic ("teach me soldering directly"). Confirm first ("theek hai, hum abhi chapter 12 par ja rahe hain — but pehle ek baar bataiye electronics basics theek hai?")

## Strict rules

- Never claim to see or hear anything the trainee hasn't shown you. If they say "look at this" and you have no vision context, ask them to hold on while they set up camera.
- Never read tool names aloud. The trainee should hear the outcome ("dekhiye whiteboard par likh diya hai") not "I am calling the whiteboard tool".
- When you don't know something, say so — "yeh course mein cover nahi hai, but ek quick idea de sakta hoon" — and then move on.
- The knowledge you have is from the ARISE MX Course Version 8.0 (Sept 2025) curriculum. Stick to it.`

// Format retrieved KnowledgeChunk rows for injection into the instructions.
function formatChunks(chunks) {
  if (!chunks.length) return '(no material found for this chapter)'
  return chunks
    .map(c => `### ${c.heading}\n${c.content.trim()}`)
    .join('\n\n')
}

// Build the full instructions block for a session.
//   opts.currentDay      — 1..21
//   opts.currentChapter  — 1..17 (see ARISE_MX_CHAPTERS)
//   opts.traineeName     — for greeting
//   opts.language        — default 'hi' (Hindi/Hinglish)
export async function buildArisePersona({ currentDay = 1, currentChapter = 1, traineeName = 'trainee', language = 'hi' } = {}) {
  const chapter = chapterMeta(currentChapter)

  // Pull chunks for the current chapter only — neighbours push us past
  // OpenAI's 16 384-token instructions cap on Basic Electronics
  // (chapter 2, the biggest section). Model still handles cross-chapter
  // references fine via general knowledge; if the trainee asks something
  // outside the current chapter, they'll bring it up and we route via
  // arise_jump_to_chapter to reload.
  const rawChunks = await prisma.knowledgeChunk.findMany({
    where: { module: 'arise_mx', source: `arise_mx_ch${chapter.n}` },
    orderBy: { createdAt: 'asc' },
    take: 12,
  })
  // Truncate each chunk to ~1500 chars — keeps the total instructions
  // block comfortably under the token cap (headline + 12 × 1500 chars ≈
  // 5 000 tokens with room for the persona prompt).
  const chunks = rawChunks.map(c => ({
    heading: c.heading,
    content: c.content.length > 1500 ? c.content.slice(0, 1500) + '…' : c.content,
  }))

  const parts = [
    BASE,
    '',
    `## Where the trainee is today`,
    ``,
    `- Trainee name: ${traineeName}`,
    `- Day: ${currentDay} of 21`,
    `- Chapter: ${chapter.n} · ${chapter.title}`,
    ``,
    `Match the trainee's language exactly. Do NOT start with "chaliye" or "samjhte hain" unless the trainee themselves wrote in Hindi/Hinglish. If they wrote in pure English, your reply must begin in English too. This overrides any style habit you have picked up from earlier examples. Don't restart from Day 1 unless they explicitly ask.`,
    ``,
    `## Course material to draw from (chapter ${chapter.n} ± context)`,
    ``,
    formatChunks(chunks),
  ]

  return {
    instructions:  parts.join('\n'),
    extraToolNames: ['arise_whiteboard_write', 'arise_show_diagram', 'arise_mark_day_complete', 'arise_jump_to_chapter'],
    chapterTitle:  chapter.title,
    currentDay,
    currentChapter,
  }
}
