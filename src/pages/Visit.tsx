import { OpeningTime } from '../time/OpeningTime'
import { PageHeading } from '../ui/PageHeading'

export default function Visit() {
  return (
    <div className="page">
      <PageHeading>Visit</PageHeading>
      <OpeningTime className="page-lede" />
      <p className="page-lede">The way to Rua das Lanternas is being drawn. It is coming.</p>
    </div>
  )
}
