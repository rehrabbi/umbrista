import { useFrame, useThree } from '@react-three/fiber'
import { use, useEffect, useMemo, useRef, useState } from 'react'
import { ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2, type Texture } from 'three'
import { MEDIA, type StillName } from '../../media/manifest'
import { usePrefersReducedMotion } from '../../media/usePrefersReducedMotion'
import { useNight } from '../../time/useNight'
import type { Tier } from '../quality'
import { useSceneQuality } from '../scene-quality'
import glowSource from './glow.frag.glsl?raw'
import rainGlassSource from './rain-glass.frag.glsl?raw'
import {
  CAFE_WINDOW_UV,
  coverUv,
  easePointer,
  imageToView,
  layersFor,
  parallax,
  parseDurationMs,
  pickWidth,
  scrollProgress,
  stepNight,
  type Cover,
  type Vec2,
} from './uniforms'

export interface LivingBackgroundProps {
  /**
   * The still behind the glass: the same photograph the SceneHost shows underneath. Read once at
   * mount; give the component a new `key` to change it.
   */
  backdrop: StillName
  /** 0 draws the plain photograph, 1 the full rain, lamp and grade. */
  intensity?: number
}

// A full-screen triangle pair. The camera is ignored: the quad always covers the canvas.
const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// The rain's clock starts here, and reduced motion holds it here, so the still frame is always the same.
const STILL_TIME = 41.5

/** The `--dur-scene` token, so the grade changes at the same pace as the rest of the scene. */
function sceneDurationMs(): number {
  return parseDurationMs(getComputedStyle(document.documentElement).getPropertyValue('--dur-scene'))
}

function createMaterial(dropLayers: number, fogTaps: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: [glowSource, rainGlassSource].join('\n'),
    defines: { DROP_LAYERS: dropLayers, FOG_TAPS: fogTaps },
    uniforms: {
      uBackdrop: { value: null },
      uCoverScale: { value: new Vector2(1, 1) },
      uCoverOffset: { value: new Vector2(0, 0) },
      uParallax: { value: new Vector2(1, 0) },
      uScroll: { value: 0 },
      uViewPx: { value: new Vector2(1, 1) },
      uPointer: { value: new Vector2(0.5, 0.5) },
      uFocus: { value: new Vector2(0.5, 0.5) },
      uTime: { value: STILL_TIME },
      uNight: { value: 0 },
      uIntensity: { value: 0 },
      uQuality: { value: 1 },
    },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
}

/** Everything one frame feeds the shader. */
interface FrameUniforms {
  backdrop: Texture | null
  cover: Cover
  viewPx: Vec2
  pointer: Vec2
  focus: Vec2
  time: number
  night: number
  intensity: number
  quality: number
  scroll: number
  depth: { scale: number; shift: number }
}

function writeUniforms(material: ShaderMaterial, frame: FrameUniforms): void {
  const u = material.uniforms
  u.uBackdrop!.value = frame.backdrop
  ;(u.uCoverScale!.value as Vector2).set(frame.cover.scale[0], frame.cover.scale[1])
  ;(u.uCoverOffset!.value as Vector2).set(frame.cover.offset[0], frame.cover.offset[1])
  ;(u.uViewPx!.value as Vector2).set(frame.viewPx[0], frame.viewPx[1])
  ;(u.uPointer!.value as Vector2).set(frame.pointer[0], frame.pointer[1])
  ;(u.uFocus!.value as Vector2).set(frame.focus[0], frame.focus[1])
  ;(u.uParallax!.value as Vector2).set(frame.depth.scale, frame.depth.shift)
  u.uTime!.value = frame.time
  u.uNight!.value = frame.night
  u.uIntensity!.value = frame.intensity
  u.uQuality!.value = frame.quality
  u.uScroll!.value = frame.scroll
}

// Loaded textures by URL, so a re-render while suspended asks for the same promise.
const textures = new Map<string, Promise<Texture>>()

function loadTexture(url: string): Promise<Texture> {
  let pending = textures.get(url)
  if (!pending) {
    pending = new TextureLoader().loadAsync(url).then((texture) => {
      // The photo is sRGB; three decodes it to linear for the shader and encodes the output back.
      texture.colorSpace = SRGBColorSpace
      return texture
    })
    textures.set(url, pending)
  }
  return pending
}

function backdropUrl(name: StillName, width: number, format: 'avif' | 'webp'): string {
  return `/media/${name}-${width}.${format}`
}

/**
 * Flags the canvas once the photograph is on it, with the tier it drew at, for tests and tools that
 * wait for the scene or measure it.
 */
function markBackdrop(canvas: HTMLCanvasElement, tier: Tier | null): void {
  if (tier) {
    canvas.dataset.backdrop = 'ready'
    canvas.dataset.tier = tier
  } else {
    delete canvas.dataset.backdrop
    delete canvas.dataset.tier
  }
}

/**
 * The file the still underneath is showing, if it is this backdrop: the browser has already chosen
 * it for the screen and downloaded it, so the canvas reuses it from the cache and matches it
 * exactly. Otherwise the smallest WebP at least as wide as the photo is drawn on the canvas.
 */
function backdropSource(
  canvas: HTMLCanvasElement,
  name: StillName,
  size: { width: number; height: number },
  dpr: number,
): string {
  const still = canvas.closest('[data-scene-host]')?.querySelector('img')
  const current = still?.currentSrc ? new URL(still.currentSrc).pathname : ''
  if (current.startsWith(`/media/${name}-`) && /\.(avif|webp)$/.test(current)) return current
  const [aw, ah] = MEDIA[name].aspect
  // Under a cover crop the photo is drawn at least as wide as the canvas, and wider on tall screens.
  const drawn = Math.max(size.width, size.height * (aw / ah)) * dpr
  return backdropUrl(name, pickWidth(MEDIA[name].widths, drawn), 'webp')
}

/**
 * The landing's living background: rain on the window in front of the street photograph, a sodium
 * lamp that follows the pointer, a little depth as the page scrolls, and the day or night grade.
 * Drawn inside a SceneHost, which owns the canvas, its pixel ratio and its frame loop (on demand
 * while hidden, off screen or under reduced motion). Under reduced motion it is a still: a static
 * grade with the rain frozen and the lamp at rest on the café window.
 */
export function LivingBackground({ backdrop, intensity = 1 }: LivingBackgroundProps) {
  const quality = useSceneQuality()
  const tier = quality?.tier ?? 'mid'
  const layers = layersFor(tier)
  const reduced = usePrefersReducedMotion()
  const { isNight } = useNight()
  const canvas = useThree((state) => state.gl.domElement)
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const invalidate = useThree((state) => state.invalidate)

  // Rebuilt only when the tier changes what the shader compiles; the uniforms follow every frame.
  const { dropLayers, fogTaps } = layers
  const material = useMemo(() => createMaterial(dropLayers, fogTaps), [dropLayers, fogTaps])
  useEffect(() => () => material.dispose(), [material])

  // The backdrop texture: the same derivative as the still, chosen once at mount. The scene
  // suspends until it has loaded, so the canvas fades in with the photograph already on it, never
  // over a blank frame.
  const [url] = useState(() => backdropSource(canvas, backdrop, size, dpr))
  const texture = use(loadTexture(url))
  useEffect(
    () => () => {
      textures.delete(url)
      texture.dispose()
    },
    [url, texture],
  )
  useEffect(() => {
    markBackdrop(canvas, tier)
    return () => markBackdrop(canvas, null)
  }, [canvas, tier])

  // The pointer, in client pixels; null for touch, before any move, and once it leaves the page.
  const pointer = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    pointer.current = null
    if (reduced) return
    const onMove = (event: PointerEvent) => {
      pointer.current = event.pointerType === 'touch' ? null : { x: event.clientX, y: event.clientY }
    }
    const onLeave = () => {
      pointer.current = null
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [reduced])

  const [durationMs] = useState(sceneDurationMs)
  const eased = useRef<Vec2 | null>(null)
  const night = useRef(isNight ? 1 : 0)

  // Under reduced motion the frame loop runs on demand, so a new grade or intensity asks for a frame.
  const stillFrame = reduced ? `${isNight ? 'night' : 'day'}:${intensity}` : null
  useEffect(() => {
    if (stillFrame !== null) invalidate()
  }, [stillFrame, invalidate])

  useFrame((state, delta) => {
    const rect = canvas.getBoundingClientRect()
    const viewPx: Vec2 = rect.width > 0 && rect.height > 0 ? [rect.width, rect.height] : [size.width, size.height]
    const image = texture.image as { width: number; height: number } | undefined
    const [aw, ah] = MEDIA[backdrop].aspect
    const cover = coverUv(viewPx[0] / viewPx[1], image ? image.width / image.height : aw / ah)

    const animate = !reduced && state.frameloop === 'always'
    const time = reduced ? STILL_TIME : STILL_TIME + state.clock.elapsedTime

    // The lamp: the eased pointer, or at rest on the café window, drifting very slowly.
    const rest = imageToView(CAFE_WINDOW_UV, cover)
    const drift: Vec2 = reduced
      ? rest
      : [rest[0] + 0.006 * Math.sin(time * 0.21), rest[1] + 0.008 * Math.sin(time * 0.17 + 1.3)]
    const at = pointer.current
    const aim: Vec2 = at ? [(at.x - rect.left) / viewPx[0], 1 - (at.y - rect.top) / viewPx[1]] : drift
    const goal = aim[0] >= 0 && aim[0] <= 1 && aim[1] >= 0 && aim[1] <= 1 ? aim : drift
    eased.current = eased.current && animate ? easePointer(eased.current, goal, delta) : goal

    // The grade steps towards night or day over the scene duration; a still page simply switches.
    const want = isNight ? 1 : 0
    night.current = animate ? stepNight(night.current, want, delta * 1000, durationMs) : want

    // Depth: the photograph recedes behind the glass as the hero scrolls away.
    const scroll = reduced ? 0 : scrollProgress(rect.top, rect.height)

    writeUniforms(material, {
      backdrop: texture,
      cover,
      viewPx,
      pointer: eased.current,
      focus: rest,
      time,
      night: night.current,
      intensity,
      quality: layers.quality,
      scroll,
      depth: parallax(scroll, intensity),
    })
  })

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
