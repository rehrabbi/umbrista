import { VideoLoop } from '../media/VideoLoop'
import { SceneHost } from '../scene/SceneHost'
import { OpeningTime } from '../time/OpeningTime'
import { PageHeading } from '../ui/PageHeading'
import './Landing.css'

export default function Landing() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-copy">
          <PageHeading>We open when the light goes.</PageHeading>
          <OpeningTime className="landing-lede" />
          <p className="landing-lede">A coffee bar in Calvessa, lit from dusk until three.</p>
        </div>
        {/* The empty group is the scene for now; later tasks draw the rain and the lamp glow here. */}
        <SceneHost
          className="landing-scene"
          still="street-dusk"
          label="A fogged hill street in Calvessa at dusk, tram rails running down it and one café window lit."
          priority
        >
          <group />
        </SceneHost>
      </section>

      {/* Temporary home for the loop, until the chapters of Task 9. */}
      <section className="landing-craft">
        <VideoLoop name="steam-loop" className="landing-loop" />
        <p className="landing-lede">Steam first, then the lamps, then you.</p>
      </section>
    </div>
  )
}
