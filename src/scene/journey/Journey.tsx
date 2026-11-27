import { LivingBackground } from '../background/LivingBackground'
import { lampsAt } from './chapters'

export interface JourneyProps {
  /** How far through the journey, in chapters (see chapters.ts). */
  progress: number
}

/**
 * The street chapter's scene, drawn inside its SceneHost: the street at dusk under the living
 * background, its lamps off until the visitor reaches the chapter, coming on as they scroll through
 * it, and on from then on.
 */
export function Journey({ progress }: JourneyProps) {
  return <LivingBackground backdrop="street-dusk" intensity={1} lamp={lampsAt(progress)} />
}
