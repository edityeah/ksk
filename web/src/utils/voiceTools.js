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

  // ── ARISE MX classroom tools ────────────────────────────────────────
  // These write to ctx.arise, which is a set of callbacks the classroom
  // canvas registers when it mounts (via CallProvider's voiceCtxRef).
  // If no classroom is active, the tools silently no-op — the model
  // will speak normally without a visible whiteboard.
  arise_whiteboard_write: {
    handler: async ({ kind, text, clear }, ctx) => {
      if (!ctx?.arise?.appendBlock) return { ok: true, note: 'no_classroom_bound' }
      const block = {
        id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        kind, text, at: Date.now(),
      }
      if (clear) ctx.arise.clearBoard?.()
      ctx.arise.appendBlock(block)
      return { ok: true }
    },
  },
  arise_show_diagram: {
    handler: async ({ diagram_id }, ctx) => {
      if (!ctx?.arise?.showDiagram) return { ok: true, note: 'no_classroom_bound' }
      ctx.arise.showDiagram(diagram_id)
      return { ok: true, diagram_id }
    },
  },
  arise_mark_day_complete: {
    handler: async ({ day_number }, ctx) => {
      if (!ctx?.arise?.markDayComplete) return { ok: false, error: 'no_classroom_bound' }
      try {
        const r = await ctx.arise.markDayComplete(day_number)
        ctx.showToast?.({ msg: `Day ${day_number} complete — moving to Day ${r?.currentDay || day_number + 1}`, type: 'success' })
        return { ok: true, ...r }
      } catch (e) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  },
  arise_jump_to_chapter: {
    handler: async ({ chapter_number }, ctx) => {
      if (!ctx?.arise?.jumpToChapter) return { ok: false, error: 'no_classroom_bound' }
      try {
        const r = await ctx.arise.jumpToChapter(chapter_number)
        return { ok: true, ...r }
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
