import { lazy, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import { Picture } from '../media/Picture'
import { VideoLoop } from '../media/VideoLoop'
import { usePrefersReducedMotion } from '../media/usePrefersReducedMotion'
import { CupControls } from '../scene/cup/CupControls'
import { pushCupInput } from '../scene/cup/cupInput'
import { CHAPTERS, chapterIndex } from '../scene/journey/chapters'
import { journeyProgress, useJourneyProgress } from '../scene/journey/progress'
import { useScenesMayStart, whenScenesMayStart } from '../scene/gate'
import { SceneHost } from '../scene/SceneHost'
import { OpeningTime } from '../time/OpeningTime'
import { buttonClasses } from '../ui/Button'
import { PageHeading } from '../ui/PageHeading'
import { CupStage } from './landing/CupStage'
import { KineticTitle } from './landing/KineticTitle'
import './Landing.css'

// The street's scene imports three, so it loads with its canvas after first paint, never with the page.
const Journey = lazy(() => import('../scene/journey/Journey').then((module) => ({ default: module.Journey })))

const chapter = (id: string) => CHAPTERS[chapterIndex(id)]!
const CRAFT = chapter('craft')
const CUP = chapter('cup')
const DUSK = chapter('dusk')
const WINDOW = chapter('window')
const LAST_CUP = chapter('last-cup')

/** The street's scene inside its canvas. It alone re-renders as the visitor scrolls; the page does not. */
function LiveStreet({ still }: { still: boolean }) {
  const progress = useJourneyProgress()
  // A still page is the finished chapter: the lamps are on.
  return <Journey progress={still ? CHAPTERS.length : progress} />
}

/**
 * The journey's scroll choreography, while motion is allowed. GSAP loads with it on the visitor's
 * first intent (they are about to scroll), or once the loaded page has been quiet a while: never
 * while the first screen loads. Returns whether it failed to load: the page then shows its
 * chapters as stills, as it does under reduced motion.
 */
function useJourneyScroll(reduced: boolean, root: RefObject<HTMLElement | null>): boolean {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const page = root.current
    if (reduced || !page) return
    let cancelled = false
    let stop: (() => void) | undefined
    const cancelWait = whenScenesMayStart(() => {
      import('./landing/journeyScroll')
        .then(({ playJourney }) => {
          if (cancelled) return
          stop = playJourney({
            chapters: [...page.querySelectorAll<HTMLElement>('section[data-chapter]')],
            lamps: [...page.querySelectorAll<HTMLElement>('.dusk-scene')],
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
  }, [reduced, root])

  return failed
}

/**
 * Without the scroll choreography, each chapter is a still: the journey stands at the middle of the
 * chapter crossing the middle of the screen, so the cup shows that chapter's coffee.
 */
function useStillJourney(still: boolean, root: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const page = root.current
    if (!still || !page || typeof IntersectionObserver === 'undefined') return
    const sections = [...page.querySelectorAll<HTMLElement>('section[data-chapter]')]
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = sections.indexOf(entry.target as HTMLElement)
          if (index >= 0) journeyProgress.set(index + 0.5)
        }
      },
      // A thin line across the middle of the screen: the chapter on it is the one being read.
      { rootMargin: '-50% 0px -50% 0px' },
    )
    for (const section of sections) observer.observe(section)
    return () => {
      observer.disconnect()
      journeyProgress.set(0)
    }
  }, [still, root])
}

/**
 * A chapter after the first. It fades up as it arrives, with or without reduced motion (a fade is
 * not movement); without IntersectionObserver it is simply shown.
 */
function Chapter({
  id,
  className,
  motion,
  children,
}: {
  id: string
  className?: string
  motion?: 'scroll' | 'still'
  children: ReactNode
}) {
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
    <section
      ref={ref}
      data-chapter={id}
      data-motion={motion}
      data-fade={arrived ? 'in' : 'waiting'}
      className={['chapter', className].filter(Boolean).join(' ')}
    >
      {children}
    </section>
  )
}

/** A chapter's small number and name. */
function ChapterMark({ index, title }: { index: number; title: string }) {
  return (
    <p className="chapter-mark">
      <span className="chapter-number">{String(index + 1).padStart(2, '0')}</span> {title}
    </p>
  )
}

export function Landing() {
  const reduced = usePrefersReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const failed = useJourneyScroll(reduced, root)
  const still = reduced || failed
  useStillJourney(still, root)
  // Nothing beyond the poster is asked for until the visitor shows intent or the loaded page has
  // been quiet a while (gate.ts), so the hero's poster has the network to itself; after that each
  // picture still waits for its place on screen.
  const mayLoad = useScenesMayStart()

  return (
    <div ref={root} className="landing">
      {/*
       * The hero: the craft, full screen. The crema's close-up fills the viewport edge to edge (its
       * poster is the page's one priority image); the film swaps in over it, frame for frame, on the
       * visitor's first intent or once the loaded page has been quiet a while, and under reduced
       * motion stays the poster. The copy comes first in the document, so the heading is read
       * before any picture.
       */}
      <section data-chapter={CRAFT.id} className="chapter chapter-hero">
        <div className="chapter-copy hero-copy">
          <ChapterMark index={0} title={CRAFT.title} />
          <PageHeading className="landing-title">
            <span className="landing-name">Umbrista</span> <KineticTitle text={CRAFT.line} rise={!reduced} />
          </PageHeading>
          <p className="landing-lede">A coffee bar in Calvessa, lit from dusk until three.</p>
          <OpeningTime className="landing-hours" />
          <div className="landing-actions">
            <Link to="/reserve" className={buttonClasses('primary')}>
              Reserve a table
            </Link>
            <Link to="/menu" className={buttonClasses('secondary')}>
              See the menu
            </Link>
          </div>
        </div>
        <div className="chapter-media hero-media">
          <Picture name="steam-loop-poster" alt="Crema on a fresh espresso, close up, with steam rising from it." priority className="chapter-photo" />
          {!reduced && mayLoad && <VideoLoop name="steam-loop" poster={false} className="chapter-photo hero-film" />}
        </div>
      </section>

      {/* The cup's chapters: the cup stays on its stage while they scroll around it. */}
      <div className="journey">
        <CupStage still={still} />

        <Chapter id={CUP.id} className="chapter-cup">
          <div className="chapter-copy">
            <ChapterMark index={1} title={CUP.title} />
            <h2 className="chapter-line">{CUP.line}</h2>
            <p className="chapter-note">Tilt it, spin it, or set the coffee moving.</p>
            <CupControls onInput={pushCupInput} />
          </div>
        </Chapter>

        {/*
         * The street at dusk. With motion allowed the chapter is tall and its stage sticks to the
         * screen while the lamps come on; with reduced motion it is one still screen, lamps on.
         */}
        <Chapter id={DUSK.id} className="chapter-dusk" motion={still ? 'still' : 'scroll'}>
          <div className="dusk-stage">
            <SceneHost
              className="chapter-media dusk-scene"
              still="street-dusk"
              label="A fogged hill street in Calvessa at dusk, tram rails running down it and one café window lit."
              near="100% 0px"
              deferStill
            >
              <LiveStreet still={still} />
            </SceneHost>
            <div className="chapter-copy">
              <ChapterMark index={2} title={DUSK.title} />
              <h2 className="chapter-line">{DUSK.line}</h2>
            </div>
          </div>
        </Chapter>

        <Chapter id={WINDOW.id} className="chapter-window">
          <div className="chapter-media">
            {mayLoad && (
              <Picture
                name="rain-window"
                alt="Rain on the café window at night, a lamp over the table and the wet street outside."
                className="chapter-photo"
              />
            )}
          </div>
          <div className="chapter-copy">
            <ChapterMark index={3} title={WINDOW.title} />
            <h2 className="chapter-line">{WINDOW.line}</h2>
            <p className="chapter-note">Rain on the glass, a lamp overhead, and nobody asking you to leave.</p>
          </div>
        </Chapter>

        <Chapter id={LAST_CUP.id} className="chapter-last">
          <div className="chapter-copy">
            <ChapterMark index={4} title={LAST_CUP.title} />
            <h2 className="chapter-line">{LAST_CUP.line}</h2>
            <OpeningTime className="landing-hours" />
            <nav aria-label="Where next" className="landing-next">
              <Link to="/menu" className={buttonClasses('primary')}>
                The menu
              </Link>
              <Link to="/brew" className={buttonClasses('secondary')}>
                Brew your own
              </Link>
              <Link to="/reserve" className={buttonClasses('secondary')}>
                Reserve a table
              </Link>
              <Link to="/join" className={buttonClasses('secondary')}>
                Join the list
              </Link>
            </nav>
          </div>
        </Chapter>
      </div>
    </div>
  )
}
