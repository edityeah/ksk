// Swifty Assistant — the cross-cutting Talk-to-Swifty canvas opened from
// the home page "Talk to Swifty Assistant" button. Acts as an orchestrator:
// the user asks something general, Swifty answers + can suggest opening a
// specific module canvas (Career Counsellor, Discover Courses, etc.).

import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { ROLE_LABELS } from '../../roles/roleConfig.js'

const SUGGESTIONS_BY_ROLE = {
  // Learner / Participant prompts — phrased the way real trainees ask them
  // (mirrors the Casual English column of the Sample Queries sheet).
  trainee: [
    'What courses can I do at my nearest centre?',
    'How much is my attendance?',
    "What's my schedule today?",
    'When will my stipend come?',
    'Any jobs for my course?',
    "I want to leave this course",
    'Download my admit card',
    'Where do I get my certificate?',
  ],
  trainer: [
    'Today\'s lesson plan for my batch',
    'Which of my trainees are at risk?',
    'Mark attendance for today',
  ],
  training_centre: [
    'Show my centre dashboard',
    'Which batches are running below capacity?',
    'Declare a new placement',
  ],
  training_partner: [
    'Multi-centre rollup for this month',
    'Outcome trends across my centres',
    'Design a new training track',
  ],
  nsdc_officer: [
    'India placement-verification heatmap',
    'Compare PMKVY vs DDU-GKY outcomes this quarter',
    'War room — current anomalies',
  ],
  funder: [
    'Verified outcomes across all schemes',
    'Money disbursed vs verified outcomes',
  ],
  employer: [
    'Pending placement confirmations',
    'Day-90 retention check-ins due',
  ],
  assessor: [
    'My assessment queue today',
    'Start a live assessment',
  ],
  ssc: [
    'Pending accreditation applications',
    'Sector outcomes for retail',
  ],
  stipend_officer: [
    'Failed disbursals this week',
    'Retry Aadhaar-bank failures',
  ],
  general: [
    'What can KSK do for me?',
    'How does maker-checker verification work?',
  ],
}

export default function SwiftyAssistantCanvas({ context }) {
  const { user, role, meExtra } = useApp()
  const threadId = context?.threadId || null
  const roleLabel = ROLE_LABELS[role] || 'KSK user'
  const t = meExtra?.trainee
  const ctx = [
    `User: ${user?.name}`,
    `Role: ${roleLabel}`,
    t?.batch ? `Currently in ${t.batch.track?.name} at ${t.batch.centre?.name}` : '',
    t?.district ? `Location: ${t.district}, ${t.state}` : '',
  ].filter(Boolean).join('. ')

  const suggestions = SUGGESTIONS_BY_ROLE[role] || SUGGESTIONS_BY_ROLE.general

  return (
    <div className="h-full">
      <AvatarCall
        persona="general"
        title="Saathi · Your skilling companion"
        intro={`Hi ${user?.name?.split(' ')[0] || 'there'} — I can answer questions about KSK, open any module, or help you take action.`}
        useWebSearch
        extraSystem={ctx + '\n\nYou are Saathi, the unified KSK companion who walks the learner through enrollment, training, certification and placement. Be warm and practical. If the user asks about courses, jobs, career advice, interview prep, attendance, stipends, certificates or learning, either answer with a card or suggest opening the relevant KSK module by name (Discover Courses, Find Jobs, Career Counsellor, Mock Interview, Learning Assistant, Skill Passport, My Stipend). For policy/scheme questions, answer directly (use web search if needed).'}
        suggestions={suggestions}
        threadId={threadId}
      />
    </div>
  )
}
