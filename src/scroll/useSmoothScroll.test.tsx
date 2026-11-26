import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { changeMatchMedia, setMatchMedia } from '../test/setup'
import { animationFrames, driveWith, onSmoothScroll, useSmoothScroll, type FrameDriver } from './useSmoothScroll'

const lenis = vi.hoisted(() => ({
  options: [] as unknown[],
  destroyed: 0,
  frames: 0,
  scrollHandlers: [] as (() => void)[],
}))

vi.mock('lenis', () => ({
  default: class FakeLenis {
    constructor(options: unknown) {
      lenis.options.push(options)
    }
    raf() {
      lenis.frames += 1
    }
    on(event: string, handler: () => void) {
      if (event === 'scroll') lenis.scrollHandlers.push(handler)
      return () => {
        lenis.scrollHandlers = lenis.scrollHandlers.filter((h) => h !== handler)
      }
    }
    destroy() {
      lenis.destroyed += 1
    }
  },
}))

const REDUCED = '(prefers-reduced-motion: reduce)'

function Probe({ onValue }: { onValue?: (value: unknown) => void }) {
  const instance = useSmoothScroll()
  onValue?.(instance)
  return (
    <div>
      <a href="#target">Jump</a>
      <div id="target" tabIndex={-1}>
        Target
      </div>
    </div>
  )
}

beforeEach(() => {
  lenis.options.length = 0
  lenis.destroyed = 0
  lenis.frames = 0
  lenis.scrollHandlers = []
})

afterEach(() => {
  driveWith(animationFrames)
})

describe('useSmoothScroll', () => {
  it('constructs one Lenis when motion is allowed, and returns it', async () => {
    let value: unknown = null
    render(<Probe onValue={(v) => (value = v)} />)
    expect(lenis.options).toHaveLength(1)
    expect(value).not.toBeNull()
  })

  it('runs the frame loop', async () => {
    render(<Probe />)
    await vi.waitFor(() => expect(lenis.frames).toBeGreaterThan(0))
  })

  it('destroys the instance on unmount', () => {
    const { unmount } = render(<Probe />)
    unmount()
    expect(lenis.destroyed).toBe(1)
  })

  it('never keeps more than one live instance under StrictMode', () => {
    const { unmount } = render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    )
    unmount()
    expect(lenis.options.length).toBe(lenis.destroyed)
  })

  it('returns null and never constructs Lenis under reduced motion', () => {
    setMatchMedia(REDUCED, true)
    let value: unknown = 'unset'
    render(<Probe onValue={(v) => (value = v)} />)
    expect(value).toBeNull()
    expect(lenis.options).toHaveLength(0)
  })

  it('destroys Lenis when reduced motion is turned on during the visit, and builds it again when it is turned off', () => {
    let value: unknown = null
    render(<Probe onValue={(v) => (value = v)} />)
    expect(lenis.options).toHaveLength(1)

    act(() => changeMatchMedia(REDUCED, true))
    expect(lenis.destroyed).toBe(1)
    expect(value).toBeNull()

    act(() => changeMatchMedia(REDUCED, false))
    expect(lenis.options).toHaveLength(2)
    expect(value).not.toBeNull()
  })

  it('removes its media listener on unmount', () => {
    const { unmount } = render(<Probe />)
    unmount()
    act(() => changeMatchMedia(REDUCED, false))
    expect(lenis.options).toHaveLength(1)
  })

  it.each([
    ['with smooth scroll', false],
    ['under reduced motion', true],
  ])('leaves anchor links to reach their target %s', async (_name, reduced) => {
    setMatchMedia(REDUCED, reduced)
    render(<Probe />)
    let prevented: boolean | null = null
    document.addEventListener('click', (event) => (prevented = event.defaultPrevented))
    await userEvent.click(screen.getByRole('link', { name: 'Jump' }))
    // The browser's own jump to the target still happens; Lenis only animates it when allowed.
    expect(prevented).toBe(false)
    expect(window.location.hash).toBe('#target')
    expect(document.getElementById('target')).toBeInTheDocument()
    if (!reduced) expect(lenis.options[0]).toMatchObject({ anchors: true })
  })

  it('hands its frame loop to another driver, so only one loop ever runs', async () => {
    render(<Probe />)
    await vi.waitFor(() => expect(lenis.frames).toBeGreaterThan(0))

    const steps: ((time: number) => void)[] = []
    const driver: FrameDriver = (step) => {
      steps.push(step)
      return () => {}
    }
    driveWith(driver)
    expect(steps).toHaveLength(1)

    // The browser's own loop has stopped: no frames arrive unless the new driver steps.
    const before = lenis.frames
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(lenis.frames).toBe(before)
    steps[0]!(1000)
    expect(lenis.frames).toBe(before + 1)
  })

  it('uses the chosen driver for a Lenis built later, and stops it on unmount', () => {
    let started = 0
    let stopped = 0
    driveWith(() => {
      started += 1
      return () => {
        stopped += 1
      }
    })
    const { unmount } = render(<Probe />)
    expect(started).toBe(1)
    unmount()
    expect(stopped).toBe(1)
  })

  it('tells scroll listeners every time Lenis scrolls, until they unsubscribe', () => {
    const listener = vi.fn()
    const off = onSmoothScroll(listener)
    render(<Probe />)
    for (const handler of lenis.scrollHandlers) handler()
    expect(listener).toHaveBeenCalledTimes(1)
    off()
    for (const handler of lenis.scrollHandlers) handler()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
