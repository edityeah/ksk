// Career Counsellor canvas — quick-action cards on top, AvatarCall (text + Start Call) below.

import { useState } from 'react'
import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { Target, TrendingUp, Map, Award, BadgeCheck, IndianRupee, ChevronRight, MessageSquare } from 'lucide-react'

const QUICK_ACTIONS = [
  { id: 'career-paths',     icon: Map,           tone: 'sky',     title: 'Career paths',      desc: 'Top job roles for your education + interests',
    prompt: 'Based on my profile, what are the top 5 career paths I should consider over the next 3 years? Include salary ranges and required skills.' },
  { id: 'skill-gap',        icon: Target,        tone: 'fuchsia', title: 'Skill gap analysis', desc: 'What you have vs what you need',
    prompt: 'What skills do I have right now versus what I need for the career I want? Tell me 3 concrete things I should learn next.' },
  { id: 'eligible-schemes', icon: BadgeCheck,    tone: 'emerald', title: 'Eligible schemes',   desc: 'PMKVY / DDU-GKY / NAPS / SIB you qualify for',
    prompt: 'Which Government of India skilling schemes am I eligible for? Use web search to confirm current eligibility and stipends.' },
  { id: 'salary',           icon: IndianRupee,   tone: 'amber',   title: 'Salary benchmarks', desc: 'Current pay across roles in your sector',
    prompt: 'What are current entry-level salaries in India for the roles in my sector? Search the web for 2026 data.' },
  { id: 'next-course',      icon: Award,         tone: 'violet',  title: 'Next-best course',  desc: 'AI-recommended next step',
    prompt: 'Recommend the single best skilling course I should take next, given where I am right now. Be specific about provider, duration and outcomes.' },
  { id: 'progression',      icon: TrendingUp,    tone: 'rose',    title: 'Career progression', desc: '3-year roadmap with checkpoints',
    prompt: 'Give me a 3-year career roadmap from where I am today: year 1 goal, year 2 goal, year 3 goal. Concrete and realistic.' },
]

const TONES = {
  sky:     { bg: 'bg-sky-100',     fg: 'text-sky-700' },
  fuchsia: { bg: 'bg-fuchsia-100', fg: 'text-fuchsia-700' },
  emerald: { bg: 'bg-emerald-100', fg: 'text-emerald-700' },
  amber:   { bg: 'bg-amber-100',   fg: 'text-amber-700' },
  violet:  { bg: 'bg-violet-100',  fg: 'text-violet-700' },
  rose:    { bg: 'bg-rose-100',    fg: 'text-rose-700' },
}

export default function CareerCounsellorCanvas({ context }) {
  const threadId = context?.threadId || null
  const { meExtra } = useApp()
  // `pending` is fed to AvatarCall as `pendingPrompt` — a fresh object each
  // tap (nonce = timestamp) so re-clicking the same card re-fires the prompt.
  const [pending, setPending] = useState(null)
  const t = meExtra?.trainee
  const ctxLine = t
    ? `${t.education} · ${t.batch?.track?.name || 'not enrolled yet'} · ${t.district || ''}${t.state ? ', ' + t.state : ''}${t.category ? ' · ' + t.category : ''}`
    : ''

  const extraSystem = t ? [
    `Trainee profile:`,
    `- Education: ${t.education}`,
    t.batch ? `- Currently in: ${t.batch.track?.name} at ${t.batch.centre?.name} (scheme ${t.batch.scheme?.code})` : '- Not currently enrolled',
    t.district ? `- Location: ${t.district}, ${t.state}` : '',
    t.category ? `- Social category: ${t.category}` : '',
    t.gender ? `- Gender: ${t.gender}` : '',
  ].filter(Boolean).join('\n') : ''

  // Surface the next three actions as inline suggestion chips for keyboard users.
  const suggestions = QUICK_ACTIONS.slice(0, 3).map(a => a.prompt)

  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-primary-light/60 to-white flex-shrink-0">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-primary">AI Career Counsellor</div>
        <h2 className="text-[20px] font-bold text-txt-primary leading-tight mt-1">Hi {t?.name?.split(' ')[0] || 'there'} — let's plan your career</h2>
        {ctxLine && <p className="text-[12px] text-txt-secondary mt-1 truncate">{ctxLine}</p>}
      </div>

      {/* Quick-action cards */}
      <div className="px-5 py-3 border-b border-bdr-light flex-shrink-0">
        <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">Quick guidance</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {QUICK_ACTIONS.map(a => {
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
          <MessageSquare className="w-3 h-3" /> Tap a card to ask immediately — or type your own question / start a call.
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <AvatarCall
          persona="career-counsellor"
          title="Karuna · Career Counsellor"
          intro="Type, voice-call or video-call. Web-search-enabled for live scheme details."
          useWebSearch
          extraSystem={extraSystem}
          suggestions={suggestions}
          pendingPrompt={pending}
          threadId={threadId}
        />
      </div>
    </div>
  )
}
