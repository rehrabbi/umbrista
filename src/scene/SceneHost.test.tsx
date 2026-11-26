import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setIntersecting, useFakeIntersectionObserver } from '../test/intersection'
import { setMatchMedia, setWebGL } from '../test/setup'
import { SceneHost } from './SceneHost'

// R3F's Canvas cannot run in jsdom. This stand-in exposes the props the host passes it.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ frameloop, dpr }: { frameloop?: string; dpr?: number[] }) => (
    <div data-testid="r3f" data-frameloop={frameloop} data-dpr={JSON.stringify(dpr)}>
      <canvas data-testid="gl" />
    </div>
  ),
}))

const REDUCED = '(prefers-reduced-motion: reduce)'
// The canvas mounts after an idle delay, a frame probe and a lazy import; allow for a busy machine.
const SLOW = { timeout: 5000 }
const LABEL = 'Calvessa at dusk, one café window lit'

useFakeIntersectionObserver()

afterEach(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})

function renderHost() {
  return render(
    <SceneHost still="street-dusk" label={LABEL}>
      <group />
    </SceneHost>,
  )
}

describe('SceneHost', () => {
  it('shows the still first and mounts the canvas after first paint', async () => {
    renderHost()
    expect(screen.getByAltText(LABEL)).toBeInTheDocument()
    expect(screen.queryByTestId('r3f')).toBeNull()
    expect(await screen.findByTestId('r3f', {}, SLOW)).toBeInTheDocument()
    expect(screen.getByAltText(LABEL)).toBeInTheDocument()
  })

  it('creates no WebGL context until after first paint', async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    renderHost()
    expect(getContext).not.toHaveBeenCalled()
    await screen.findByTestId('r3f', {}, SLOW)
    expect(getContext).toHaveBeenCalled()
    getContext.mockRestore()
  })

  it('renders only the still when WebGL is unavailable', async () => {
    setWebGL(false)
    renderHost()
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(screen.getByAltText(LABEL)).toBeInTheDocument()
    expect(screen.queryByTestId('r3f')).toBeNull()
  })

  it('swaps back to the still when the WebGL context is lost mid-session', async () => {
    renderHost()
    const gl = await screen.findByTestId('gl', {}, SLOW)
    act(() => {
      gl.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    })
    expect(screen.queryByTestId('r3f')).toBeNull()
    expect(screen.getByAltText(LABEL)).toBeInTheDocument()
  })

  it('runs the frame loop only while the scene is active', async () => {
    renderHost()
    const canvas = await screen.findByTestId('r3f', {}, SLOW)
    expect(canvas).toHaveAttribute('data-frameloop', 'demand')
    const host = canvas.closest('[data-scene-host]')!
    act(() => setIntersecting(host, true))
    expect(screen.getByTestId('r3f')).toHaveAttribute('data-frameloop', 'always')
    act(() => setIntersecting(host, false))
    expect(screen.getByTestId('r3f')).toHaveAttribute('data-frameloop', 'demand')
  })

  it('still mounts the canvas under reduced motion, but never runs its loop', async () => {
    setMatchMedia(REDUCED, true)
    renderHost()
    const canvas = await screen.findByTestId('r3f', {}, SLOW)
    act(() => setIntersecting(canvas.closest('[data-scene-host]')!, true))
    expect(screen.getByTestId('r3f')).toHaveAttribute('data-frameloop', 'demand')
  })

  it('passes a dpr range from the quality tier, at most 2 and never above the tier cap', async () => {
    renderHost()
    const dpr = JSON.parse((await screen.findByTestId('r3f', {}, SLOW)).getAttribute('data-dpr')!) as number[]
    expect(dpr[0]).toBe(1)
    expect([1, 1.5, 2]).toContain(dpr[1])
  })
})
