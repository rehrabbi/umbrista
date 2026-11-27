import { use, useEffect, useMemo } from 'react'
import { Box3, Group, Mesh, Vector3, type Material, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { CUP_URL } from '../scene/cup/useCupModel'
import { texturesOf } from './sceneParts'

/*
 * The menu's drink models: a full one for the bar (public/models/drinks/<model>.glb, at most 1.5 MB)
 * and a light one for the counter (<model>-lite.glb, at most 400 KB), built by `npm run models`.
 * Last Tram is the hero cup (model `cup`): the bar draws the cup itself, the counter its light
 * version, cup-lite.glb.
 *
 * The menu keeps its own cache, apart from drei's (which holds the landing's hero cup), so freeing
 * a menu model can never take anything from the landing, even the same file. A model loads the
 * first time a scene asks for it (the scene suspends until then), once; DISPOSE_AFTER_MS after the
 * last scene drawing it lets go, or after a load lands with nobody waiting for it (the visitor has
 * moved on), its geometry, materials and textures are freed and it is forgotten, to load again if
 * it is wanted. Decoded with three's own meshopt decoder, bundled with the site: nothing is fetched
 * from another origin.
 */

export type DrinkDetail = 'full' | 'lite'

/** How long a model nobody draws is kept, so flicking back and forth along the bar never reloads it. */
export const DISPOSE_AFTER_MS = 8000

export function drinkModelUrl(model: string, detail: DrinkDetail): string {
  if (model === 'cup') return detail === 'lite' ? '/models/cup-lite.glb' : CUP_URL
  return detail === 'lite' ? `/models/drinks/${model}-lite.glb` : `/models/drinks/${model}.glb`
}

interface Entry {
  promise: Promise<Group>
  scene: Group | null
  /** Mounted scenes drawing it. */
  users: number
  timer?: ReturnType<typeof setTimeout>
}

const entries = new Map<string, Entry>()
let loader: GLTFLoader | null = null

function gltfLoader(): GLTFLoader {
  loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  return loader
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

/** Free the model DISPOSE_AFTER_MS from now, unless a scene takes it up again before then. */
function arm(url: string, entry: Entry): void {
  clearTimeout(entry.timer)
  entry.timer = setTimeout(() => {
    if (entry.users > 0 || entries.get(url) !== entry) return
    entries.delete(url)
    if (entry.scene) dispose(entry.scene)
  }, DISPOSE_AFTER_MS)
}

function entryFor(url: string): Entry {
  const known = entries.get(url)
  if (known) return known
  const entry: Entry = { promise: Promise.resolve(new Group()), scene: null, users: 0 }
  entry.promise = gltfLoader()
    .loadAsync(url)
    .then((gltf) => {
      entry.scene = gltf.scene
      if (entry.users === 0) arm(url, entry)
      return gltf.scene
    })
  // A failed load is forgotten, so a later visit can try again; the scene's error boundary shows the stills.
  entry.promise.catch(() => {
    if (entries.get(url) === entry) entries.delete(url)
  })
  entries.set(url, entry)
  return entry
}

function retain(url: string): void {
  const entry = entryFor(url)
  entry.users++
  clearTimeout(entry.timer)
}

function release(url: string): void {
  const entry = entries.get(url)
  if (!entry) return
  entry.users = Math.max(0, entry.users - 1)
  if (entry.users === 0) arm(url, entry)
}

/** Each loaded model's bounds: measured once, since its geometry never changes. */
const boxes = new WeakMap<Object3D, Box3>()

/**
 * A drink's model, standing on y = 0, centred on its axis, and scaled so its largest side (its
 * height, or the width of a wide cup or bowl) is one unit, so every drink and the cup take the same
 * place in a scene. Suspends until it has loaded. Each caller gets its own copy of the model's nodes
 * (one object can only be drawn in one place) sharing the loaded geometry, materials and textures.
 */
export function useDrinkModel(model: string, detail: DrinkDetail): Group {
  const url = drinkModelUrl(model, detail)
  const scene = use(entryFor(url).promise)

  const drink = useMemo(() => {
    let box = boxes.get(scene)
    if (!box) {
      scene.updateMatrixWorld(true)
      box = new Box3().setFromObject(scene)
      boxes.set(scene, box)
    }
    const centre = box.getCenter(new Vector3())
    const extent = Math.max(1e-6, box.max.y - box.min.y, box.max.x - box.min.x, box.max.z - box.min.z)
    const copy = scene.clone(true)
    copy.position.set(copy.position.x - centre.x, copy.position.y - box.min.y, copy.position.z - centre.z)
    const holder = new Group()
    holder.add(copy)
    holder.scale.setScalar(1 / extent)
    return holder
  }, [scene])

  useEffect(() => {
    retain(url)
    return () => release(url)
  }, [url])

  return drink
}

/** Start loading a model before a scene asks for it. Freed later if no scene ever does. */
export function preloadDrinkModel(model: string, detail: DrinkDetail): void {
  entryFor(drinkModelUrl(model, detail))
}

/** Test-only: forget every model, without freeing anything. */
export function resetDrinkModels(): void {
  for (const entry of entries.values()) clearTimeout(entry.timer)
  entries.clear()
}
