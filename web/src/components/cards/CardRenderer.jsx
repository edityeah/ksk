// CardRenderer — switches on `card.type` and renders the matching component.
// The LLM emits cards via <<<KSKCARD>>>{...}<<<END>>> fences which the server
// parses into structured objects and ships as SSE events. Cards always sit
// beneath the assistant's text bubble and may carry a chips array that fires
// follow-up prompts when tapped.

import CourseListCard      from './CourseListCard.jsx'
import CourseDetailCard    from './CourseDetailCard.jsx'
import EligibilityCard     from './EligibilityCard.jsx'
import AttendanceCard      from './AttendanceCard.jsx'
import ProgressCard        from './ProgressCard.jsx'
import ScheduleCard        from './ScheduleCard.jsx'
import ScoreCard           from './ScoreCard.jsx'
import ResourcesCard       from './ResourcesCard.jsx'
import StipendStatusCard   from './StipendStatusCard.jsx'
import JobsCard            from './JobsCard.jsx'
import PlacementDrivesCard from './PlacementDrivesCard.jsx'
import InfoCard            from './InfoCard.jsx'
import TicketCard          from './TicketCard.jsx'
import CareerPathsCard     from './CareerPathsCard.jsx'
import SkillGapCard        from './SkillGapCard.jsx'
import Chips               from './Chips.jsx'

const REGISTRY = {
  course_list:      CourseListCard,
  course_detail:    CourseDetailCard,
  eligibility:      EligibilityCard,
  attendance:       AttendanceCard,
  progress:         ProgressCard,
  schedule:         ScheduleCard,
  score:            ScoreCard,
  resources:        ResourcesCard,
  stipend_status:   StipendStatusCard,
  jobs:             JobsCard,
  placement_drives: PlacementDrivesCard,
  info:             InfoCard,
  ticket:           TicketCard,
  career_paths:     CareerPathsCard,
  skill_gap:        SkillGapCard,
}

export default function CardRenderer({ card, onChip }) {
  if (!card || !card.type) return null
  const Component = REGISTRY[card.type] || InfoCard
  return (
    <div className="my-2 ml-2 max-w-[680px]">
      <Component card={card} onChip={onChip} />
      {Array.isArray(card.chips) && card.chips.length > 0 && (
        <Chips chips={card.chips} onChip={onChip} />
      )}
    </div>
  )
}
