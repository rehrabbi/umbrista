import { OPENING, lampAt } from '../../scene/journey/chapters'
import { parseDurationMs } from '../../scene/background/uniforms'
import { gsap, ScrollTrigger } from '../../scroll/scrollTrigger'
import { parseCubicBezier } from './ease'
import { SINK_SPEED, STAGGER } from './titleTiming'

/*
 * Chapter 1's choreography, loaded after first paint with GSAP (never on the critical path).
 * One ScrollTrigger follows the visitor through the pinned chapter:
 *   - the lamps follow the scroll exactly: the scene's `uLamp` through the journey progress, and
 *     `--lamp` on the few elements that draw with it (the photograph underneath, the scroll cue).
 *     Only on those: set on the stage, the custom property would restyle everything inside it,
 *     the title's letters included, on every scroll frame;
 *   - the title is a cue, not a scrub: past `OPENING.titleAt` its letters rise one by one in their
 *     own time, on the settle curve, and sink back (faster) if the visitor scrolls above it.
 */

/** The title only sinks once the visitor is this far back above its cue, so it never flickers. */
const HYSTERESIS = 0.06

export interface OpeningParts {
  /** The tall chapter section; its scroll is the chapter's. */
  section: HTMLElement
  /** The elements whose styles read `--lamp`. */
  lamps: HTMLElement[]
  /** The title's letters, in reading order. */
  letters: HTMLElement[]
  /** Called with the chapter's progress, 0..1, on every scroll frame. */
  onProgress: (progress: number) => void
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name)
}

/** Start the choreography. Returns a function that removes the trigger and every inline style. */
export function playOpening({ section, lamps, letters, onProgress }: OpeningParts): () => void {
  const settle = parseCubicBezier(token('--ease-settle')) ?? 'power3.out'
  const rise = parseDurationMs(token('--dur-chapter'), 600) / 1000

  // The CSS holds the waiting letters at translateY(105%), which GSAP would read as a pixel `y`;
  // `y: 0` sets that aside so the rise is all `yPercent`, and the letters land exactly on the line.
  const title = gsap.timeline({ paused: true }).fromTo(
    letters,
    { y: 0, yPercent: 105, opacity: 0 },
    { y: 0, yPercent: 0, opacity: 1, duration: rise, ease: settle, stagger: STAGGER },
  )

  let shown = false
  let lamp = ''
  const apply = (progress: number) => {
    const next = lampAt(progress).toFixed(4)
    if (next !== lamp) {
      lamp = next
      for (const element of lamps) element.style.setProperty('--lamp', lamp)
    }
    onProgress(progress)
    if (!shown && progress >= OPENING.titleAt) {
      shown = true
      title.timeScale(1).play()
    } else if (shown && progress < OPENING.titleAt - HYSTERESIS) {
      shown = false
      title.timeScale(SINK_SPEED).reverse()
    }
  }

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => apply(self.progress),
    onRefresh: (self) => apply(self.progress),
  })
  // A page restored part way down starts where it is, with the title already up if it is past its cue.
  apply(trigger.progress)
  if (shown) title.progress(1)

  return () => {
    trigger.kill()
    title.kill()
    gsap.set(letters, { clearProps: 'transform,opacity' })
    for (const element of lamps) element.style.removeProperty('--lamp')
  }
}
