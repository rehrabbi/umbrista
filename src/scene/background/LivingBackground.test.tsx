import { act, render, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import type { ShaderMaterial } from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setMatchMedia } from '../../test/setup'
import { resetOverride, setOverride } from '../../time/night-store'
import type { Quality } from '../quality'
import { SceneQualityContext } from '../scene-quality'
import { LivingBackground } from './LivingBackground'

type FrameCallback = (state: { frameloop: 'always' | 'demand'; clock: { elapsedTime: number } }, delta: number) => void

// R3F cannot run in jsdom: these stand-ins capture the frame callback and serve a fixed root state.
const r3f = vi.hoisted(() => ({
  frame: null as FrameCallback | null,
  invalidate: () => {},
  canvas: null as HTMLCanvasElement | null,
}))
// The real three, with the material and loader recorded.
const recorded = vi.hoisted(() => ({
  materials: [] as ShaderMaterial[],
  urls: [] as string[],
  textures: [] as { colorSpace: string; dispose: () => void; disposed: boolean }[],
}))

vi.mock('@react-three/fiber', () => ({
  useFrame: (callback: FrameCallback) => {
    r3f.frame = callback
  },
  useThree: (select: (state: unknown) => unknown) =>
    select({
      gl: { domElement: r3f.canvas },
      size: { width: 800, height: 400 },
      viewport: { dpr: 1 },
      invalidate: r3f.invalidate,
    }),
}))

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>()
  class RecordedMaterial extends actual.ShaderMaterial {
    constructor(parameters?: ConstructorParameters<typeof actual.ShaderMaterial>[0]) {
      super(parameters)
      recorded.materials.push(this)
    }
  }
  class FakeLoader {
    loadAsync(url: string) {
      recorded.urls.push(url)
      const texture = {
        image: { width: 1280, height: 714 },
        colorSpace: '',
        disposed: false,
        dispose() {
          this.disposed = true
        },
      }
      recorded.textures.push(texture)
      return Promise.resolve(texture)
    }
  }
  return { ...actual, ShaderMaterial: RecordedMaterial, TextureLoader: FakeLoader }
})

const REDUCED = '(prefers-reduced-motion: reduce)'

async function renderBackground(tier: Quality['tier'], intensity = 0.6) {
  const host = document.createElement('div')
  host.dataset.sceneHost = ''
  r3f.canvas = document.createElement('canvas')
  host.append(r3f.canvas)
  document.body.append(host)
  let view: ReturnType<typeof render> | undefined
  // The texture suspends the scene; an awaited act lets React finish once it has loaded.
  await act(async () => {
    view = render(
      <SceneQualityContext value={{ tier, dpr: [1, 1] }}>
        <Suspense fallback={null}>
          <LivingBackground backdrop="street-dusk" intensity={intensity} />
        </Suspense>
      </SceneQualityContext>,
    )
  })
  return view!
}

async function material(): Promise<ShaderMaterial> {
  await waitFor(() => expect(r3f.canvas?.dataset.backdrop).toBe('ready'))
  return recorded.materials.at(-1)!
}

function frame(elapsedTime: number, delta = 1 / 60) {
  act(() => r3f.frame!({ frameloop: 'always', clock: { elapsedTime } }, delta))
}

beforeEach(() => {
  recorded.materials.length = 0
  recorded.urls.length = 0
  recorded.textures.length = 0
  r3f.frame = null
})

afterEach(() => {
  resetOverride()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('LivingBackground', () => {
  it('loads the backdrop as an sRGB texture and hands the props to the uniforms', async () => {
    setOverride('night')
    await renderBackground('high', 0.6)
    const m = await material()
    expect(recorded.urls).toEqual(['/media/street-dusk-1280.webp'])
    frame(2)
    expect(m.uniforms.uBackdrop!.value).toBe(recorded.textures[0])
    expect(recorded.textures[0]!.colorSpace).toBe('srgb')
    expect(m.uniforms.uIntensity!.value).toBe(0.6)
    expect(m.uniforms.uNight!.value).toBe(1)
    expect(m.uniforms.uQuality!.value).toBe(2)
    expect(m.uniforms.uTime!.value).toBeGreaterThan(0)
    expect(r3f.canvas?.dataset.tier).toBe('high')
  })

  it('compiles the rain for mid and high, and leaves it out on low', async () => {
    await renderBackground('low')
    expect((await material()).defines).toMatchObject({ DROP_LAYERS: 0 })
  })

  it('moves the rain with the clock, but freezes it under reduced motion', async () => {
    await renderBackground('mid')
    const moving = await material()
    frame(1)
    const before = moving.uniforms.uTime!.value as number
    frame(3)
    expect(moving.uniforms.uTime!.value).toBeCloseTo(before + 2)
  })

  it('holds one still frame under reduced motion', async () => {
    setMatchMedia(REDUCED, true)
    await renderBackground('mid')
    const still = await material()
    frame(1)
    const at = still.uniforms.uTime!.value
    frame(9)
    expect(still.uniforms.uTime!.value).toBe(at)
  })

  it('eases the night grade in over the scene duration instead of jumping', async () => {
    setOverride('day')
    await renderBackground('mid')
    const m = await material()
    frame(0)
    expect(m.uniforms.uNight!.value).toBe(0)
    act(() => setOverride('night'))
    frame(0.1, 0.3)
    const part = m.uniforms.uNight!.value as number
    expect(part).toBeGreaterThan(0)
    expect(part).toBeLessThan(1)
    frame(2, 1)
    expect(m.uniforms.uNight!.value).toBe(1)
  })

  it('disposes the material and the texture on unmount', async () => {
    const { unmount } = await renderBackground('high')
    const m = await material()
    const dispose = vi.spyOn(m, 'dispose')
    unmount()
    expect(dispose).toHaveBeenCalled()
    expect(recorded.textures[0]!.disposed).toBe(true)
    expect(r3f.canvas?.dataset.backdrop).toBeUndefined()
  })
})
