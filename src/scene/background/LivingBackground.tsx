import { useFrame, useThree } from '@react-three/fiber'
import { use, useEffect, useMemo, useRef, useState } from 'react'
import {
  Mesh,
  MirroredRepeatWrapping,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  type Camera,
  type WebGLRenderer,
} from 'three'
import { MEDIA, type StillName } from '../../media/manifest'
import { usePrefersReducedMotion } from '../../media/usePrefersReducedMotion'
import { useNight } from '../../time/useNight'
import type { Tier } from '../quality'
import { useSceneQuality } from '../scene-quality'
import { useSceneReady } from '../scene-ready'
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
  parseObjectPosition,
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
  /**
   * How far the lamps are on, 0..1: the café window's light and the glow's strength. A chapter's
   * progress, not a clock: the night grade (`uNight`) stays the visitor's clock or the switch.
   * At 1, the default, the scene is lit as it always was.
   */
  lamp?: number
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
      uLamp: { value: 1 },
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
  lamp: number
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
  u.uLamp!.value = frame.lamp
  u.uIntensity!.value = frame.intensity
  u.uQuality!.value = frame.quality
  u.uScroll!.value = frame.scroll
}

/*
 * Compiling the shader is the slowest part of the first frame (hundreds of milliseconds on a phone,
 * or through ANGLE on Windows). three's compileAsync hands it to the driver and waits without
 * blocking (KHR_parallel_shader_compile where the browser has it), so the first frame only uses the
 * finished program.
 *
 * The compile is keyed by the shader variant, per canvas, never by the component's own material:
 * a first mount that suspends loses its memo, so a material-keyed promise would be new on every
 * retry and the scene would never finish loading. three shares one program between materials with
 * the same source and defines, so warming it with a probe material serves the real one. The probe
 * is kept alive with the promise, so the program is not released while the canvas lives.
 *
 * Without the extension (Safari, software WebGL) the compile would block just the same, and three
 * would warn about the missing extension on every visit; the first frame compiles it instead.
 */
const compiling = new WeakMap<HTMLCanvasElement, Map<string, Promise<unknown>>>()
const PROBE_QUAD = new PlaneGeometry(2, 2)
const COMPILED_IN_FRAME = Promise.resolve()

function compiled(gl: WebGLRenderer, camera: Camera, dropLayers: number, fogTaps: number): Promise<unknown> {
  if (!gl.extensions.has('KHR_parallel_shader_compile')) return COMPILED_IN_FRAME
  let variants = compiling.get(gl.domElement)
  if (!variants) {
    variants = new Map()
    compiling.set(gl.domElement, variants)
  }
  const key = `${dropLayers}:${fogTaps}`
  let pending = variants.get(key)
  if (!pending) {
    const probe = new Mesh(PROBE_QUAD, createMaterial(dropLayers, fogTaps))
    probe.frustumCulled = false
    // A failure here is not fatal: the first frame then compiles the program itself.
    pending = gl.compileAsync(probe, camera).catch(() => undefined)
    variants.set(key, pending)
  }
  return pending
}

/** The photo is sRGB: three decodes it to linear for the shader, which encodes its output back. */
function prepare(texture: Texture): Texture {
  texture.colorSpace = SRGBColorSpace
  // Refraction and parallax can sample just past an edge; a mirror there reads as more street.
  texture.wrapS = MirroredRepeatWrapping
  texture.wrapT = MirroredRepeatWrapping
  texture.needsUpdate = true
  return texture
}

/*
 * Textures live for the page, keyed by their source, so a render that suspends again, a remount, or
 * React's development double mount always gets the same promise back. An entry is dropped only if
 * it fails, so a later mount can try again. Unmounting disposes the GPU copy alone; three uploads it
 * again if the texture is used after that.
 */
const fromStill = new WeakMap<HTMLImageElement, Promise<Texture>>()
const fromFile = new Map<string, Promise<Texture>>()

/**
 * The still's own image, already downloaded by the browser: no second request. It is copied into
 * an ImageBitmap at its natural size, since the element's own width follows the layout. Bitmaps
 * cannot be flipped on upload, so the copy is made upside down, as WebGL expects.
 */
function textureFromStill(still: HTMLImageElement): Promise<Texture> {
  let pending = fromStill.get(still)
  if (!pending) {
    pending = still
      .decode()
      .then(() => createImageBitmap(still, { imageOrientation: 'flipY', premultiplyAlpha: 'none' }))
      .then((bitmap) => {
        const texture = new Texture(bitmap)
        texture.flipY = false
        return prepare(texture)
      })
    pending.catch(() => fromStill.delete(still))
    fromStill.set(still, pending)
  }
  return pending
}

function textureFromFile(url: string): Promise<Texture> {
  let pending = fromFile.get(url)
  if (!pending) {
    pending = new TextureLoader().loadAsync(url).then(prepare)
    pending.catch(() => fromFile.delete(url))
    fromFile.set(url, pending)
  }
  return pending
}

function backdropUrl(name: StillName, width: number): string {
  return `/media/${name}-${width}.webp`
}

type BackdropSource = { still: HTMLImageElement } | { url: string }

/**
 * Where the photograph comes from. Normally the still underneath, when it shows this backdrop: the
 * browser has chosen its derivative for the screen, so the canvas matches it exactly. Otherwise the
 * smallest WebP at least as wide as the photo is drawn.
 */
function backdropSource(
  canvas: HTMLCanvasElement,
  name: StillName,
  size: { width: number; height: number },
  dpr: number,
): BackdropSource {
  const still = canvas.closest('[data-scene-host]')?.querySelector('img')
  const current = still?.currentSrc ? new URL(still.currentSrc).pathname : ''
  if (still && current.startsWith(`/media/${name}-`) && /\.(avif|webp)$/.test(current)) return { still }
  const [aw, ah] = MEDIA[name].aspect
  // Under a cover crop the photo is drawn at least as wide as the canvas, and wider on tall screens.
  const drawn = Math.max(size.width, size.height * (aw / ah)) * dpr
  return { url: backdropUrl(name, pickWidth(MEDIA[name].widths, drawn)) }
}

/** The pixel size of a texture's image, whatever kind of image it is. */
function imageAspect(texture: Texture): number | undefined {
  const image = texture.image as { naturalWidth?: number; naturalHeight?: number; width: number; height: number }
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  return width > 0 && height > 0 ? width / height : undefined
}

/**
 * Test-only: Playwright may set `window.umbristaTestIntensity` (0..1) before the page loads, to check
 * the canvas against the still with the effect off. Nothing in the app sets it.
 */
function testIntensity(): number | undefined {
  const value = (window as Window & { umbristaTestIntensity?: unknown }).umbristaTestIntensity
  return typeof value === 'number' && value >= 0 && value <= 1 ? value : undefined
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
 * The landing's living background: rain on the window in front of the street photograph, a sodium
 * lamp that follows the pointer, a little depth as the page scrolls, and the day or night grade.
 * Drawn inside a SceneHost, which owns the canvas, its pixel ratio and its frame loop (on demand
 * while hidden, off screen or under reduced motion). Under reduced motion it is a still: a static
 * grade with the rain frozen and the lamp at rest on the café window.
 */
export function LivingBackground({ backdrop, intensity: requested = 1, lamp: lampProp = 1 }: LivingBackgroundProps) {
  const [forced] = useState(testIntensity)
  const intensity = forced ?? requested
  const lamp = Number.isFinite(lampProp) ? Math.min(1, Math.max(0, lampProp)) : 1
  const quality = useSceneQuality()
  const tier = quality?.tier ?? 'mid'
  const layers = layersFor(tier)
  const reduced = usePrefersReducedMotion()
  const { isNight } = useNight()
  const canvas = useThree((state) => state.gl.domElement)
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const ready = useSceneReady()

  // Rebuilt only when the tier changes what the shader compiles; the uniforms follow every frame.
  const { dropLayers, fogTaps } = layers
  const material = useMemo(() => createMaterial(dropLayers, fogTaps), [dropLayers, fogTaps])
  useEffect(() => () => material.dispose(), [material])
  // Started now, so the shader compiles while the photograph decodes.
  const shaderReady = compiled(gl, camera, dropLayers, fogTaps)

  // The backdrop texture: the still's own image, chosen once at mount. The scene
  // suspends until it has loaded, so the canvas fades in with the photograph already on it, never
  // over a blank frame.
  const [source] = useState(() => backdropSource(canvas, backdrop, size, dpr))
  const texture = use('still' in source ? textureFromStill(source.still) : textureFromFile(source.url))
  use(shaderReady)
  useEffect(() => () => texture.dispose(), [texture])
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

  // The canvas's box and the still's object-position (the crop to match). The crop only changes
  // with the layout, so it is read on resize. The box also moves with the page: a scroll only marks
  // it stale, and the next frame reads it once. Reading layout inside the scroll event would force
  // an extra style pass on every scroll frame, before the frame's own.
  const box = useRef<DOMRect | null>(null)
  const boxStale = useRef(true)
  const position = useRef<Vec2>([0.5, 0.5])
  useEffect(() => {
    const still = canvas.closest('[data-scene-host]')?.querySelector('img')
    const relayout = () => {
      boxStale.current = true
      if (still) position.current = parseObjectPosition(getComputedStyle(still).objectPosition)
    }
    const moved = () => {
      boxStale.current = true
    }
    relayout()
    const observer = new ResizeObserver(relayout)
    observer.observe(canvas)
    window.addEventListener('scroll', moved, { passive: true })
    window.addEventListener('resize', relayout, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', moved)
      window.removeEventListener('resize', relayout)
    }
  }, [canvas])

  // Under reduced motion the frame loop runs on demand, so a new grade, intensity or lamp asks for a frame.
  const stillFrame = reduced ? `${isNight ? 'night' : 'day'}:${intensity}:${lamp}` : null
  useEffect(() => {
    if (stillFrame !== null) invalidate()
  }, [stillFrame, invalidate])

  useFrame((state, delta) => {
    if (boxStale.current) {
      box.current = canvas.getBoundingClientRect()
      boxStale.current = false
    }
    const rect = box.current ?? { left: 0, top: 0, width: size.width, height: size.height }
    const viewPx: Vec2 = rect.width > 0 && rect.height > 0 ? [rect.width, rect.height] : [size.width, size.height]
    const [aw, ah] = MEDIA[backdrop].aspect
    const cover = coverUv(viewPx[0] / viewPx[1], imageAspect(texture) ?? aw / ah, position.current)

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
      lamp,
      intensity,
      quality: layers.quality,
      scroll,
      depth: parallax(scroll, intensity),
    })
    // This frame draws the photograph: the host may fade the canvas in over the still.
    ready()
  })

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
