// Swifty Assistant — the cross-cutting Talk-to-Swifty canvas opened from
// the home page "Talk to Swifty Assistant" button. Acts as an orchestrator:
// the user asks something general, Swifty answers + can suggest opening a
// specific module canvas (Career Counsellor, Discover Courses, etc.).

import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { ROLE_LABELS } from '../../roles/roleConfig.js'

const SUGGESTIONS_BY_ROLE = {
  trainee: [
    'Recommend a skilling course for me',
    'What jobs are open near my district right now?',
    'Help me prepare for a retail interview',
    'Check my stipend status',
    'Has my placement been verified?',
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

export default function SwiftyAssistantCanvas() {
  const { user, role, meExtra } = useApp()
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
    <AvatarCall
      persona="general"
      title="Swifty · KSK Assistant"
      intro={`Hi ${user?.name?.split(' ')[0] || 'there'} — I can answer questions about KSK, open any module, or help you take action.`}
      useWebSearch
      extraSystem={ctx + '\n\nYou are Swifty, the general KSK assistant. Help the user navigate the platform — if they ask about courses, jobs, career advice, interview prep, or learning, suggest opening the relevant module by name (Discover Courses, Find Jobs, Career Counsellor, Mock Interview, Learning Assistant). For policy/scheme questions, answer directly (using web search if needed).'}
      suggestions={suggestions}
    />
  )
}
