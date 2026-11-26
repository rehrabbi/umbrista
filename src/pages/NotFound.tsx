import { Link } from 'react-router'
import { buttonClasses } from '../ui/Button'
import { PageHeading } from '../ui/PageHeading'

export default function NotFound() {
  return (
    <div className="page">
      <PageHeading>Nothing down here but the dark.</PageHeading>
      <p className="page-lede">Wrong turn after midnight. It happens. The lamps are back this way.</p>
      <p>
        <Link to="/" className={buttonClasses('primary')}>
          Back to the bar
        </Link>
      </p>
    </div>
  )
}
