import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef } from 'react'
import type { Group, PerspectiveCamera, SpotLight } from 'three'
import { DRINKS, type MenuItem } from '../../shared/menu'
import { useSceneReady } from '../scene/scene-ready'
import {
  barProgress,
  drinkPose,
  drinkTurn,
  liveDrinks,
  onDrinkTurn,
  setBarLive,
  useDrinkOnScreen,
  type DrinkPose,
} from './barProgress'
import { ReadyAfterFrame, smooth, uploadTextures, useNightRoom } from './sceneParts'
import { useDrinkModel } from './useDrinkModel'

/*
 * The bar's scene: the drink on screen, and its neighbours ready on either side, each its full
 * model. As the visitor scrolls, each drink rises into view, turns, settles under the lamp (which
 * comes up as it does) and leaves upwards. The page writes the scroll into `barProgress`; the
 * drinks read it every frame, so a scroll frame re-renders nothing. React renders again only when
 * another drink comes on screen, to change which models are loaded. It draws only when the scroll
 * or a turn moves something.
 */

/** A long, quiet lens, as for the hero cup. */
const FOV = 26
/** What the camera must fit around a drink (at most one unit on its largest side), in scene units. */
const FRAME_HEIGHT = 1.4
const FRAME_WIDTH = 1.25
/** How quickly a drink catches up with its angle (per second; higher is quicker). */
const TURN_EASE = 7
/** The lamp over the bar: its strength with no drink settled, and what a settled drink adds. */
const LAMP_LOW = 14
const LAMP_FULL = 48

function BarDrink({ item, index }: { item: MenuItem; index: number }) {
  const model = useDrinkModel(item.model!, 'full')
  const get = useThree((state) => state.get)
  const pose = useRef<DrinkPose>({ y: 0, angle: 0, visible: false })
  const angle = useRef<number | null>(null)
  const holder = useRef<Group>(null)

  // Up to the GPU now, while it waits beside the screen, not on the frame it rises into view.
  useEffect(() => uploadTextures(get().gl, model), [get, model])

  useFrame((frame, delta) => {
    const group = holder.current
    if (!group) return
    const { y, angle: goal, visible } = drinkPose(barProgress.get(), index, drinkTurn(item.id), pose.current)
    const current = angle.current === null ? goal : angle.current + (goal - angle.current) * (1 - Math.exp(-delta * TURN_EASE))
    angle.current = current
    group.position.y = y
    group.rotation.y = current
    group.visible = visible
    if (visible && Math.abs(goal - current) > 1e-3) frame.invalidate()
  })

  return (
    <group ref={holder}>
      <primitive object={model} />
    </group>
  )
}

/** The lamp over the bar comes up as a drink settles in the middle of the screen. */
function Lamp() {
  const lamp = useRef<SpotLight>(null)
  useFrame(() => {
    const light = lamp.current
    if (!light) return
    const progress = barProgress.get()
    const settled = 1 - smooth(Math.abs(progress - Math.floor(progress) - 0.5) / 0.5)
    light.intensity = LAMP_LOW + (LAMP_FULL - LAMP_LOW) * settled
  })
  return <spotLight ref={lamp} position={[-1.2, 3.4, 1.6]} color="#ffb062" angle={0.5} penumbra={0.85} decay={2} />
}

export default function BarScene() {
  const ready = useSceneReady()
  const onScreen = useDrinkOnScreen(DRINKS.length)
  const get = useThree((state) => state.get)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)

  useNightRoom(0.8)

  // Frame one drink, standing at the origin, whatever the canvas's shape.
  useEffect(() => {
    const camera = get().camera as PerspectiveCamera
    const aspect = size.width / Math.max(1, size.height)
    const tan = Math.tan((FOV * Math.PI) / 360)
    const distance = Math.max(FRAME_HEIGHT / (2 * tan), FRAME_WIDTH / (2 * tan * aspect))
    camera.fov = FOV
    camera.near = 0.05
    camera.far = distance * 6
    camera.position.set(0, 0.62, distance)
    camera.lookAt(0, 0.5, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [get, size.width, size.height, invalidate])

  // Scrolling and turning wake the scene; otherwise it stays still and draws nothing.
  useEffect(() => barProgress.subscribe(invalidate), [invalidate])
  useEffect(() => onDrinkTurn(invalidate), [invalidate])
  useEffect(() => () => setBarLive(false), [])

  const drawn = useCallback(() => {
    ready()
    setBarLive(true)
  }, [ready])

  return (
    <>
      <hemisphereLight args={['#9fb2dc', '#0d1524', 0.5]} />
      <directionalLight position={[2.6, 1.2, -1.6]} color="#c9d6ee" intensity={0.6} />
      <directionalLight position={[0.3, 2, -3]} color="#9fb2dc" intensity={0.9} />
      <Lamp />
      {liveDrinks(onScreen + 0.5, DRINKS.length).map((index) => {
        const drink = DRINKS[index]!
        return (
          <Suspense key={drink.id} fallback={null}>
            <BarDrink item={drink} index={index} />
            {index === onScreen && <ReadyAfterFrame onReady={drawn} />}
          </Suspense>
        )
      })}
    </>
  )
}
