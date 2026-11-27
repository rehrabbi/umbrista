import { act, render, screen, waitFor } from '@testing-library/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { journeyProgress } from '../scene/journey/progress'
import { useFakeIntersectionObserver } from '../test/intersection'
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

// The journey draws with WebGL; here it shows the progress it was given.
vi.mock('../scene/journey/Journey', () => ({
  Journey: ({ progress }: { progress: number }) => <div data-testid="journey" data-progress={progress} />,
}))

const REDUCED = '(prefers-reduced-motion: reduce)'
const PROMISE = 'We open when the light goes.'
// The canvas mounts after an idle delay, a frame probe and a lazy import; allow for a busy machine.
const SLOW = { timeout: 5000 }

useFakeIntersectionObserver()

afterEach(() => {
  journeyProgress.set(0)
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

describe('Landing', () => {
  it('has one h1, naming the café and its promise as text', () => {
    renderLanding()
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveAccessibleName(`Umbrista ${PROMISE}`)
    expect(headings[0]).toHaveTextContent(PROMISE)
  })

  it("puts the first chapter's text in the DOM before any canvas", async () => {
    const { container } = renderLanding()
    // First paint: the heading, the opening time and the line, and no canvas yet.
    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/café time/)).toBeInTheDocument()
    expect(screen.getByText('A coffee bar in Calvessa, lit from dusk until three.')).toBeInTheDocument()

    // The canvas comes later, and after the text in document order.
    await screen.findByTestId('r3f', {}, SLOW)
    const canvas = container.querySelector('canvas')!
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('pins chapter 1 and scrubs it with one ScrollTrigger when motion is allowed', async () => {
    const { container } = renderLanding()
    const opening = container.querySelector('section[data-chapter="dusk"]')!
    expect(opening).toHaveAttribute('data-motion', 'scroll')
    // The title waits below its baseline for its cue.
    expect(container.querySelector('[data-kinetic]')).toHaveAttribute('data-state', 'waiting')
    await waitFor(() => expect(ScrollTrigger.getAll()).toHaveLength(1), SLOW)
    // The lamps start off: the journey begins at dusk.
    expect((await screen.findByTestId('journey', {}, SLOW)).dataset.progress).toBe('0')
  })

  it('removes its ScrollTrigger on unmount', async () => {
    const { unmount } = renderLanding()
    await waitFor(() => expect(ScrollTrigger.getAll()).toHaveLength(1), SLOW)
    unmount()
    expect(ScrollTrigger.getAll()).toHaveLength(0)
  })

  it('under reduced motion, shows still chapters with fades, the title whole and the lamps on, and creates no ScrollTrigger', async () => {
    setMatchMedia(REDUCED, true)
    const { container } = renderLanding()
    await settle()

    expect(ScrollTrigger.getAll()).toHaveLength(0)
    const chapters = [...container.querySelectorAll('section[data-chapter]')]
    expect(chapters.length).toBeGreaterThanOrEqual(2)
    expect(chapters[0]).toHaveAttribute('data-motion', 'still')
    // Chapters below the first fade in as they arrive; the first is simply there.
    expect(chapters[0]).not.toHaveAttribute('data-fade')
    for (const chapter of chapters.slice(1)) expect(chapter).toHaveAttribute('data-fade')
    expect(container.querySelector('[data-kinetic]')).toHaveAttribute('data-state', 'shown')
    expect((await screen.findByTestId('journey', {}, SLOW)).dataset.progress).toBe('1')
    expect(ScrollTrigger.getAll()).toHaveLength(0)
  })
})
