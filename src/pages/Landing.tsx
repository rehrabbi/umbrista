import { lazy, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { VideoLoop } from '../media/VideoLoop'
import { usePrefersReducedMotion } from '../media/usePrefersReducedMotion'
import { CHAPTERS } from '../scene/journey/chapters'
import { journeyProgress, useJourneyProgress } from '../scene/journey/progress'
import { SceneHost } from '../scene/SceneHost'
import { OpeningTime } from '../time/OpeningTime'
import { PageHeading } from '../ui/PageHeading'
import { KineticTitle } from './landing/KineticTitle'
import './Landing.css'

// The journey's scene imports three, so it loads with the canvas after first paint, never with the page.
const Journey = lazy(() => import('../scene/journey/Journey').then((module) => ({ default: module.Journey })))

const OPENING_CHAPTER = CHAPTERS[0]!

/** The scene inside the canvas. It alone re-renders as the visitor scrolls; the page does not. */
function LiveJourney({ still }: { still: boolean }) {
  const progress = useJourneyProgress()
  // A still page is the finished chapter: the lamps are on.
  return <Journey progress={still ? 1 : progress} />
}

const INTENT = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'scroll'] as const

/**
 * Run `task` once the browser is idle after load, or as soon as the visitor shows they are about to
 * scroll, whichever comes first. Keeps the choreography's download off the first screen's network
 * and main thread. Returns a function that cancels it.
 */
function whenIdleOrIntent(task: () => void): () => void {
  let done = false
  const run = () => {
    if (done) return
    done = true
    cancel()
    task()
  }
  const options = { passive: true, once: true, capture: true }
  for (const type of INTENT) window.addEventListener(type, run, options)
  let idle: number | ReturnType<typeof setTimeout>
  if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(run, { timeout: 2500 })
  else idle = setTimeout(run, 200)
  function cancel() {
    for (const type of INTENT) window.removeEventListener(type, run, options)
    if (typeof cancelIdleCallback === 'function' && typeof idle === 'number') cancelIdleCallback(idle)
    else clearTimeout(idle)
  }
  return () => {
    done = true
    cancel()
  }
}

/**
 * Chapter 1's scroll choreography (pin, lamps, title), while motion is allowed. GSAP loads with
 * it, once the page is idle or the visitor starts to scroll. Returns whether the title should still wait for its cue: if the
 * choreography cannot load, the title is simply shown.
 */
function useOpeningScroll(
  reduced: boolean,
  section: RefObject<HTMLElement | null>,
  stage: RefObject<HTMLElement | null>,
): boolean {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const sectionElement = section.current
    const stageElement = stage.current
    if (reduced || !sectionElement || !stageElement) return
    let cancelled = false
    let stop: (() => void) | undefined
    const cancelWait = whenIdleOrIntent(() => {
      import('./landing/openingScroll')
        .then(({ playOpening }) => {
          if (cancelled) return
          stop = playOpening({
            section: sectionElement,
            lamps: [...stageElement.querySelectorAll<HTMLElement>('.landing-scene, .scroll-cue')],
            letters: [...sectionElement.querySelectorAll<HTMLElement>('[data-letter]')],
            onProgress: journeyProgress.set,
          })
        })
        .catch(() => {
          if (!cancelled) setFailed(true)
        })
    })
    return () => {
      cancelled = true
      cancelWait()
      stop?.()
      journeyProgress.set(0)
    }
  }, [reduced, section, stage])

  return !reduced && !failed
}

/**
 * A chapter below the first. It fades up as it arrives, with or without reduced motion (a fade is
 * not movement); without IntersectionObserver it is simply shown.
 */
function Chapter({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [arrived, setArrived] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setArrived(true)
        observer.disconnect()
      },
      { rootMargin: '0px 0px -15% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} data-chapter={id} data-fade={arrived ? 'in' : 'waiting'} className={['chapter', className].filter(Boolean).join(' ')}>
      {children}
    </section>
  )
}

export function Landing() {
  const reduced = usePrefersReducedMotion()
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const waiting = useOpeningScroll(reduced, section, stage)

  return (
    <div className="landing">
      {/*
       * Chapter 1. With motion allowed the section is tall and its stage sticks to the viewport
       * while the visitor scrolls through it: dusk, then the lamps, then the promise. With reduced
       * motion it is one still screen with the lamps on and the title whole.
       */}
      <section ref={section} data-chapter={OPENING_CHAPTER.id} data-motion={reduced ? 'still' : 'scroll'} className="chapter chapter-opening">
        <div ref={stage} className="landing-hero">
          <div className="landing-copy">
            <p className="chapter-mark">
              <span className="chapter-number">01</span> {OPENING_CHAPTER.title}
            </p>
            <PageHeading className="landing-title">
              <span className="landing-name">Umbrista</span> <KineticTitle text={OPENING_CHAPTER.line} waiting={waiting} />
            </PageHeading>
            <div className="landing-facts">
              <OpeningTime className="landing-lede" />
              <p className="landing-lede">A coffee bar in Calvessa, lit from dusk until three.</p>
            </div>
          </div>
          <SceneHost
            className="landing-scene"
            still={OPENING_CHAPTER.still}
            label="A fogged hill street in Calvessa at dusk, tram rails running down it and one café window lit."
            priority
          >
            <LiveJourney still={reduced} />
          </SceneHost>
          {!reduced && (
            <p className="scroll-cue" aria-hidden="true">
              Scroll
            </p>
          )}
        </div>
      </section>

      {/* Temporary home for the loop, until the chapters of Task 9. */}
      <Chapter id="craft" className="landing-craft">
        <VideoLoop name="steam-loop" className="landing-loop" />
        <p className="landing-lede">Steam first, then the lamps, then you.</p>
      </Chapter>
    </div>
  )
}
