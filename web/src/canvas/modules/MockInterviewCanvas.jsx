import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'

export default function MockInterviewCanvas({ context }) {
  const { meExtra } = useApp()
  const t = meExtra?.trainee
  const ctx = t ? `Candidate is in ${t.batch?.track?.name || 'a skilling course'}. Interview for entry-level NSQF L3-5 roles.` : 'Entry-level NSQF L3-5 candidate.'
  return (
    <AvatarCall
      persona="mock-interviewer"
      title="Sharma ji · Mock Interview"
      intro="Realistic mock interview + scored feedback. Choose video for the full experience."
      useWebSearch={false}
      extraSystem={ctx}
      threadId={context?.threadId || null}
    />
  )
}
