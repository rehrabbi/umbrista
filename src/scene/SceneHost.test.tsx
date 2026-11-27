import { act, render, screen } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setIntersecting, useFakeIntersectionObserver } from '../test/intersection'
import { setMatchMedia, setWebGL } from '../test/setup'
import { resetSceneGate } from './gate'
import { useSceneReady } from './scene-ready'
import { SceneHost } from './SceneHost'

// R3F's Canvas cannot run in jsdom. This stand-in exposes the props the host passes it.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ frameloop, dpr, children }: { frameloop?: string; dpr?: number[]; children?: ReactNode }) => (
    <div data-testid="r3f" data-frameloop={frameloop} data-dpr={JSON.stringify(dpr)}>
      <canvas data-testid="gl" />
      {children}
    </div>
  ),
}))

const REDUCED = '(prefers-reduced-motion: reduce)'
// The canvas mounts after an idle delay, a frame probe and a lazy import; allow for a busy machine.
const SLOW = { timeout: 5000 }
const LABEL = 'Calvessa at dusk, one café window lit'

useFakeIntersectionObserver()

beforeEach(() => {
  resetSceneGate()
})

afterEach(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  resetSceneGate()
})

/** The visitor shows intent (the first pointer move), which lets scenes start. */
function intent() {
  act(() => {
    window.dispatchEvent(new Event('pointermove'))
  })
}

function renderHost({ waitForVisitor = false } = {}) {
  const view = render(
    <SceneHost still="street-dusk" label={LABEL}>
      <group />
    </SceneHost>,
  )
  if (!waitForVisitor) intent()
  return view
}

/** A scene that says when it has drawn its first frame. */
function DrawsOnce() {
  const ready = useSceneReady()
  useEffect(() => ready(), [ready])
  return null
}

describe('SceneHost', () => {
  it('creates no WebGL context and no canvas until the visitor shows intent', async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    renderHost({ waitForVisitor: true })
    await act(() => new Promise((resolve) => setTimeout(resolve, 900)))
    expect(getContext).not.toHaveBeenCalled()
    expect(screen.queryByTestId('r3f')).toBeNull()
    intent()
    expect(await screen.findByTestId('r3f', {}, SLOW)).toBeInTheDocument()
    expect(getContext).toHaveBeenCalled()
    getContext.mockRestore()
  })

  it('with `near`, also waits until the host nears the screen', async () => {
    const { container } = render(
      <SceneHost still="street-dusk" label={LABEL} near="100% 0px">
        <group />
      </SceneHost>,
    )
    intent()
    await act(() => new Promise((resolve) => setTimeout(resolve, 900)))
    expect(screen.queryByTestId('r3f')).toBeNull()
    act(() => setIntersecting(container.querySelector('[data-scene-host]')!, true))
    expect(await screen.findByTestId('r3f', {}, SLOW)).toBeInTheDocument()
  }, 10_000)

  it('fades the canvas in only once its scene has drawn, over the still', async () => {
    const { container } = render(
      <SceneHost still="street-dusk" label={LABEL}>
        <DrawsOnce />
      </SceneHost>,
    )
    const host = container.querySelector('[data-scene-host]')!
    intent()
    await screen.findByTestId('r3f', {}, SLOW)
    expect(host).toHaveAttribute('data-live', 'ready')
    expect(screen.getByAltText(LABEL)).toBeInTheDocument()
  })

  it('waits to fade in while its scene has not drawn', async () => {
    const { container } = renderHost()
    await screen.findByTestId('r3f', {}, SLOW)
    expect(container.querySelector('[data-scene-host]')).not.toHaveAttribute('data-live')
  })

  it('marks a swap host, whose still steps aside once the live scene is in', () => {
    const { container } = render(<SceneHost still="street-dusk" label={LABEL} swap />)
    expect(container.querySelector('[data-scene-host]')).toHaveAttribute('data-swap')
  })

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

  it('keeps only the still on a software renderer', async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
    ) {
      const RENDERER = 0x9246
      return {
        canvas: this,
        getExtension: (name: string) => (name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: RENDERER } : null),
        getParameter: (parameter: number) => (parameter === RENDERER ? 'Google SwiftShader' : null),
      } as unknown as WebGLRenderingContext
    } as unknown as HTMLCanvasElement['getContext'])
    renderHost()
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(screen.getByAltText(LABEL)).toBeInTheDocument()
    expect(screen.queryByTestId('r3f')).toBeNull()
    getContext.mockRestore()
  })

  it('asks the browser to refuse a context with a major performance caveat', async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    renderHost()
    await screen.findByTestId('r3f', {}, SLOW)
    expect(getContext).toHaveBeenCalledWith('webgl2', { failIfMajorPerformanceCaveat: true })
    getContext.mockRestore()
  })

  it('allows a software renderer when a test sets the override', async () => {
    ;(window as Window & { umbristaTestAllowSoftwareGL?: boolean }).umbristaTestAllowSoftwareGL = true
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    try {
      renderHost()
      await screen.findByTestId('r3f', {}, SLOW)
      expect(getContext).toHaveBeenCalledWith('webgl2', undefined)
    } finally {
      delete (window as Window & { umbristaTestAllowSoftwareGL?: boolean }).umbristaTestAllowSoftwareGL
      getContext.mockRestore()
    }
  })

  it('draws at the tier a test forces', async () => {
    ;(window as Window & { umbristaTestTier?: string }).umbristaTestTier = 'low'
    try {
      renderHost()
      const dpr = (await screen.findByTestId('r3f', {}, SLOW)).getAttribute('data-dpr')
      expect(JSON.parse(dpr!)).toEqual([1, 1])
    } finally {
      delete (window as Window & { umbristaTestTier?: string }).umbristaTestTier
    }
  })
})
