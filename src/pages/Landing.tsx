import { lazy } from 'react'
import { VideoLoop } from '../media/VideoLoop'
import { SceneHost } from '../scene/SceneHost'
import { OpeningTime } from '../time/OpeningTime'
import { PageHeading } from '../ui/PageHeading'
import './Landing.css'

// The rain, lamp and grade import three, so they load with the canvas after first paint, never with the page.
const LivingBackground = lazy(() =>
  import('../scene/background/LivingBackground').then((module) => ({ default: module.LivingBackground })),
)

export function Landing() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-copy">
          <PageHeading>We open when the light goes.</PageHeading>
          <OpeningTime className="landing-lede" />
          <p className="landing-lede">A coffee bar in Calvessa, lit from dusk until three.</p>
        </div>
        <SceneHost
          className="landing-scene"
          still="street-dusk"
          label="A fogged hill street in Calvessa at dusk, tram rails running down it and one café window lit."
          priority
        >
          <LivingBackground backdrop="street-dusk" intensity={1} />
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
