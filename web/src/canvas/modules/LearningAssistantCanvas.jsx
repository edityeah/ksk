import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'

export default function LearningAssistantCanvas() {
  const { meExtra } = useApp()
  const t = meExtra?.trainee
  const ctx = t?.batch?.track ? `Learner is taking '${t.batch.track.name}' (duration ${t.batch.track.durationDays} days, scheme ${t.batch.scheme?.code}). Job role: ${t.batch.track.jobRoles?.[0]?.jobRole?.name || 'TBD'}.` : ''
  return (
    <AvatarCall
      persona="learning-assistant"
      title="Guru ji · Learning Assistant"
      intro="AI tutor for your course. Ask doubts, request explanations, or take a quiz."
      useWebSearch
      extraSystem={ctx}
    />
  )
}
