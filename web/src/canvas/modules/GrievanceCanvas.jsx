// Grievance canvas — quick-action chips for the most common student grievances
// + chat (text / voice / video) so the trainee can talk it through. The agent
// is briefed to capture the grievance details, assign a category, propose a
// next step, and emit a `ticket` card if the user wants to file one formally.

import { useState } from 'react'
import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { AlertTriangle, UserX, IndianRupee, CalendarX, FileWarning, ShieldAlert, ChevronRight, MessageSquare } from 'lucide-react'

const QUICK_GRIEVANCES = [
  { id: 'trainer-absent',  icon: UserX,        tone: 'rose',    title: 'Trainer is absent',
    desc: "Trainer hasn't come for class for several days",
    prompt: "Mera trainer pichhle kuchh dino se class nahi le raha. Centre ko bola lekin koi reply nahi. File karo grievance ke saath full timeline, fir raise the ticket." },
  { id: 'stipend-pending', icon: IndianRupee,  tone: 'amber',   title: 'Stipend not received',
    desc: 'PMKVY / DBT stipend pending for X months',
    prompt: "Mera stipend pichhle 2 mahine se nahi aaya. Bank account active hai, Aadhaar linked hai. Find out why and file a grievance with NSDC." },
  { id: 'placement-fake',  icon: ShieldAlert,  tone: 'fuchsia', title: 'Fake / forced placement',
    desc: "I'm declared 'placed' but I never joined that company",
    prompt: "Mere training partner ne declare kiya ki mujhe Reliance me placement mila lekin maine wahan apply hi nahi kiya, naa hi join kiya. Mere passport pe galat placement chadha hua hai. Help me file this." },
  { id: 'cert-missing',    icon: FileWarning,  tone: 'sky',     title: 'Certificate not in DigiLocker',
    desc: 'Course finished but no certificate received',
    prompt: "Maine course complete kar diya, assessment bhi paas hua, lekin abhi tak certificate DigiLocker me nahi aaya. 45 din ho gaye. File a grievance with the awarding SSC." },
  { id: 'centre-quality',  icon: AlertTriangle,tone: 'emerald', title: 'Centre quality issue',
    desc: 'Equipment broken, no materials, poor infrastructure',
    prompt: "Hamare training centre me practical equipment kharab hai, kitabein nahi mili, classroom me proper bench bhi nahi hai. Raise a quality grievance with details." },
  { id: 'attendance-fraud',icon: CalendarX,    tone: 'violet',  title: 'Attendance marked wrong',
    desc: "I came to class but I'm marked absent",
    prompt: "Mai class aaya tha lekin attendance me absent dikha raha hai. Maine selfie bhi li thi entry pe. Help me fix this and file if needed." },
]

const TONES = {
  sky:     { bg: 'bg-sky-100',     fg: 'text-sky-700' },
  fuchsia: { bg: 'bg-fuchsia-100', fg: 'text-fuchsia-700' },
  emerald: { bg: 'bg-emerald-100', fg: 'text-emerald-700' },
  amber:   { bg: 'bg-amber-100',   fg: 'text-amber-700' },
  violet:  { bg: 'bg-violet-100',  fg: 'text-violet-700' },
  rose:    { bg: 'bg-rose-100',    fg: 'text-rose-700' },
}

export default function GrievanceCanvas({ context }) {
  const threadId = context?.threadId || null
  const { meExtra } = useApp()
  const [pending, setPending] = useState(null)
  const [onCall, setOnCall] = useState(false)
  const t = meExtra?.trainee
  const ctxLine = t
    ? `${t.batch?.track?.name || 'Trainee'}${t.batch?.centre?.name ? ' · ' + t.batch.centre.name : ''}${t.district ? ' · ' + t.district : ''}`
    : 'Skilling-scheme trainee'

  const extraSystem = [
    'You are the KSK Grievance Officer for a skilling-scheme trainee.',
    'Job: (1) listen empathetically, (2) ask 2-3 questions to capture grievance details (when did it start, who was responsible, what evidence does the trainee have), (3) classify the grievance (stipend, placement-fake, certification, trainer-absent, centre-quality, attendance, harassment), (4) propose the right next step (often: file a formal ticket).',
    'If the trainee wants to file, emit a `ticket` KSKCARD with a draft subject, classification, and timeline. The ticket appears in the conversation with action chips.',
    'Tone: warm, factual, non-judgmental. Never blame the trainee. Always confirm next-step in writing.',
    t ? `Trainee context: ${ctxLine}.` : '',
  ].filter(Boolean).join('\n')

  const suggestions = QUICK_GRIEVANCES.slice(0, 3).map(a => a.prompt)

  return (
    <div className="flex flex-col h-full">
      {!onCall && (
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-rose-50/70 to-white flex-shrink-0">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-rose-700">Grievance Officer</div>
        <h2 className="text-[20px] font-bold text-txt-primary leading-tight mt-1">Hi {t?.name?.split(' ')[0] || 'there'} — what's wrong?</h2>
        <p className="text-[12px] text-txt-secondary mt-1 truncate">{ctxLine}</p>
      </div>
      )}

      {!onCall && (
      <div className="px-5 py-3 border-b border-bdr-light flex-shrink-0">
        <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">Common grievances</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {QUICK_GRIEVANCES.map(a => {
            const Icon = a.icon
            const tone = TONES[a.tone]
            return (
              <button key={a.id} onClick={() => setPending({ text: a.prompt, nonce: Date.now() })}
                className="text-left rounded-2xl border border-bdr-light bg-white hover:border-rose-400 hover:shadow-card transition p-3 flex items-start gap-3">
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
          <MessageSquare className="w-3 h-3" /> Tap a card to start, or type / call to raise a different grievance.
        </div>
      </div>
      )}

      <div className="flex-1 min-h-0">
        <AvatarCall
          persona="general"
          title="Grievance Officer"
          intro="File and track grievances with NSDC."
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
