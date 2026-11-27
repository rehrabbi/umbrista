import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  SpotLight,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  type Object3D,
  type WebGLRenderer,
} from 'three'
import { usePrefersReducedMotion } from '../../media/usePrefersReducedMotion'
import { useNight } from '../../time/useNight'
import { parseDurationMs, stepNight } from '../background/uniforms'
import { CUP_STILL_VIEW, orbitAt, type Orbit } from '../journey/chapters'
import { journeyProgress } from '../journey/progress'
import { useSceneQuality } from '../scene-quality'
import { useSceneReady } from '../scene-ready'
import { onCupInput, takeCupInputs } from './cupInput'
import { chapterLook, liquidLook, type LiquidLook } from './liquidLook'
import { applyLook, createLiquidMaterial, liquidSurface } from './liquidSurface'
import { REST, step, type CupInput, type CupState } from './physics'
import { useCupModel, type CupModel } from './useCupModel'

/** The lens: a long, quiet portrait lens, as in the approved preview. Vertical, for a square frame. */
const FOV = 28
/** How long a button's push lasts, in seconds. */
const PUSH_SECONDS = 0.32
/** How far below the rim the coffee stops when the cup is full, as a fraction of the cup's height. */
const BRIM_MARGIN = 0.07
/** How long the look takes to fade from one chapter's state to the next under reduced motion. */
const STILL_FADE_SECONDS = 0.6

/**
 * The vertical field of view that fits a square frame inside the canvas, as `object-fit: contain`
 * does for the cup's still: a wide canvas shows the frame at full height, a tall one at full width.
 * The still is square, so the live cup lands exactly where the still's cup is.
 */
export function containFov(fovDeg: number, aspect: number): number {
  if (!(aspect > 0) || aspect >= 1) return fovDeg
  const half = (fovDeg * Math.PI) / 360
  return (Math.atan(Math.tan(half) / aspect) * 360) / Math.PI
}

/** The camera's position for an orbit around `target`, at `frame` world units for distance 1. */
function placeCamera(camera: PerspectiveCamera, orbit: Orbit, target: Vector3, frame: number): void {
  const azimuth = (orbit[0] * Math.PI) / 180
  const polar = (orbit[1] * Math.PI) / 180
  const distance = orbit[2] * frame
  camera.position.set(
    target.x + distance * Math.sin(polar) * Math.sin(azimuth),
    target.y + distance * Math.cos(polar),
    target.z + distance * Math.sin(polar) * Math.cos(azimuth),
  )
  camera.lookAt(target)
}

/*
 * The light the cup reflects: a dark room built in code (no image is fetched), with a warm panel
 * overhead for the sodium lamp and a tall cool panel to one side for the window. Prefiltered once.
 */
function nightRoom(gl: WebGLRenderer): Texture {
  const room = new Scene()
  const box = new Mesh(new BoxGeometry(12, 8, 12), new MeshBasicMaterial({ color: new Color('#0a1120'), side: BackSide }))
  box.position.y = 2
  room.add(box)
  const lamp = new Mesh(new PlaneGeometry(2.4, 2.4), new MeshBasicMaterial({ color: new Color(6.0, 3.4, 1.4) }))
  lamp.position.set(-1.6, 5.5, 1.2)
  lamp.rotation.x = Math.PI / 2
  room.add(lamp)
  const pane = new Mesh(new PlaneGeometry(3.2, 4.5), new MeshBasicMaterial({ color: new Color(0.55, 0.7, 1.05) }))
  pane.position.set(5.8, 2.2, -1.2)
  pane.rotation.y = -Math.PI / 2
  room.add(pane)
  const floor = new Mesh(new PlaneGeometry(12, 12), new MeshBasicMaterial({ color: new Color(0.05, 0.04, 0.035) }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.9
  room.add(floor)
  const pmrem = new PMREMGenerator(gl)
  const target = pmrem.fromScene(room, 0.03)
  pmrem.dispose()
  room.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose()
      ;(object.material as MeshBasicMaterial).dispose()
    }
  })
  return target.texture
}

/** A soft dark disc, drawn on the table under the saucer where little light reaches. */
function contactTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(0,0,0,0.9)')
  gradient.addColorStop(0.55, 'rgba(0,0,0,0.55)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * The table under the cup, drawn only where the lamp's shadow falls on it. The shadow fades out
 * before the canvas's edges, so it never ends in a straight line where the canvas does.
 */
function shadowCatcher(): ShadowMaterial & { userData: { viewport: Vector2 } } {
  const viewport = new Vector2(1, 1)
  const material = new ShadowMaterial({ transparent: true, opacity: 0.55 }) as ShadowMaterial & { userData: { viewport: Vector2 } }
  material.userData.viewport = viewport
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uViewport = { value: viewport }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uViewport;')
      .replace(
        'gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );',
        [
          'vec2 edgeUv = gl_FragCoord.xy / uViewport;',
          'float edge = min(min(edgeUv.x, 1.0 - edgeUv.x), min(edgeUv.y, 1.0 - edgeUv.y));',
          'gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) * smoothstep(0.0, 0.16, edge) );',
        ].join('\n'),
      )
  }
  material.customProgramCacheKey = () => 'umbrista-table-shadow'
  return material
}

/**
 * The seat: the approved model leaves an open slot between the cup's foot and the saucer, a ring
 * where the saucer's top face stops short of the foot and the page shows through. A glazed disc
 * just under the saucer's inner edge closes it, shaded darker towards the middle as the crevice
 * where a cup sits would be. Its middle is hidden inside the cup's foot.
 */
const SEAT_OVERLAP = 1.04
/** How far the disc sits below the saucer's edge, as a fraction of the cup's height. */
const SEAT_DROP = 0.006

function seatTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, '#5e5952')
  gradient.addColorStop(0.85, '#5e5952')
  gradient.addColorStop(0.9, '#a29c92')
  gradient.addColorStop(0.95, '#c6c0b6')
  gradient.addColorStop(1, '#cdc7bd')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * The glaze: the model's own maps on three's physical material, with a clear coat for the wet shine
 * of a glazed cup. The model's baked emissive map is kept faint: in a dark room a cup gives no light.
 */
function glaze(scene: Group): MeshPhysicalMaterial[] {
  const made: MeshPhysicalMaterial[] = []
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    const source = object.material as MeshStandardMaterial
    if (source instanceof MeshPhysicalMaterial) return
    const material = new MeshPhysicalMaterial({
      map: source.map,
      normalMap: source.normalMap,
      roughnessMap: source.roughnessMap,
      metalnessMap: source.metalnessMap,
      emissiveMap: source.emissiveMap,
      emissive: new Color(1, 1, 1),
      emissiveIntensity: 0.06,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
      side: source.side,
    })
    material.normalScale.copy(source.normalScale)
    object.material = material
    made.push(material)
  })
  return made
}

/** Every texture the cup's materials draw with. */
function texturesOf(scene: Object3D): Texture[] {
  const textures = new Set<Texture>()
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const material = object.material as MeshStandardMaterial
    for (const map of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap, material.emissiveMap]) {
      if (map) textures.add(map)
    }
  })
  return [...textures]
}

/** The night and day lighting: the lamp's colour and strength, the window's, the room's. */
const LIGHT = {
  night: { key: new Color('#ffb062'), keyIntensity: 55, fill: new Color('#7f9bd6'), fillIntensity: 0.6, rim: 0.9, room: 0.7 },
  day: { key: new Color('#ffd9ae'), keyIntensity: 35, fill: new Color('#c9d6ee'), fillIntensity: 0.9, rim: 0.6, room: 0.95 },
} as const

interface Push {
  input: CupInput
  until: number
}

export interface HeroCupProps {
  /** Test and tooling only: draw this journey progress, not the page's. */
  progress?: number
  /**
   * Show each chapter as a still: the camera at rest and each chapter's coffee, fading to the next
   * chapter's as it changes. Under reduced motion always; also when the page cannot follow the scroll.
   */
  still?: boolean
}

/**
 * The Umbrista cup, lit live: a sodium key from above, a cool fill from the window, and the night
 * or day grade from the visitor's clock. It follows the journey: the camera's path and the coffee's
 * look both come from the scroll progress, read every frame outside React. The visitor can tilt,
 * spin and splash it (physics.ts). Under reduced motion the camera never moves and each chapter's
 * coffee is a still, fading to the next chapter's as the chapter changes.
 */
export default function HeroCup({ progress: fixedProgress, still: asStill }: HeroCupProps) {
  const model = useCupModel()
  const reduced = usePrefersReducedMotion()
  const still = asStill === true || reduced
  const { isNight } = useNight()
  const quality = useSceneQuality()
  const tier = quality?.tier ?? 'mid'
  const ready = useSceneReady()
  // The renderer, scene and camera are three's own mutable objects: read through get(), changed in
  // effects and frames, never during render.
  const get = useThree((state) => state.get)
  const invalidate = useThree((state) => state.invalidate)
  const size = useThree((state) => state.size)

  const materials = useMemo(() => glaze(model.scene), [model.scene])
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])

  // The shape the scene works from.
  const shape = useShape(model)

  const liquid = useMemo(() => {
    const geometry = liquidSurface(shape.brimRadius)
    const material = createLiquidMaterial(shape.brimRadius)
    return { geometry, material }
  }, [shape.brimRadius])
  useEffect(
    () => () => {
      liquid.geometry.dispose()
      liquid.material.dispose()
    },
    [liquid],
  )

  const stream = useMemo(() => {
    const geometry = new CylinderGeometry(0.008, 0.014, 2.4, 20, 1, true)
    geometry.translate(0, 1.2, 0)
    const material = new MeshPhysicalMaterial({
      color: new Color('#f4eee3'),
      roughness: 0.3,
      clearcoat: 0.7,
      sheen: 0.6,
      // Milk scatters light inside itself, so even its shaded side stays pale.
      emissive: new Color('#f4eee3'),
      emissiveIntensity: 0.18,
    })
    return { geometry, material }
  }, [])
  useEffect(
    () => () => {
      stream.geometry.dispose()
      stream.material.dispose()
    },
    [stream],
  )

  const table = useMemo(() => shadowCatcher(), [])
  useEffect(() => () => table.dispose(), [table])
  const contact = useMemo(() => contactTexture(), [])
  useEffect(() => () => contact.dispose(), [contact])
  const seat = useMemo(() => seatTexture(), [])
  useEffect(() => () => seat.dispose(), [seat])

  // The room's reflections.
  useEffect(() => {
    const { gl, scene } = get()
    const environment = nightRoom(gl)
    scene.environment = environment
    return () => {
      scene.environment = null
      environment.dispose()
    }
  }, [get])

  // Shadows: the lamp's long shadow on the table, softer on lesser devices, none on the weakest.
  useEffect(() => {
    const { gl } = get()
    gl.shadowMap.enabled = tier !== 'low'
    gl.toneMappingExposure = 0.95
  }, [get, tier])

  const tilt = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const surface = useRef<Mesh>(null)
  const pour = useRef<Mesh>(null)
  const key = useRef<SpotLight>(null)
  const ground = useRef<Mesh>(null)
  const fill = useRef<DirectionalLight>(null)
  const rim = useRef<DirectionalLight>(null)

  // The cup is drawn only once its programs are compiled and its textures are on the GPU, each
  // texture in a frame of its own, so no single frame stalls; the host then fades the canvas in.
  const [warm, setWarm] = useState<'compiling' | 'uploading' | 'ready'>('compiling')
  const uploads = useRef<Texture[]>([])
  useEffect(() => {
    let cancelled = false
    const { gl, scene, camera } = get()
    const compiled = gl.extensions.has('KHR_parallel_shader_compile') ? gl.compileAsync(scene, camera) : Promise.resolve()
    void compiled
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return
        uploads.current = texturesOf(model.scene)
        setWarm('uploading')
      })
    return () => {
      cancelled = true
    }
  }, [get, model.scene])

  // The visitor's moves.
  const state = useRef<CupState>(REST)
  const pushes = useRef<Push[]>([])
  const yaw = useRef(0)
  const clock = useRef(0)
  useEffect(() => onCupInput(invalidate), [invalidate])

  const night = useRef(isNight ? 1 : 0)
  const [durationMs] = useState(() => parseDurationMs(getComputedStyle(document.documentElement).getPropertyValue('--dur-scene')))
  const shown = useRef<LiquidLook | null>(null)
  const target = useMemo(() => new Vector3(0, shape.centreY, 0), [shape.centreY])
  const sloshDir = useMemo(() => new Vector2(1, 0), [])

  useFrame((frame, delta) => {
    const dt = Math.min(delta, 0.1)
    clock.current += dt

    // The camera: a square frame, contained in whatever box the canvas has.
    const camera = frame.camera as PerspectiveCamera
    const buffer = (ground.current?.material as ShadowMaterial | undefined)?.userData.viewport as Vector2 | undefined
    buffer?.set(size.width * frame.viewport.dpr, size.height * frame.viewport.dpr)
    camera.fov = containFov(FOV, size.width / Math.max(1, size.height))
    camera.near = 0.1
    camera.far = 50
    camera.updateProjectionMatrix()
    const progress = fixedProgress ?? journeyProgress.get()
    placeCamera(camera, still ? CUP_STILL_VIEW : orbitAt(progress), target, shape.frame)

    // The visitor's pushes, each held for a moment; a drag turns the cup at once.
    for (const input of takeCupInputs()) {
      if (input.turn) yaw.current += input.turn
      if (input.tilt || input.spin || input.splash) pushes.current.push({ input, until: clock.current + PUSH_SECONDS })
    }
    pushes.current = pushes.current.filter((push) => push.until > clock.current)
    const held: CupInput = {}
    for (const { input } of pushes.current) {
      if (input.tilt) held.tilt = [(held.tilt?.[0] ?? 0) + input.tilt[0], (held.tilt?.[1] ?? 0) + input.tilt[1]]
      if (input.spin) held.spin = (held.spin ?? 0) + input.spin
      if (input.splash) held.splash = (held.splash ?? 0) + input.splash
    }
    const before = state.current
    state.current = step(before, held, dt)
    yaw.current += state.current.spin * dt
    const moving =
      pushes.current.length > 0 ||
      Math.abs(state.current.spin) > 0.01 ||
      state.current.slosh > 0.004 ||
      Math.hypot(...state.current.tilt) > 0.002
    if (tilt.current) tilt.current.rotation.set(state.current.tilt[1], 0, -state.current.tilt[0])
    if (spin.current) spin.current.rotation.y = yaw.current
    if (state.current.tilt[0] !== 0 || state.current.tilt[1] !== 0) sloshDir.set(state.current.tilt[0], state.current.tilt[1]).normalize()

    // The coffee: its look for the journey, or under reduced motion its chapter's, faded in.
    const wanted = still ? chapterLook(progress) : liquidLook(progress)
    let look = wanted
    if (still && shown.current) {
      const t = Math.min(1, dt / STILL_FADE_SECONDS)
      look = blendLooks(shown.current, wanted, t)
    }
    const fading = still && shown.current !== null && !sameLook(look, wanted)
    shown.current = look
    const uniforms = (surface.current?.material as typeof liquid.material | undefined)?.userData.uniforms
    if (!uniforms) return
    applyLook(uniforms, look)
    uniforms.uTime.value = reduced ? 0 : frame.clock.elapsedTime
    uniforms.uSlosh.value = state.current.slosh
    uniforms.uSloshDir.value.copy(sloshDir)
    uniforms.uArtAngle.value = -model.handleAngle
    if (surface.current) {
      const height = shape.levelHeight(look.level)
      const scale = shape.wallRadiusAt(height) / shape.brimRadius
      surface.current.position.y = height
      surface.current.scale.set(scale, 1, scale)
    }
    if (pour.current) {
      // The stream thins a little as the pour eases off, and its end lifts out of the cup as it stops.
      pour.current.visible = look.pour > 0.01
      const width = 0.55 + 0.45 * look.pour
      pour.current.scale.set(width, 1, width)
      // The stream lands at the base of the art (see the liquid shader), turned with the handle.
      const height = shape.levelHeight(look.level)
      const reach = 0.34 * shape.wallRadiusAt(height)
      const lift = (1 - look.pour) * 2.2
      pour.current.position.set(reach * Math.sin(model.handleAngle), height + lift, -reach * Math.cos(model.handleAngle))
      pour.current.rotation.z = reduced ? 0 : Math.sin(frame.clock.elapsedTime * 1.7) * 0.01
    }

    // Night or day, stepped over the scene's duration.
    night.current = reduced ? (isNight ? 1 : 0) : stepNight(night.current, isNight ? 1 : 0, dt * 1000, durationMs)
    const n = night.current
    if (key.current) {
      key.current.color.copy(LIGHT.day.key).lerp(LIGHT.night.key, n)
      key.current.intensity = LIGHT.day.keyIntensity + (LIGHT.night.keyIntensity - LIGHT.day.keyIntensity) * n
    }
    if (fill.current) {
      fill.current.color.copy(LIGHT.day.fill).lerp(LIGHT.night.fill, n)
      fill.current.intensity = LIGHT.day.fillIntensity + (LIGHT.night.fillIntensity - LIGHT.day.fillIntensity) * n
    }
    if (rim.current) rim.current.intensity = LIGHT.day.rim + (LIGHT.night.rim - LIGHT.day.rim) * n
    frame.scene.environmentIntensity = LIGHT.day.room + (LIGHT.night.room - LIGHT.day.room) * n

    // Draw, once warm: textures go up one a frame first.
    if (warm === 'uploading') {
      const next = uploads.current.shift()
      if (next) frame.gl.initTexture(next)
      else setWarm('ready')
      invalidate()
      return
    }
    if (warm !== 'ready') return
    frame.gl.render(frame.scene, frame.camera)
    ready()
    if (frame.frameloop === 'demand' && (moving || fading)) invalidate()
  }, 1)

  // A still canvas draws again when the journey, the clock or the switch changes.
  useEffect(() => {
    if (!reduced) return
    return journeyProgress.subscribe(invalidate)
  }, [reduced, invalidate])
  const grade = isNight ? 'night' : 'day'
  useEffect(() => {
    if (grade) invalidate()
  }, [grade, invalidate])

  const shadowSize = tier === 'high' ? 2048 : 1024

  return (
    <>
      <spotLight
        ref={key}
        position={[-2.4, 4.6, 1.8]}
        angle={0.55}
        penumbra={0.85}
        decay={2}
        castShadow={tier !== 'low'}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={6}
      />
      <directionalLight ref={fill} position={[3.2, 1.4, -1.8]} />
      <directionalLight ref={rim} position={[0.4, 2.2, -3.4]} color="#9fb2dc" />
      <group ref={tilt}>
        <group ref={spin}>
          <primitive object={model.scene} />
          <mesh
            rotation-x={-Math.PI / 2}
            position-y={model.seat.height - SEAT_DROP * model.rimHeight}
            scale={model.seat.radius * SEAT_OVERLAP}
            receiveShadow
          >
            <circleGeometry args={[1, 96]} />
            <meshPhysicalMaterial map={seat} roughness={0.45} clearcoat={0.6} clearcoatRoughness={0.15} />
          </mesh>
          <mesh ref={surface} geometry={liquid.geometry} material={liquid.material} receiveShadow />
          <mesh ref={pour} geometry={stream.geometry} material={stream.material} visible={false} castShadow />
        </group>
      </group>
      {/* The table: only the shadows on it are drawn, over the page behind the canvas. */}
      <mesh ref={ground} rotation-x={-Math.PI / 2} position-y={0.001} material={table} receiveShadow>
        <planeGeometry args={[8, 8]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.0015} scale={shape.saucerRadius * 2.5}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={contact} transparent opacity={0.6} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}

function sameLook(a: LiquidLook, b: LiquidLook): boolean {
  return (
    Math.abs(a.crema - b.crema) < 1e-3 &&
    Math.abs(a.milk - b.milk) < 1e-3 &&
    Math.abs(a.art - b.art) < 1e-3 &&
    Math.abs(a.cool - b.cool) < 1e-3 &&
    Math.abs(a.level - b.level) < 1e-3 &&
    Math.abs(a.pour - b.pour) < 1e-3 &&
    Math.abs(a.swirl - b.swirl) < 1e-3
  )
}

function blendLooks(a: LiquidLook, b: LiquidLook, t: number): LiquidLook {
  const mix = (x: number, y: number) => x + (y - x) * t
  return {
    coffee: [mix(a.coffee[0], b.coffee[0]), mix(a.coffee[1], b.coffee[1]), mix(a.coffee[2], b.coffee[2])],
    crema: mix(a.crema, b.crema),
    milk: mix(a.milk, b.milk),
    swirl: mix(a.swirl, b.swirl),
    pour: mix(a.pour, b.pour),
    art: mix(a.art, b.art),
    cool: mix(a.cool, b.cool),
    level: mix(a.level, b.level),
  }
}

interface Shape {
  /** The height the camera looks at, and the distance that frames the whole cup and saucer. */
  centreY: number
  frame: number
  /** The inside radius at the highest level the coffee reaches. */
  brimRadius: number
  saucerRadius: number
  wallRadiusAt: (height: number) => number
  /** The coffee's height for a level, 0 (the model's own coffee) to 1 (full). */
  levelHeight: (level: number) => number
}

function useShape(model: CupModel): Shape {
  return useMemo(() => {
    const { scene, liquidHeight, rimHeight, wallRadiusAt } = model
    let radius = 0
    let saucerRadius = 0
    scene.updateMatrixWorld(true)
    const point = new Vector3()
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const position = object.geometry.getAttribute('position')
      for (let index = 0; index < position.count; index++) {
        point.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld)
        saucerRadius = Math.max(saucerRadius, Math.hypot(point.x, point.z))
      }
    })
    const centreY = rimHeight / 2
    radius = Math.hypot(saucerRadius, rimHeight / 2)
    // A little above the modelled crema at the lowest, and short of the brim at the highest.
    const lowest = liquidHeight + 0.006 * rimHeight
    const highest = rimHeight * (1 - BRIM_MARGIN)
    const levelHeight = (level: number) => lowest + (highest - lowest) * Math.min(1, Math.max(0, level))
    return {
      centreY,
      frame: radius / Math.sin((FOV * Math.PI) / 360),
      brimRadius: wallRadiusAt(highest),
      saucerRadius,
      wallRadiusAt,
      levelHeight,
    }
  }, [model])
}
