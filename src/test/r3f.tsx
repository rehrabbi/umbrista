import type { ReactNode } from 'react'

/*
 * A stand-in for @react-three/fiber in jsdom, where a real Canvas cannot run. The Canvas draws a
 * plain canvas and passes its children through; the hooks serve a fixed root state. Frame callbacks
 * are collected so a test can run a frame. Use it from a test file:
 *
 *   vi.mock('@react-three/fiber', async () => (await import('../test/r3f')).fiberStandIn)
 */
type FrameCallback = (state: unknown, delta: number) => void

export const frames = new Set<FrameCallback>()

const state = {
  gl: { initTexture: () => {}, toneMappingExposure: 1 },
  scene: { environment: null },
  camera: { position: { set: () => {} }, lookAt: () => {}, updateProjectionMatrix: () => {}, fov: 50, near: 0.1, far: 100 },
  size: { width: 800, height: 400 },
  invalidate: () => {},
  get: () => state,
}

/** Run one frame of every scene that asked for frames. */
export function runFrame(delta = 1 / 60): void {
  for (const callback of frames) callback(state, delta)
}

export const fiberStandIn = {
  Canvas: ({ children }: { children?: ReactNode }) => (
    <div data-testid="r3f">
      <canvas />
      {children}
    </div>
  ),
  useFrame: (callback: FrameCallback) => {
    frames.add(callback)
  },
  useThree: (select?: (root: typeof state) => unknown) => (select ? select(state) : state),
}
