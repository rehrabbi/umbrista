import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { Box3, Group, Mesh, Vector3, type Material, type Object3D } from 'three'
import { CUP_URL, withLocalDecoders } from '../scene/cup/useCupModel'
import { texturesOf } from './sceneParts'

/*
 * The menu's drink models: a full one for the bar (public/models/drinks/<model>.glb, at most 1.5 MB)
 * and a light one for the counter (<model>-lite.glb, at most 400 KB), built by `npm run models`.
 * Last Tram is the hero cup (model `cup`), which has one version for both. Each loads only when a
 * scene first asks for it (it suspends until then), once, through the same local meshopt decoder as
 * the cup; and once no scene has used it for DISPOSE_AFTER_MS (the drink has gone well off screen),
 * its geometry, materials and textures are freed and it is forgotten, to load again if it returns.
 */

export type DrinkDetail = 'full' | 'lite'

/** How long a model nobody draws is kept, so flicking back and forth along the bar never reloads it. */
export const DISPOSE_AFTER_MS = 8000

export function drinkModelUrl(model: string, detail: DrinkDetail): string {
  if (model === 'cup') return CUP_URL
  return detail === 'lite' ? `/models/drinks/${model}-lite.glb` : `/models/drinks/${model}.glb`
}

/** How many mounted scenes use each URL, and the pending disposal of those nobody uses. */
const users = new Map<string, number>()
const pending = new Map<string, ReturnType<typeof setTimeout>>()

/** Each loaded model's bounds, in its own frame: measured once, since its geometry never changes. */
const boxes = new WeakMap<Object3D, Box3>()

function retain(url: string): void {
  users.set(url, (users.get(url) ?? 0) + 1)
  clearTimeout(pending.get(url))
  pending.delete(url)
}

function dispose(scene: Object3D): void {
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return
    object.geometry.dispose()
    const materials: Material[] = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      for (const texture of texturesOf(material)) texture.dispose()
      material.dispose()
    }
  })
}

function release(url: string, scene: Object3D): void {
  const left = (users.get(url) ?? 1) - 1
  if (left > 0) {
    users.set(url, left)
    return
  }
  users.delete(url)
  pending.set(
    url,
    setTimeout(() => {
      pending.delete(url)
      if (users.has(url)) return
      dispose(scene)
      useGLTF.clear(url)
    }, DISPOSE_AFTER_MS),
  )
}

/**
 * A drink's model, standing on y = 0, centred on its axis, and scaled so its largest side (its
 * height, or the width of a wide cup or bowl) is one unit, so every drink and the cup take the same
 * place in a scene. Suspends until it has loaded. Each caller gets its own copy
 * of the model's nodes (one object can only be drawn in one place) sharing the loaded geometry,
 * materials and textures.
 */
export function useDrinkModel(model: string, detail: DrinkDetail): Group {
  const url = drinkModelUrl(model, detail)
  const { scene } = useGLTF(url, false, false, withLocalDecoders)

  const drink = useMemo(() => {
    let box = boxes.get(scene)
    if (!box) {
      // In the model's own frame: the hero cup's loader moves the shared scene (useCupModel).
      scene.updateMatrixWorld(true)
      box = new Box3().setFromObject(scene).translate(scene.position.clone().negate())
      boxes.set(scene, box)
    }
    const centre = box.getCenter(new Vector3())
    const extent = Math.max(1e-6, box.max.y - box.min.y, box.max.x - box.min.x, box.max.z - box.min.z)
    const copy = scene.clone(true)
    copy.position.set(-centre.x, -box.min.y, -centre.z)
    const holder = new Group()
    holder.add(copy)
    holder.scale.setScalar(1 / extent)
    return holder
  }, [scene])

  useEffect(() => {
    retain(url)
    return () => release(url, scene)
  }, [url, scene])

  return drink
}

/** Start loading a model before a scene asks for it. */
export function preloadDrinkModel(model: string, detail: DrinkDetail): void {
  useGLTF.preload(drinkModelUrl(model, detail), false, false, withLocalDecoders)
}
