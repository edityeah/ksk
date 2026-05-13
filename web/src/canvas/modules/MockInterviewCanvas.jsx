// Mock Interview canvas — hero + 6 quick-action cards (interview types) on
// top, then the AvatarCall (text + voice + video) below. Same UX template as
// Career Counsellor so the trainee gets a discoverable home before tapping a
// specific drill and a way to call the interviewer directly.

import { useState } from 'react'
import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { Briefcase, Languages, Award, Lightbulb, MessageSquare, UserCheck, ChevronRight } from 'lucide-react'

const QUICK_DRILLS = [
  { id: 'hr',         icon: UserCheck,    tone: 'sky',     title: 'HR round',
    desc: 'Tell me about yourself · why this role · expectations',
    prompt: "Start an HR round mock interview with me. Ask the standard HR questions one at a time (intro, why this role, strengths, weaknesses, salary expectation). After each answer, give me a quick score and a tip to improve. Begin with the first question." },
  { id: 'technical',  icon: Briefcase,    tone: 'fuchsia', title: 'Technical / job-role round',
    desc: 'Questions specific to your job role',
    prompt: "Start a technical mock interview for my job role. Ask 5 role-specific questions one at a time — both knowledge and scenario. Score each answer briefly. Use my profile to pick the right job role automatically." },
  { id: 'situational', icon: Lightbulb,  tone: 'emerald', title: 'Situational round',
    desc: 'What-would-you-do scenarios on the job',
    prompt: "Run a situational interview with 4 realistic on-the-job scenarios for my role. Ask one at a time, listen to my answer, then give a model answer + score." },
  { id: 'english',    icon: Languages,    tone: 'amber',   title: 'English fluency check',
    desc: 'Spoken English for customer-facing roles',
    prompt: "Help me practice spoken English for an interview. Ask 5 simple questions about my background and role. After each reply, correct grammar and pronunciation gently. Hinglish→English only — don't switch to Hindi script." },
  { id: 'salary',     icon: Award,        tone: 'violet',  title: 'Salary negotiation',
    desc: 'How to answer "What is your expected salary?"',
    prompt: "Coach me on salary negotiation for my job role. Ask me my expectation, push back the way a real recruiter would, then teach me the right way to anchor and counter. Use realistic Indian entry-level numbers for my sector." },
  { id: 'feedback',   icon: MessageSquare,tone: 'rose',    title: 'Full mock + scorecard',
    desc: '10-min full interview with a final report',
    prompt: "Run a 10-minute full mock interview combining HR, technical and situational questions for my job role. At the end give me an overall scorecard with strengths, weaknesses, and 3 things to fix before the real interview." },
]

const TONES = {
  sky:     { bg: 'bg-sky-100',     fg: 'text-sky-700' },
  fuchsia: { bg: 'bg-fuchsia-100', fg: 'text-fuchsia-700' },
  emerald: { bg: 'bg-emerald-100', fg: 'text-emerald-700' },
  amber:   { bg: 'bg-amber-100',   fg: 'text-amber-700' },
  violet:  { bg: 'bg-violet-100',  fg: 'text-violet-700' },
  rose:    { bg: 'bg-rose-100',    fg: 'text-rose-700' },
}

export default function MockInterviewCanvas({ context }) {
  const threadId = context?.threadId || null
  const { meExtra } = useApp()
  const [pending, setPending] = useState(null)
  // Hide the hero + cards once a call starts — call UI owns the canvas.
  const [onCall, setOnCall] = useState(false)
  const t = meExtra?.trainee
  const jr = t?.batch?.track?.jobRoles?.[0]?.jobRole
  const ctxLine = jr ? `${jr.name} · NSQF L${jr.nsqfLevel} · ${t.batch?.scheme?.code || ''}` : 'Entry-level NSQF L3-5 candidate'

  const extraSystem = t
    ? `Candidate profile: Currently in ${t.batch?.track?.name || 'a skilling course'}${jr ? `, training for ${jr.name} (NSQF L${jr.nsqfLevel})` : ''}. Conduct interviews realistic to entry-level Indian hires for this role. Score briefly after each answer (0-5) and give one concrete tip to improve.`
    : 'Entry-level NSQF L3-5 candidate. Conduct realistic Indian-context interviews. Score briefly and give one tip after each answer.'

  const suggestions = QUICK_DRILLS.slice(0, 3).map(a => a.prompt)

  return (
    <div className="flex flex-col h-full">
      {!onCall && (
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-primary-light/60 to-white flex-shrink-0">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-primary">AI Mock Interview</div>
        <h2 className="text-[20px] font-bold text-txt-primary leading-tight mt-1">Sharma ji — practice till you're ready</h2>
        <p className="text-[12px] text-txt-secondary mt-1 truncate">{ctxLine}</p>
      </div>
      )}

      {!onCall && (
      <div className="px-5 py-3 border-b border-bdr-light flex-shrink-0">
        <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">Pick a drill</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {QUICK_DRILLS.map(a => {
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
          <MessageSquare className="w-3 h-3" /> Tap a drill to start instantly — or hit the call icons above for a voice / video interview.
        </div>
      </div>
      )}

      <div className="flex-1 min-h-0">
        <AvatarCall
          persona="mock-interviewer"
          title="Sharma ji · Mock Interview"
          intro="Realistic mock interview + scored feedback."
          useWebSearch={false}
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
