// server/src/voice/tools.js
// Server-side mirror of web/src/utils/voiceTools.js — kept in sync manually.
// The two files hold the same TOOL_CATALOG; server projects it to OpenAI's
// tools[] session field and to the persona briefing, client dispatches
// tool-call events against the same catalogue.
//
// Why duplicate: the Express server can't reach into web/src at boot
// (different module resolution, different tsconfig, different Node vs
// Vite loading semantics). Since the catalogue is small and declarative,
// keeping two copies is simpler than plumbing a shared package.
//
// If you edit one, edit the other. The header comment in
// web/src/utils/voiceTools.js says the same.

// Every trainee canvas type the model is allowed to open, paired with
// example utterances so the persona briefing can teach the model which
// intent maps where. When a user says something matching an example
// verbatim or semantically, the model calls open_canvas with the id.
//
// Sourced from web/src/canvas/modules/index.js — trainee-facing subset.
export const CANVAS_CATALOG = [
  { id: 'career_counsellor',  label: 'Career Counsellor',   utterances: ['career counseling', 'help me pick a career', 'what should I do next', 'confused about my path', 'salary for retail jobs'] },
  { id: 'learning_assistant', label: 'Learning Assistant',  utterances: ['I want to learn', 'teach me', 'help me revise', 'start learning', 'tutor me on retail'] },
  { id: 'mock_interview',     label: 'Mock Interview',      utterances: ['mock interview', 'practice interview', 'let\'s do an interview', 'prepare me for HR round'] },
  { id: 'oral_assessment',    label: 'Oral Assessment',     utterances: ['take an oral test', 'voice assessment', 'assess me'] },
  { id: 'jobs_marketplace',   label: 'Find Jobs',           utterances: ['find jobs', 'show me openings', 'jobs near me', 'apply for a job', 'retail jobs in Patna'] },
  { id: 'course_discovery',   label: 'Discover Courses',    utterances: ['discover courses', 'find a course', 'nearby ITIs', 'what courses can I take'] },
  { id: 'mentor_directory',   label: 'Industry Mentors',    utterances: ['find a mentor', 'connect with a mentor', 'industry mentors', 'talk to someone who\'s done it'] },
  { id: 'posts_feed',         label: 'Community Posts',     utterances: ['community posts', 'what\'s happening', 'news feed', 'latest updates from centres'] },
  { id: 'skill_passport',     label: 'Skill Passport',      utterances: ['show my skill passport', 'my credentials', 'my certificates', 'my passport'] },
  { id: 'placement_confirm',  label: 'Confirm Placement',   utterances: ['confirm my placement', 'accept the placement', 'verify placement offer'] },
  { id: 'retention_checkin',  label: 'Retention Check-in',  utterances: ['monthly check-in', 'retention check-in', 'am I still employed'] },
  { id: 'salary_slip',        label: 'Upload Salary Slip',  utterances: ['upload payslip', 'upload salary slip', 'submit my salary slip'] },
  { id: 'stipend_status',     label: 'My Stipend',          utterances: ['my stipend', 'stipend status', 'when will I get paid', 'NAPS stipend'] },
  { id: 'grievance',          label: 'Grievance',           utterances: ['file a grievance', 'raise a complaint', 'I need help with an issue'] },
  { id: 'notifications',      label: 'Updates & Alerts',    utterances: ['show notifications', 'any new alerts', 'my reminders'] },
]

export const CANVAS_IDS = CANVAS_CATALOG.map(c => c.id)
export const CANVAS_BY_ID = Object.fromEntries(CANVAS_CATALOG.map(c => [c.id, c]))

// Canvas-open tool — the always-on default for every voice session.
export const TOOLS = [
  {
    group: 'open',
    name: 'open_canvas',
    description: 'Open one of KSK\'s canvases in the trainee\'s UI. Call this whenever the trainee says they want to see, learn, practice, apply, browse, or check anything the app supports (see the persona briefing for utterance→canvas mapping).',
    parameters: {
      type: 'object',
      properties: {
        canvas_id: {
          type: 'string',
          enum: CANVAS_IDS,
          description: 'Canonical canvas id from the catalogue.',
        },
      },
      required: ['canvas_id'],
      additionalProperties: false,
    },
  },
]

// ── ARISE MX classroom tools ──────────────────────────────────────────────
// Only exposed to the session when persona === 'arise_mx_teacher'. Kept in
// its own list so the base voice catalogue stays lean for every other
// persona.
export const ARISE_TOOLS = [
  {
    name: 'arise_whiteboard_write',
    description: 'Write on the classroom whiteboard so the trainee can see the key points as text while you speak. Call this the moment you introduce a new term, formula, or step-list; then continue explaining in voice.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['title', 'bullets', 'formula', 'definition', 'steps', 'note'],
                description: 'title=short header; bullets=list; formula=math/equation; definition=term + explanation; steps=numbered procedure; note=inline callout' },
        text: { type: 'string', description: 'Text to write. For bullets/steps, put one item per line.' },
        clear: { type: 'boolean', description: 'If true, wipe the whiteboard before writing this block. Defaults to false — content stacks.' },
      },
      required: ['kind', 'text'],
      additionalProperties: false,
    },
  },
  {
    name: 'arise_show_diagram',
    description: 'Display a pre-authored diagram on the whiteboard. Use whenever you\'re explaining anything visual — a circuit, a symbol, a repair layout, a workflow.',
    parameters: {
      type: 'object',
      properties: {
        diagram_id: {
          type: 'string',
          enum: ['ohms_law', 'series_circuit', 'parallel_circuit', 'resistor_symbol', 'multimeter_layout',
                 'pcb_layout', 'gsm_architecture', 'solder_joint_good_bad', 'phone_disassembly', 'esd_setup'],
          description: 'Which pre-authored diagram to display',
        },
      },
      required: ['diagram_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'arise_mark_day_complete',
    description: 'Advance the trainee to the next day of the 21-day curriculum. Call ONLY when the trainee has demonstrably grasped that day\'s material (verified via at least one question they answered correctly). Never call just because time passed.',
    parameters: {
      type: 'object',
      properties: {
        day_number: { type: 'integer', minimum: 1, maximum: 21, description: 'The day being marked complete.' },
      },
      required: ['day_number'],
      additionalProperties: false,
    },
  },
  {
    name: 'arise_jump_to_chapter',
    description: 'Jump to a specific chapter (1-17). Use when the trainee explicitly asks for a different topic. Confirm verbally first.',
    parameters: {
      type: 'object',
      properties: {
        chapter_number: { type: 'integer', minimum: 1, maximum: 17 },
      },
      required: ['chapter_number'],
      additionalProperties: false,
    },
  },
]

const ARISE_TOOLS_BY_NAME = Object.fromEntries(ARISE_TOOLS.map(t => [t.name, t]))

// Shape required by OpenAI Realtime session config (tools[] field).
// Pass `extraToolNames` from a persona builder to include persona-specific
// tools (e.g. the ARISE classroom tools when persona=arise_mx_teacher).
export function toOpenAIToolDefs({ extraToolNames = [] } = {}) {
  const baseline = TOOLS.map(t => ({
    type: 'function',
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }))
  const extras = extraToolNames
    .map(n => ARISE_TOOLS_BY_NAME[n])
    .filter(Boolean)
    .map(t => ({
      type: 'function',
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }))
  return [...baseline, ...extras]
}

// Plain-text briefing appended to the session's `instructions` field so
// the model knows WHEN to call each tool. This is the routing table.
// Keep it terse — the model reads it every session.
export function toPersonaBriefing() {
  const lines = [
    '',
    '# UI orchestration — you can OPEN screens for the trainee',
    '',
    'You have one tool: `open_canvas(canvas_id)`. When the trainee\'s intent matches any canvas below, CALL THE TOOL — never just narrate. Speak naturally alongside the call ("Haan, mock interview khol raha hoon…"), then fire it. The trainee must always hear what\'s happening.',
    '',
    '## Canvas → typical utterances',
    '',
  ]
  for (const c of CANVAS_CATALOG) {
    const examples = c.utterances.slice(0, 3).map(u => `"${u}"`).join(' · ')
    lines.push(`- \`${c.id}\` — ${c.label}. Trainee says: ${examples}`)
  }
  lines.push('')
  lines.push('## Strict rules')
  lines.push('- Never announce "I\'ll open X" without immediately calling `open_canvas`. Speak and dispatch in the same beat.')
  lines.push('- Tools fire silently — YOU are the voice. Speak in the trainee\'s language (Hindi / Hinglish / English / any Indian language).')
  lines.push('- Don\'t read tool names or canvas ids aloud — they\'re internal. Speak the OUTCOME ("Mock interview open ho gaya hai").')
  lines.push('- If a canvas id doesn\'t match what the trainee wants, ask them to clarify rather than opening the wrong one.')
  lines.push('- If the trainee is already looking at a canvas and asks a question ABOUT that canvas, answer it — don\'t re-open the same canvas.')
  return lines.join('\n')
}
