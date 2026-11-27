import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { afterEach } from 'vitest'

/*
 * A stand-in for @react-three/fiber in jsdom, where a real Canvas cannot run. The Canvas draws a
 * plain canvas and passes its children through; the hooks serve a fixed root state. A component's
 * frame callback is registered while it is mounted, as in R3F, so a test can run a frame
 * (`runFrame`). Use it from a test file:
 *
 *   vi.mock('@react-three/fiber', async () => (await import('../test/r3f')).fiberStandIn)
 */
type FrameCallback = (state: unknown, delta: number) => void

const frames = new Set<FrameCallback>()

const state = {
  gl: { initTexture: () => {}, toneMappingExposure: 1 },
  scene: { environment: null },
  camera: { position: { set: () => {} }, lookAt: () => {}, updateProjectionMatrix: () => {}, fov: 50, near: 0.1, far: 100 },
  size: { width: 800, height: 400 },
  invalidate: () => {},
  get: () => state,
}

/** The root state every scene sees: its size is the canvas's, in CSS pixels. */
export const rootState = state

/** Run one frame of every mounted scene that asked for frames. */
export function runFrame(delta = 1 / 60): void {
  for (const callback of frames) callback(state, delta)
}

// No frame callback outlives its test.
afterEach(() => {
  frames.clear()
})

function useFrame(callback: FrameCallback): void {
  const latest = useRef(callback)
  useLayoutEffect(() => {
    latest.current = callback
  })
  useEffect(() => {
    const run: FrameCallback = (root, delta) => latest.current(root, delta)
    frames.add(run)
    return () => {
      frames.delete(run)
    }
  }, [])
}

export const fiberStandIn = {
  Canvas: ({ children }: { children?: ReactNode }) => (
    <div data-testid="r3f">
      <canvas />
      {children}
    </div>
  ),
  useFrame,
  useThree: (select?: (root: typeof state) => unknown) => (select ? select(state) : state),
}
