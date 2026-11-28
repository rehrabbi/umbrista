import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Group, type PerspectiveCamera, type SpotLight } from 'three'
import { DRINKS, type MenuItem } from '../../shared/menu'
import { useSceneReady } from '../scene/scene-ready'
import {
  barProgress,
  clearDrawnDrinks,
  drinkPose,
  drinkTurn,
  liveDrinks,
  onDrinkTurn,
  setDrinkDrawn,
  useDrinkOnScreen,
  type DrinkPose,
} from './barProgress'
import { MENU_LIGHT, ReadyAfterFrame, smooth, uploadTextures, useNightRoom } from './sceneParts'
import { useDrinkModel } from './useDrinkModel'

/*
 * The bar's scene: the drink on screen, and its neighbours ready on either side, each its full
 * model. As the visitor scrolls, each drink rises into view, turns, settles under the lamp (which
 * comes up as it does) and leaves upwards. The page writes the scroll into `barProgress`; the
 * drinks read it every frame, so a scroll frame re-renders nothing. Which models are loaded changes
 * only once the visitor has settled on a drink for SETTLE_MS, so a flick down the bar, or a jump
 * from the counter, loads only where it lands, not every drink it passes. It draws only when the
 * scroll or a turn moves something.
 *
 * There is no pour (owner ruling, 2026-11-27, on the hero cup: no visible milk "stick"); a drink
 * rising, turning and warming under the lamp stands in for "pours or fills".
 */

/** A long, quiet lens, as for the hero cup. */
export const FOV = 26
/**
 * The camera looks down at 27 degrees, so the coffee's surface shows (Last Tram's crema, Lantern's
 * rosetta) while a tall glass still stands, not foreshortened into a disc.
 */
export const ELEVATION = (27 * Math.PI) / 180
/**
 * What the camera must fit around a drink (at most one unit on its largest side), in scene units,
 * seen from above: a unit-tall glass shows cos(27°) + its depth × sin(27°) tall, about 1.2 for the
 * tallest, and the widest bowl about one unit across.
 */
const FRAME_HEIGHT = 1.45
const FRAME_WIDTH = 1.25
/** The point the camera looks at: a little under half a unit-tall drink, as it is seen from above. */
const TARGET_Y = 0.42
/** How quickly a drink catches up with its angle (per second; higher is quicker). */
const TURN_EASE = 7
/** The lamp over the bar: its strength with no drink settled, and what a settled drink adds. */
const LAMP_LOW = 20
const LAMP_FULL = 56
/** How long the visitor must stay on a drink before the models around it change. */
export const SETTLE_MS = 150

function BarDrink({ item, index }: { item: MenuItem; index: number }) {
  const model = useDrinkModel(item.model!, 'full')
  const get = useThree((state) => state.get)
  const pose = useRef<DrinkPose>({ y: 0, angle: 0, visible: false })
  const angle = useRef<number | null>(null)
  // The group the scroll and the turns move: the drink's own model sits inside it untouched.
  const [holder] = useState(() => new Group())

  // Up to the GPU now, while it waits beside the screen, not on the frame it rises into view.
  useEffect(() => uploadTextures(get().gl, model), [get, model])
  // Its section shows its still again once it leaves the scene.
  useEffect(() => () => setDrinkDrawn(item.id, false), [item.id])

  // Moving three objects outside React, in effects and every frame, is the point of the frame loop;
  // the group is made once and never read during render.
  /* oxlint-disable react/immutability */
  useEffect(() => {
    holder.add(model)
    return () => {
      holder.remove(model)
    }
  }, [holder, model])

  useFrame((frame, delta) => {
    const { y, angle: goal, visible } = drinkPose(barProgress.get(), index, drinkTurn(item.id), pose.current)
    const current = angle.current === null ? goal : angle.current + (goal - angle.current) * (1 - Math.exp(-delta * TURN_EASE))
    angle.current = current
    holder.position.y = y
    holder.rotation.y = current
    holder.visible = visible
    if (visible && Math.abs(goal - current) > 1e-3) frame.invalidate()
  })
  /* oxlint-enable react/immutability */

  return <primitive object={holder} />
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
  return <spotLight ref={lamp} position={[-1.2, 3.4, 1.6]} color={MENU_LIGHT.key} angle={0.5} penumbra={0.85} decay={2} />
}

/** The drink on screen once the visitor has stayed on it for SETTLE_MS. */
function useSettledDrink(): number {
  const onScreen = useDrinkOnScreen(DRINKS.length)
  const [settled, setSettled] = useState(onScreen)
  useEffect(() => {
    if (onScreen === settled) return
    const timer = setTimeout(() => setSettled(onScreen), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [onScreen, settled])
  return settled
}

export default function BarScene() {
  const ready = useSceneReady()
  const settled = useSettledDrink()
  const get = useThree((state) => state.get)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)

  useNightRoom(MENU_LIGHT.room)

  // Frame one drink, standing at the origin, from above, whatever the canvas's shape.
  useEffect(() => {
    const camera = get().camera as PerspectiveCamera
    const aspect = size.width / Math.max(1, size.height)
    const tan = Math.tan((FOV * Math.PI) / 360)
    const distance = Math.max(FRAME_HEIGHT / (2 * tan), FRAME_WIDTH / (2 * tan * aspect))
    camera.fov = FOV
    camera.near = 0.05
    camera.far = distance * 6
    camera.position.set(0, TARGET_Y + distance * Math.sin(ELEVATION), distance * Math.cos(ELEVATION))
    camera.lookAt(0, TARGET_Y, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [get, size.width, size.height, invalidate])

  // Scrolling and turning wake the scene; otherwise it stays still and draws nothing.
  useEffect(() => barProgress.subscribe(invalidate), [invalidate])
  useEffect(() => onDrinkTurn(invalidate), [invalidate])
  useEffect(() => () => clearDrawnDrinks(), [])

  return (
    <>
      <hemisphereLight args={[MENU_LIGHT.sky, MENU_LIGHT.ground, MENU_LIGHT.ambient]} />
      <directionalLight position={[2.6, 1.2, -1.6]} color={MENU_LIGHT.fill} intensity={MENU_LIGHT.fillIntensity} />
      <directionalLight position={[0.3, 2, -3]} color={MENU_LIGHT.rim} intensity={MENU_LIGHT.rimIntensity} />
      <Lamp />
      {liveDrinks(settled + 0.5, DRINKS.length).map((index) => {
        const drink = DRINKS[index]!
        return (
          <Suspense key={drink.id} fallback={null}>
            <BarDrink item={drink} index={index} />
            <DrawnSignal id={drink.id} onFirst={ready} />
          </Suspense>
        )
      })}
    </>
  )
}

/** Marks a drink drawn after its first frame (and tells the host, which fades the canvas in once). */
function DrawnSignal({ id, onFirst }: { id: string; onFirst: () => void }) {
  const onReady = useCallback(() => {
    onFirst()
    setDrinkDrawn(id, true)
  }, [id, onFirst])
  return <ReadyAfterFrame onReady={onReady} />
}
