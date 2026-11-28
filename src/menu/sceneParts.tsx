import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Mesh, type Material, type Object3D, type Texture, type WebGLRenderer } from 'three'
import { nightRoom } from '../scene/nightRoom'

/*
 * Pieces the menu's two scenes (the counter and the bar) share. Both draw only on demand: they wake
 * the canvas with `invalidate` when the scroll, the row or a turn moves something, and go quiet again.
 */

/** 0..1, eased at both ends. */
export function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * Calls `onReady` once the scene around it has drawn a frame: it mounts with the drinks (inside the
 * same Suspense boundary), asks for a frame, and on the next one the first has been drawn.
 */
export function ReadyAfterFrame({ onReady }: { onReady: () => void }) {
  const frames = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => invalidate(), [invalidate])
  useFrame(() => {
    if (frames.current >= 2) return
    frames.current++
    if (frames.current === 2) onReady()
    else invalidate()
  })
  return null
}

/*
 * The menu's light (the controller's look on a GPU, 2026-11-28): the landing's orange key against a
 * strong blue fill made white cups and milk a muddy blue-grey and Fog Line rust. Food wants one warm
 * key and a soft, nearly neutral fill. Shared by the bar and the counter; the landing keeps its own.
 *   - Ambient: a warm parchment sky over an umber floor, 0.9, so a white glaze reads as warm
 *     off-white rather than grey where the lamp does not reach.
 *   - Fill: a barely cool grey-blue (#d4dbe6, about a fifth of the old saturation) at 0.35, not 0.6:
 *     it keeps the night's cool edge without tinting milk.
 *   - Rim: #aab6cc at 0.45, half the old strength, so the backs of glasses still separate from the
 *     page.
 *   - Key: the sodium lamp, desaturated from #ffb062 to #ffc78f, so milk drinks read tan, not orange.
 *   - Reflections: the night room with its window panel warm-neutral (0.85, 0.82, 0.78) instead of
 *     blue, at 0.6.
 *   - Exposure: 1.05, a touch brighter than the landing's 0.95.
 */
export const MENU_LIGHT = {
  sky: '#e8dccb',
  ground: '#2b2420',
  ambient: 0.9,
  fill: '#d4dbe6',
  fillIntensity: 0.35,
  rim: '#aab6cc',
  rimIntensity: 0.45,
  key: '#ffc78f',
  pane: [0.85, 0.82, 0.78] as [number, number, number],
  room: 0.6,
  exposure: 1.05,
}

/** The room's reflections for the glazes and glass: the night room, with the menu's warm window. */
export function useNightRoom(intensity: number): void {
  const get = useThree((state) => state.get)
  useEffect(() => {
    const { gl, scene } = get()
    gl.toneMappingExposure = MENU_LIGHT.exposure
    const environment = nightRoom(gl as WebGLRenderer, { pane: MENU_LIGHT.pane })
    if (!environment) return
    scene.environment = environment
    scene.environmentIntensity = intensity
    return () => {
      scene.environment = null
      environment.dispose()
    }
  }, [get, intensity])
}

/** Every texture a material draws with. */
export function texturesOf(material: Material): Texture[] {
  return Object.values(material).filter((value): value is Texture => (value as Texture | null)?.isTexture === true)
}

/**
 * Send a model's textures to the GPU now, while it is still out of view, so the frame it rises into
 * view does not stall on the upload.
 */
export function uploadTextures(gl: Pick<WebGLRenderer, 'initTexture'>, object: Object3D): void {
  object.traverse((node) => {
    if (!(node instanceof Mesh)) return
    const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material]
    for (const material of materials) for (const texture of texturesOf(material)) gl.initTexture(texture)
  })
}
