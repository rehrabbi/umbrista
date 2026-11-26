import { OpeningTime } from '../time/OpeningTime'
import { PageHeading } from '../ui/PageHeading'

export function Landing() {
  return (
    <div className="page">
      <PageHeading>We open when the light goes.</PageHeading>
      <OpeningTime className="page-lede" />
      <p className="page-lede">A coffee bar in Calvessa, lit from dusk until three.</p>
    </div>
  )
}
