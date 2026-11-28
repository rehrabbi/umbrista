import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Group, Object3D, SpotLight, type PerspectiveCamera } from 'three'
import { DRINKS, type MenuItem } from '../../shared/menu'
import { useSceneReady } from '../scene/scene-ready'
import { counterView, onCounterView } from './barProgress'
import { MENU_LIGHT, ReadyAfterFrame, useNightRoom } from './sceneParts'
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
/**
 * Each drink leans back 27 degrees, which is how it looks from a camera 27 degrees above it, as in
 * the bar, so the coffee's surface shows. Leaning the drinks, not the camera, keeps the row mapped
 * onto the page pixel for pixel; with a lens this long the difference cannot be seen. They also turn
 * a little, to show their sides.
 */
const LEAN = (27 * Math.PI) / 180
const TURN = 0.4
/** How quickly the lamp travels to the chosen drink (per second; higher is quicker). */
const LAMP_EASE = 7

/** Where drink `index` stands, in the scene's CSS pixels: under its place's centre, on the counter. */
export function counterPlace(index: number, view: typeof counterView, size: { width: number; height: number }) {
  return {
    x: view.first + index * view.pitch - view.scroll - (view.width || size.width) / 2,
    y: -size.height / 2 + FLOOR * size.height,
    scale: Math.min(view.pitch * PLACE_FILL, size.height * HEIGHT_FILL),
  }
}

/** One drink's place: a group leant back (the view from above) holding a group turned to show its side. */
function makePlace(): Group {
  const place = new Group()
  place.rotation.x = LEAN
  const turn = new Group()
  turn.rotation.y = TURN
  place.add(turn)
  return place
}

function CounterDrink({ item, index }: { item: MenuItem; index: number }) {
  const model = useDrinkModel(item.model!, 'lite')
  const [place] = useState(makePlace)
  const size = useThree((state) => state.size)

  // Three objects move outside React, in an effect and every frame; the group is made once and
  // never read during render.
  /* oxlint-disable react/immutability */
  useEffect(() => {
    const turn = place.children[0]!
    turn.add(model)
    return () => {
      turn.remove(model)
    }
  }, [place, model])

  useFrame(() => {
    const { x, y, scale } = counterPlace(index, counterView, size)
    place.position.x = x
    place.position.y = y
    place.scale.setScalar(scale)
  })
  /* oxlint-enable react/immutability */

  return <primitive object={place} />
}

/** The lamp over the counter: it travels along the row to the drink the visitor has chosen. */
function makeLamp(): SpotLight {
  // No falloff (decay 0): the scene is in pixels, so a physical falloff would need absurd numbers.
  const lamp = new SpotLight(MENU_LIGHT.key, 10, 0, 0.32, 0.9, 0)
  lamp.target = new Object3D()
  return lamp
}

function Lamp() {
  const [light] = useState(makeLamp)
  const x = useRef<number | null>(null)
  const size = useThree((state) => state.size)

  useFrame((frame, delta) => {
    const target = light.target
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
      <primitive object={light.target} />
      <primitive object={light} />
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

  useNightRoom(MENU_LIGHT.room)

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
      {/* The menu's light (sceneParts.tsx); the lamp here has no falloff, as the scene is in pixels. */}
      <hemisphereLight args={[MENU_LIGHT.sky, MENU_LIGHT.ground, MENU_LIGHT.ambient]} />
      <directionalLight position={[-400, 300, 600]} color={MENU_LIGHT.fill} intensity={MENU_LIGHT.fillIntensity} />
      <directionalLight position={[0, 300, -600]} color={MENU_LIGHT.rim} intensity={MENU_LIGHT.rimIntensity} />
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
