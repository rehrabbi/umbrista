import { act, render, screen, waitFor } from '@testing-library/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSceneGate } from '../scene/gate'
import { CHAPTERS, chapterIndex } from '../scene/journey/chapters'
import { journeyProgress } from '../scene/journey/progress'
import { setIntersecting, useFakeIntersectionObserver } from '../test/intersection'
import { setMatchMedia } from '../test/setup'
import { Landing } from './Landing'

// R3F's Canvas cannot run in jsdom: this stand-in draws a plain canvas and passes its children through.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: ReactNode }) => (
    <div data-testid="r3f">
      <canvas />
      {children}
    </div>
  ),
}))

// The street draws with WebGL; here it shows the progress it was given.
vi.mock('../scene/journey/Journey', () => ({
  Journey: ({ progress }: { progress: number }) => <div data-testid="journey" data-progress={progress} />,
}))

// So does the cup; here it says whether it was asked for still chapters.
vi.mock('../scene/cup/HeroCup', () => ({
  default: ({ still }: { still?: boolean }) => <div data-testid="hero-cup" data-still={String(Boolean(still))} />,
}))

const REDUCED = '(prefers-reduced-motion: reduce)'
const PROMISE = 'We open when the light goes.'
// The canvas mounts after intent, an idle delay, a frame probe and a lazy import; allow for a busy machine.
const SLOW = { timeout: 5000 }

useFakeIntersectionObserver()

beforeEach(() => {
  resetSceneGate()
})

afterEach(() => {
  journeyProgress.set(0)
  resetSceneGate()
})

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  )
}

async function settle(ms = 300) {
  await act(() => new Promise((resolve) => setTimeout(resolve, ms)))
}

/** The visitor moves the pointer, and every scene is near the screen: the 3D scenes may start. */
function intent(container: HTMLElement = document.body) {
  act(() => {
    window.dispatchEvent(new Event('pointermove'))
    for (const host of container.querySelectorAll('[data-scene-host]')) setIntersecting(host, true)
  })
}

describe('Landing', () => {
  it('has one h1, naming the café and its promise as text', () => {
    renderLanding()
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveAccessibleName(`Umbrista ${PROMISE}`)
    expect(headings[0]).toHaveTextContent(PROMISE)
  })

  it('tells the chapters in the owner’s order: the craft, the cup, the street, the window, the last cup', () => {
    const { container } = renderLanding()
    const chapters = [...container.querySelectorAll<HTMLElement>('section[data-chapter]')].map((section) => section.dataset.chapter)
    expect(chapters).toEqual(CHAPTERS.map((chapter) => chapter.id))
    expect(chapters).toEqual(['craft', 'cup', 'dusk', 'window', 'last-cup'])
  })

  it('opens on the craft film: its poster is the one priority image, edge to edge', () => {
    const { container } = renderLanding()
    const priority = container.querySelectorAll('img[fetchpriority="high"]')
    expect(priority).toHaveLength(1)
    expect(priority[0]!.getAttribute('src')).toContain('/media/steam-loop-poster-')
    expect(priority[0]).toHaveAttribute('loading', 'eager')
    expect(priority[0]!.closest('section')).toHaveAttribute('data-chapter', 'craft')
    // Every later chapter's media loads lazily, near the screen.
    for (const image of container.querySelectorAll('img:not([fetchpriority="high"])')) {
      expect(image).toHaveAttribute('loading', 'lazy')
    }
  })

  it('puts the hero copy in the DOM first, with the opening time, the line and the actions', () => {
    renderLanding()
    expect(screen.getAllByText(/café time/).length).toBeGreaterThan(0)
    expect(screen.getByText('A coffee bar in Calvessa, lit from dusk until three.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Reserve a table' })[0]).toHaveAttribute('href', '/reserve')
    expect(screen.getByRole('link', { name: 'See the menu' })).toHaveAttribute('href', '/menu')
  })

  it('ends with the way on: the menu, brewing, a table and the list', () => {
    renderLanding()
    const next = screen.getByRole('navigation', { name: 'Where next' })
    const links = [...next.querySelectorAll('a')].map((link) => link.getAttribute('href'))
    expect(links).toEqual(['/menu', '/brew', '/reserve', '/join'])
  })

  it('has buttons to play with the cup', () => {
    renderLanding()
    const controls = screen.getByRole('group', { name: 'Play with the cup' })
    expect(controls.closest('section')).toHaveAttribute('data-chapter', 'cup')
    for (const name of ['Tilt left', 'Tilt right', 'Spin', 'Splash']) expect(screen.getByRole('button', { name })).toBeInTheDocument()
  })

  it('creates no canvas until the visitor shows intent, and none before the hero text', async () => {
    const { container } = renderLanding()
    await settle(900)
    expect(container.querySelector('canvas')).toBeNull()
    intent(container)
    await waitFor(() => expect(screen.getAllByTestId('r3f').length).toBeGreaterThan(0), SLOW)
    const canvas = container.querySelector('canvas')!
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  }, 15_000)

  it('raises the title letter by letter when motion is allowed', () => {
    const { container } = renderLanding()
    expect(container.querySelector('[data-kinetic]')).toHaveAttribute('data-state', 'rising')
  })

  it('follows the journey with one ScrollTrigger per chapter, and pins the street', async () => {
    const { container } = renderLanding()
    // Nothing loads the choreography before the visitor shows intent.
    await settle(300)
    expect(ScrollTrigger.getAll()).toHaveLength(0)
    intent(container)
    expect(container.querySelector('section[data-chapter="dusk"]')).toHaveAttribute('data-motion', 'scroll')
    await waitFor(() => expect(ScrollTrigger.getAll()).toHaveLength(CHAPTERS.length), SLOW)
  }, 15_000)

  it('removes its ScrollTriggers on unmount', async () => {
    const { container, unmount } = renderLanding()
    intent(container)
    await waitFor(() => expect(ScrollTrigger.getAll()).toHaveLength(CHAPTERS.length), SLOW)
    unmount()
    expect(ScrollTrigger.getAll()).toHaveLength(0)
  }, 15_000)

  it('under reduced motion, shows still chapters with fades, the title whole and the lamps on, and creates no ScrollTrigger', async () => {
    setMatchMedia(REDUCED, true)
    const { container } = renderLanding()
    await settle()

    expect(ScrollTrigger.getAll()).toHaveLength(0)
    const chapters = [...container.querySelectorAll('section[data-chapter]')]
    expect(chapters[0]).not.toHaveAttribute('data-fade')
    for (const chapter of chapters.slice(1)) expect(chapter).toHaveAttribute('data-fade')
    expect(container.querySelector('section[data-chapter="dusk"]')).toHaveAttribute('data-motion', 'still')
    expect(container.querySelector('[data-kinetic]')).toHaveAttribute('data-state', 'shown')
    // The film stays its poster.
    expect(container.querySelector('video')).toBeNull()
    intent(container)
    expect((await screen.findByTestId('journey', {}, SLOW)).dataset.progress).toBe(String(CHAPTERS.length))
    expect(ScrollTrigger.getAll()).toHaveLength(0)
  }, 15_000)

  it('under reduced motion, gives the cup each chapter’s own state as a still, with no scrubbing', async () => {
    setMatchMedia(REDUCED, true)
    const { container } = renderLanding()
    intent(container)
    for (const id of ['cup', 'dusk', 'window', 'last-cup']) {
      act(() => setIntersecting(container.querySelector(`section[data-chapter="${id}"]`)!, true))
      expect(journeyProgress.get()).toBe(chapterIndex(id) + 0.5)
    }
    expect((await screen.findByTestId('hero-cup', {}, SLOW)).dataset.still).toBe('true')
  }, 15_000)
})
