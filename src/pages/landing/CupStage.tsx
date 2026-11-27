import { lazy } from 'react'
import { CupDragSurface } from '../../scene/cup/CupControls'
import { pushCupInput } from '../../scene/cup/cupInput'
import { SceneHost } from '../../scene/SceneHost'
import './CupStage.css'

// The cup's scene imports three, drei and the model's decoder: it loads with its canvas, never with the page.
const HeroCup = lazy(() => import('../../scene/cup/HeroCup'))

export interface CupStageProps {
  /** Chapters as stills (reduced motion, or the scroll choreography could not load). */
  still: boolean
}

/**
 * The hero cup's stage. It is sticky for the length of the cup's chapters, so the cup stays where
 * it is while the chapters scroll past and around it: on the right on a wide screen, above the
 * copy on a phone. Until the canvas has drawn, and for good without WebGL, the cup is its still,
 * rendered from the same model in the same pose; the live cup then fades in over it, exactly
 * aligned, and the still steps aside. Nothing loads until the stage is within a screen of view.
 */
export function CupStage({ still }: CupStageProps) {
  return (
    <div className="cup-stage">
      <SceneHost
        className="cup-scene"
        still="cup-still"
        label="The Umbrista cup and saucer under a lamp, an espresso with its crema."
        sizes="(min-width: 60rem) 50vw, 100vw"
        near="100% 0px"
        deferStill
        swap
        antialias
      >
        <HeroCup still={still} />
      </SceneHost>
      <CupDragSurface onInput={pushCupInput} className="cup-scene-drag" />
    </div>
  )
}
