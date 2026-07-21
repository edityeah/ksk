// Learning Assistant canvas — quick learning actions on top, AvatarCall below.
//
// Also hosts the entry point into the ARISE MX digital-twin classroom — a
// pinned chip at the top of the canvas that switches into the Samsung ARISE
// mode. Tap opens AriseClassroomCanvas via the shared canvas router; the
// trainee's ARISE progress + tutor persona lives there.

import { useState } from 'react'
import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { BookOpen, HelpCircle, ListChecks, Mic, FileText, Sparkles, ChevronRight, MessageSquare, GraduationCap } from 'lucide-react'

const TONES = {
  indigo: { bg: 'bg-indigo-100',  fg: 'text-indigo-700' },
  emerald:{ bg: 'bg-emerald-100', fg: 'text-emerald-700' },
  amber:  { bg: 'bg-amber-100',   fg: 'text-amber-700' },
  rose:   { bg: 'bg-rose-100',    fg: 'text-rose-700' },
  violet: { bg: 'bg-violet-100',  fg: 'text-violet-700' },
  sky:    { bg: 'bg-sky-100',     fg: 'text-sky-700' },
}

export default function LearningAssistantCanvas({ context }) {
  const { meExtra, openCanvas } = useApp()
  const threadId = context?.threadId || null
  const [pending, setPending] = useState(null)
  // Same WhatsApp-style behaviour as Career Counsellor: hide the hero + cards
  // once a call starts so the call UI gets the full canvas.
  const [onCall, setOnCall] = useState(false)
  const t = meExtra?.trainee
  const track = t?.batch?.track
  const jr = track?.jobRoles?.[0]?.jobRole
  const ctxLine = track ? `${track.name}${jr ? ' · ' + jr.name : ''} · NSQF L${jr?.nsqfLevel || '?'}` : 'No course enrolled yet'

  const extraSystem = track ? `Current course: ${track.name}. Job role: ${jr?.name || 'TBD'} (NSQF L${jr?.nsqfLevel}). Scheme: ${t.batch?.scheme?.code}. Tailor explanations to this course context.` : ''

  // Learner-perspective actions, sourced from the Sample Queries sheet.
  // Each fires a card-shaped response (resources, schedule, score, etc.).
  const ACTIONS = [
    { id: 'notes',     icon: BookOpen,   tone: 'indigo',  title: "Today's notes",       desc: 'Materials from today\'s session',
      prompt: "Show me today's notes and study material." },
    { id: 'video',     icon: Sparkles,   tone: 'sky',     title: 'Module videos',       desc: 'Watch the latest module recording',
      prompt: track ? `Where's the video for the latest module of ${track.name}? Give me the link or download.` : "Where's the video for module 3 of my course?" },
    { id: 'practice',  icon: FileText,   tone: 'emerald', title: 'Practice questions',  desc: 'Prep for the next assessment',
      prompt: 'Give me practice questions for the next test on my current QP / NOS.' },
    { id: 'syllabus',  icon: ListChecks, tone: 'amber',   title: 'Full syllabus',       desc: 'What\'s covered + when',
      prompt: 'Show me the full syllabus for my course, module by module.' },
    { id: 'doubt',     icon: HelpCircle, tone: 'rose',    title: 'Ask a doubt',         desc: 'Get help with anything confusing',
      prompt: 'I have a doubt about my course — can you explain a concept simply?' },
    { id: 'quiz',      icon: Mic,        tone: 'violet',  title: 'Quick quiz',          desc: '5-question warm-up',
      prompt: `Quiz me on ${jr?.name || 'my skilling course'} — 5 multiple-choice questions, one at a time, with feedback.` },
  ]

  const suggestions = ACTIONS.slice(0, 3).map(a => a.prompt)

  return (
    <div className="flex flex-col h-full">
      {!onCall && (
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-primary-light/60 to-white flex-shrink-0">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-primary">AI Learning Assistant</div>
        <h2 className="text-[20px] font-bold text-txt-primary leading-tight mt-1">Guru ji — your AI tutor</h2>
        <p className="text-[12px] text-txt-secondary mt-1 truncate">{ctxLine}</p>

        {/* Samsung ARISE MX entry chip — takes trainee into the digital-twin
            classroom for the Samsung-funded mobile-repair curriculum. */}
        <button
          onClick={() => openCanvas({ type: 'arise_classroom' })}
          className="mt-3 w-full flex items-center gap-3 rounded-2xl border border-emerald-800/60 bg-gradient-to-br from-[#0F1E14] via-slate-950 to-[#0F1E14] px-4 py-3 text-left hover:from-slate-900 hover:to-slate-900 transition group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-amber-300 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[2px] font-bold text-amber-300">Samsung · ARISE MX</div>
            <div className="text-[13px] font-bold text-white leading-tight mt-0.5">Open the classroom</div>
            <div className="text-[11px] text-emerald-100/70 leading-tight mt-0.5">
              21-day mobile repair course — voice tutor writes on the blackboard as they teach
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-100/60 group-hover:text-white transition flex-shrink-0" />
        </button>
      </div>
      )}

      {!onCall && (
      <div className="px-5 py-3 border-b border-bdr-light flex-shrink-0">
        <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">Learn faster</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ACTIONS.map(a => {
            const Icon = a.icon
            const tone = TONES[a.tone]
            return (
              <button key={a.id} onClick={() => setPending({ text: a.prompt, nonce: Date.now() })}
                className="text-left rounded-2xl border border-bdr-light bg-white hover:border-primary hover:shadow-card transition p-3 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${tone.bg} ${tone.fg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13px] text-txt-primary leading-tight">{a.title}</div>
                  <div className="text-[11px] text-txt-secondary leading-snug mt-0.5">{a.desc}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-txt-tertiary mt-2 flex-shrink-0" />
              </button>
            )
          })}
        </div>
        <div className="text-[10px] text-txt-tertiary mt-2.5 inline-flex items-center gap-1">
          <MessageSquare className="w-3 h-3" /> Tap a card to ask immediately — or type your own / start a call.
        </div>
      </div>
      )}

      <div className="flex-1 min-h-0">
        <AvatarCall
          persona="learning-assistant"
          title="Guru ji · Learning Assistant"
          intro="Type, voice-call, or video-call. Guru ji can search the web for free learning resources."
          useWebSearch
          extraSystem={extraSystem}
          suggestions={suggestions}
          pendingPrompt={pending}
          threadId={threadId}
          onCallStateChange={(s) => setOnCall(s !== 'idle')}
        />
      </div>
    </div>
  )
}
