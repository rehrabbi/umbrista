import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { changeMatchMedia, setMatchMedia } from '../test/setup'
import { useSmoothScroll } from './useSmoothScroll'

const lenis = vi.hoisted(() => ({
  options: [] as unknown[],
  destroyed: 0,
  frames: 0,
}))

vi.mock('lenis', () => ({
  default: class FakeLenis {
    constructor(options: unknown) {
      lenis.options.push(options)
    }
    raf() {
      lenis.frames += 1
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
})
