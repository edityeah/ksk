import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'

export default function CareerCounsellorCanvas() {
  const { meExtra, user } = useApp()
  const t = meExtra?.trainee
  const traineeContext = t ? [
    `Education: ${t.education}.`,
    t.batch ? `Currently enrolled in ${t.batch.track?.name || t.batch.name} at ${t.batch.centre?.name || 'a training centre'} (${t.batch.scheme?.code || 'scheme TBD'}).` : '',
    t.district ? `Lives in ${t.district}, ${t.state}.` : '',
    t.category ? `Social category: ${t.category}.` : '',
  ].filter(Boolean).join(' ') : ''
  return (
    <AvatarCall
      persona="career-counsellor"
      title="Karuna · Career Counsellor"
      intro="AI-powered career guidance with real-time web search across NSDC schemes."
      useWebSearch
      extraSystem={traineeContext ? `Trainee profile:\n${traineeContext}` : ''}
    />
  )
}
