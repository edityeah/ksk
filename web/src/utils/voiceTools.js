// web/src/utils/voiceTools.js
// Client-side mirror of server/src/voice/tools.js. Must stay in sync —
// the server projects TOOLS into the OpenAI Realtime session config,
// and the client dispatches tool-call events from that same session
// against the handlers defined here.
//
// If you edit one, edit the other.
//
// This file:
//   • carries the same TOOL_CATALOG (name + params) as server-side,
//     so the client can validate incoming tool-call events;
//   • adds HANDLERS that run in-browser and mutate app state (mostly
//     calls into AppContext via a bound ctx);
//   • exports handleVoiceToolCall(name, args, ctx) as the dispatcher
//     that the realtime hook calls when a tool arrives.

// Canvas catalogue — same shape as server. Copy of CANVAS_CATALOG kept
// literal here so bundle can render UI hints from it without hitting
// the network.
export const CANVAS_CATALOG = [
  { id: 'career_counsellor',  label: 'Career Counsellor' },
  { id: 'learning_assistant', label: 'Learning Assistant' },
  { id: 'mock_interview',     label: 'Mock Interview' },
  { id: 'oral_assessment',    label: 'Oral Assessment' },
  { id: 'jobs_marketplace',   label: 'Find Jobs' },
  { id: 'course_discovery',   label: 'Discover Courses' },
  { id: 'mentor_directory',   label: 'Industry Mentors' },
  { id: 'posts_feed',         label: 'Community Posts' },
  { id: 'skill_passport',     label: 'Skill Passport' },
  { id: 'placement_confirm',  label: 'Confirm Placement' },
  { id: 'retention_checkin',  label: 'Retention Check-in' },
  { id: 'salary_slip',        label: 'Upload Salary Slip' },
  { id: 'stipend_status',     label: 'My Stipend' },
  { id: 'grievance',          label: 'Grievance' },
  { id: 'notifications',      label: 'Updates & Alerts' },
]
export const CANVAS_BY_ID = Object.fromEntries(CANVAS_CATALOG.map(c => [c.id, c]))

// ── Tools ─────────────────────────────────────────────────────────────
// Each tool defines a handler that receives (args, ctx). ctx is bound
// by VoiceCallCtx (CallProvider) with openCanvas + showToast from
// useApp(). Handlers return a JSON-serialisable object that gets sent
// back to the model as function_call_output. Keep the returned payload
// small — the model just needs to know it worked.

export const TOOLS = {
  open_canvas: {
    handler: async ({ canvas_id }, ctx) => {
      if (!canvas_id) return { ok: false, error: 'canvas_id missing' }
      const meta = CANVAS_BY_ID[canvas_id]
      if (!meta) return { ok: false, error: `unknown canvas: ${canvas_id}` }
      if (!ctx?.openCanvas) return { ok: false, error: 'voice ctx not bound' }
      try {
        ctx.openCanvas({ type: canvas_id })
        // Also surface a toast so the trainee sees a visual confirmation
        // in addition to the model's spoken response — helpful when the
        // canvas is opening under an active call overlay.
        ctx.showToast?.({ msg: `Opened: ${meta.label}`, type: 'info' })
        return { ok: true, canvas_id, title: meta.label }
      } catch (e) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  },
}

// Dispatcher — called by realtimeVoice.js when a function_call event
// completes. Returns whatever the handler returned; the caller
// serialises it and posts back as function_call_output.
export async function handleVoiceToolCall(name, args, ctx) {
  const tool = TOOLS[name]
  if (!tool) return { ok: false, error: `unknown tool: ${name}` }
  try {
    return await tool.handler(args || {}, ctx || {})
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  }
}
