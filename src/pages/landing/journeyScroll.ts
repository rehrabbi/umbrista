import { CHAPTERS, lampsAt } from '../../scene/journey/chapters'
import { ScrollTrigger } from '../../scroll/scrollTrigger'

/*
 * The landing's scroll journey, loaded after first paint with GSAP (never on the critical path).
 * One ScrollTrigger per chapter reads where the visitor is: a chapter's progress runs from its top
 * reaching the middle of the screen (0) to its bottom reaching it (1), so the journey progress is
 * the chapter's index plus that, and a chapter is halfway when it is centred. From it follow:
 *   - the scene: the cup's camera and coffee, and the street's lamps, through `onProgress`;
 *   - `--lamp` on the few elements that draw with the street's lamps when there is no canvas (the
 *     photograph underneath). Only on those: set higher up, the custom property would restyle
 *     everything inside, on every scroll frame.
 * The chapters' layout (the pins, the full-bleed media) is all CSS, so nothing moves or shifts when
 * this arrives.
 */

export interface JourneyParts {
  /** The chapter sections, in journey order (one per entry in CHAPTERS). */
  chapters: HTMLElement[]
  /** The elements whose styles read `--lamp`. */
  lamps: HTMLElement[]
  /** Called with the journey progress (0..CHAPTERS.length) whenever it changes. */
  onProgress: (progress: number) => void
}

/** Start following the scroll. Returns a function that removes every trigger and inline style. */
export function playJourney({ chapters, lamps, onProgress }: JourneyParts): () => void {
  let lamp = ''
  const triggers: ScrollTrigger[] = []

  const progress = (): number => {
    for (let index = 0; index < triggers.length; index++) {
      const trigger = triggers[index]!
      if (trigger.isActive) return index + trigger.progress
    }
    // Past the last chapter's middle, or (for a page restored part way) before the first's.
    return triggers.at(-1)!.progress >= 1 ? CHAPTERS.length : 0
  }

  const apply = () => {
    if (triggers.length < chapters.length) return
    const at = progress()
    const next = lampsAt(at).toFixed(4)
    if (next !== lamp) {
      lamp = next
      for (const element of lamps) element.style.setProperty('--lamp', lamp)
    }
    onProgress(at)
  }

  for (const chapter of chapters) {
    triggers.push(
      ScrollTrigger.create({
        trigger: chapter,
        start: 'top center',
        end: 'bottom center',
        onUpdate: apply,
        onRefresh: apply,
      }),
    )
  }
  // A page restored part way down starts where it is.
  apply()

  return () => {
    for (const trigger of triggers) trigger.kill()
    for (const element of lamps) element.style.removeProperty('--lamp')
  }
}
