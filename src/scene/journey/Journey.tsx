import { LivingBackground } from '../background/LivingBackground'
import { CHAPTERS, chapterAt, lampAt } from './chapters'

export interface JourneyProps {
  /** How far through the journey, in chapters (see chapters.ts). */
  progress: number
}

/**
 * The scroll journey's scene, drawn inside a SceneHost. Chapter 1 is the street at dusk under the
 * living background, with the lamps coming on as it is scrolled through. Later chapters keep the
 * lamps on; the cup's chapters join here in Task 9.
 */
export function Journey({ progress }: JourneyProps) {
  const { index, local } = chapterAt(progress)
  const lamp = index === 0 ? lampAt(local) : 1
  return <LivingBackground backdrop={CHAPTERS[0]!.still} intensity={1} lamp={lamp} />
}
