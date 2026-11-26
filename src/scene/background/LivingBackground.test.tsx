import { act, render, waitFor } from '@testing-library/react'
import { StrictMode, Suspense } from 'react'
import type { ShaderMaterial, Texture } from 'three'
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

interface RenderOptions {
  /** Put the still's <img> under the canvas, as SceneHost does (the normal path). */
  still?: boolean
  strict?: boolean
}

let fallbacks = 0
function Fallback() {
  fallbacks++
  return null
}

function tree(tier: Quality['tier'], intensity: number, strict: boolean) {
  const scene = (
    <SceneQualityContext value={{ tier, dpr: [1, 1] }}>
      <Suspense fallback={<Fallback />}>
        <LivingBackground backdrop="street-dusk" intensity={intensity} />
      </Suspense>
    </SceneQualityContext>
  )
  return strict ? <StrictMode>{scene}</StrictMode> : scene
}

async function renderBackground(tier: Quality['tier'], intensity = 0.6, { still = true, strict = false }: RenderOptions = {}) {
  const host = document.createElement('div')
  host.dataset.sceneHost = ''
  if (still) {
    const img = document.createElement('img')
    Object.defineProperty(img, 'currentSrc', { value: 'http://localhost:3000/media/street-dusk-1920.avif' })
    img.decode = () => Promise.resolve()
    host.append(img)
  }
  r3f.canvas = document.createElement('canvas')
  host.append(r3f.canvas)
  document.body.append(host)
  let view: ReturnType<typeof render> | undefined
  // The texture suspends the scene; an awaited act lets React finish once it has loaded.
  await act(async () => {
    view = render(tree(tier, intensity, strict))
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
  fallbacks = 0
  // jsdom cannot decode images; a bitmap of the still's natural size stands in.
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1920, height: 1072, close() {} })))
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetOverride()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('LivingBackground', () => {
  it("draws the still's own image as an sRGB texture and hands the props to the uniforms", async () => {
    setOverride('night')
    await renderBackground('high', 0.6)
    const m = await material()
    frame(2)
    const texture = m.uniforms.uBackdrop!.value as Texture
    // A copy of the very element the page already shows: no second download.
    expect(createImageBitmap).toHaveBeenCalledWith(document.querySelector('[data-scene-host] img'), expect.anything())
    expect(texture.image).toMatchObject({ width: 1920, height: 1072 })
    expect(recorded.urls).toEqual([])
    expect(texture.colorSpace).toBe('srgb')
    expect(m.uniforms.uIntensity!.value).toBe(0.6)
    expect(m.uniforms.uNight!.value).toBe(1)
    expect(m.uniforms.uQuality!.value).toBe(2)
    expect(m.uniforms.uTime!.value).toBeGreaterThan(0)
    expect(r3f.canvas?.dataset.tier).toBe('high')
  })

  it('loads the smallest WebP wide enough when there is no still to reuse', async () => {
    await renderBackground('mid', 1, { still: false })
    const m = await material()
    frame(1)
    expect(recorded.urls).toEqual(['/media/street-dusk-1280.webp'])
    expect(m.uniforms.uBackdrop!.value).toBe(recorded.textures[0])
    expect(recorded.textures[0]!.colorSpace).toBe('srgb')
  })

  it('keeps its texture through the development double mount and later renders', async () => {
    const { rerender } = await renderBackground('mid', 1, { strict: true })
    const m = await material()
    frame(1)
    const texture = m.uniforms.uBackdrop!.value
    const shown = fallbacks
    // A re-render after the double mount must not suspend again (that would hide the canvas).
    await act(async () => rerender(tree('mid', 0.5, true)))
    await act(async () => rerender(tree('mid', 0.8, true)))
    expect(fallbacks).toBe(shown)
    frame(2)
    expect(recorded.materials.at(-1)!.uniforms.uBackdrop!.value).toBe(texture)
  })

  it('compiles the rain for mid and high, and leaves it out on low', async () => {
    await renderBackground('low')
    expect((await material()).defines).toMatchObject({ DROP_LAYERS: 0 })
  })

  it('moves the rain with the clock', async () => {
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
    frame(1)
    const dispose = vi.spyOn(m, 'dispose')
    const disposeTexture = vi.spyOn(m.uniforms.uBackdrop!.value as Texture, 'dispose')
    unmount()
    expect(dispose).toHaveBeenCalled()
    expect(disposeTexture).toHaveBeenCalled()
    expect(r3f.canvas?.dataset.backdrop).toBeUndefined()
  })
})
