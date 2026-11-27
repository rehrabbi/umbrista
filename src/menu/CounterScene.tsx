import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Object3D, type Group, type PerspectiveCamera, type SpotLight } from 'three'
import { DRINKS, type MenuItem } from '../../shared/menu'
import { useSceneReady } from '../scene/scene-ready'
import { counterView, onCounterView } from './barProgress'
import { ReadyAfterFrame, useNightRoom } from './sceneParts'
import { preloadDrinkModel, useDrinkModel } from './useDrinkModel'

/*
 * The counter's scene: every drink's light model standing in a row under the lamp, each under its
 * place in the page's listbox. The scene works in CSS pixels: the camera is set so that the plane
 * through the drinks shows exactly the canvas, so a drink stands where its place's centre is,
 * however the row is scrolled. It draws only when the row moves or the lamp is still travelling.
 */

/** A long lens, so the row stays nearly flat and lines up with the places in the page. */
const FOV = 18
/** How much of a place's width, and of the canvas's height, a drink may take. */
const PLACE_FILL = 0.74
const HEIGHT_FILL = 0.6
/** Where the counter's top is, from the bottom of the canvas, as a fraction of its height. */
const FLOOR = 0.3
/** Drinks lean back a little, to show their tops, and turn a little, to show their sides. */
const LEAN = 0.16
const TURN = 0.4
/** How quickly the lamp travels to the chosen drink (per second; higher is quicker). */
const LAMP_EASE = 7

function CounterDrink({ item, index }: { item: MenuItem; index: number }) {
  const model = useDrinkModel(item.model!, 'lite')
  const place = useRef<Group>(null)
  const size = useThree((state) => state.size)

  useFrame(() => {
    const group = place.current
    if (!group) return
    const view = counterView
    const width = view.width || size.width
    group.position.x = view.first + index * view.pitch - view.scroll - width / 2
    group.position.y = -size.height / 2 + FLOOR * size.height
    group.scale.setScalar(Math.min(view.pitch * PLACE_FILL, size.height * HEIGHT_FILL))
  })

  return (
    <group ref={place} rotation-x={LEAN}>
      <primitive object={model} rotation-y={TURN} />
    </group>
  )
}

/** The lamp over the counter: it travels along the row to the drink the visitor has chosen. */
function Lamp() {
  const lamp = useRef<SpotLight>(null)
  const target = useMemo(() => new Object3D(), [])
  const x = useRef<number | null>(null)
  const size = useThree((state) => state.size)

  useFrame((frame, delta) => {
    const light = lamp.current
    if (!light) return
    const view = counterView
    const goal = view.first + view.active * view.pitch - view.scroll - (view.width || size.width) / 2
    x.current = x.current === null ? goal : x.current + (goal - x.current) * (1 - Math.exp(-delta * LAMP_EASE))
    const floor = -size.height / 2 + FLOOR * size.height
    light.position.set(x.current, size.height * 0.9, size.height * 0.5)
    target.position.set(x.current, floor, 0)
    target.updateMatrixWorld()
    if (Math.abs(goal - x.current) > 0.5) frame.invalidate()
  })

  return (
    <>
      <primitive object={target} />
      <spotLight ref={lamp} target={target} color="#ffb062" intensity={9} angle={0.32} penumbra={0.9} decay={0} />
    </>
  )
}

// All of them at once, as soon as the scene's code arrives, so they load side by side rather than
// one after another.
for (const drink of DRINKS) preloadDrinkModel(drink.model!, 'lite')

export default function CounterScene() {
  const ready = useSceneReady()
  const get = useThree((state) => state.get)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)

  useNightRoom(0.6)

  // The camera that maps the drinks' plane onto the canvas pixel for pixel.
  useEffect(() => {
    const camera = get().camera as PerspectiveCamera
    const distance = size.height / 2 / Math.tan((FOV * Math.PI) / 360)
    camera.fov = FOV
    camera.near = distance / 10
    camera.far = distance * 4
    camera.position.set(0, 0, distance)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [get, size.height, invalidate])

  // The row scrolled, the page laid out again, or another drink was chosen.
  useEffect(() => onCounterView(invalidate), [invalidate])

  return (
    <>
      <hemisphereLight args={['#9fb2dc', '#0d1524', 0.7]} />
      <directionalLight position={[-400, 300, 600]} color="#c9d6ee" intensity={0.5} />
      <Lamp />
      <Suspense fallback={null}>
        {DRINKS.map((drink, index) => (
          <CounterDrink key={drink.id} item={drink} index={index} />
        ))}
        <ReadyAfterFrame onReady={ready} />
      </Suspense>
    </>
  )
}
