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

/** The room's reflections for the glazes and glass: the same night room as the hero cup's. */
export function useNightRoom(intensity: number): void {
  const get = useThree((state) => state.get)
  useEffect(() => {
    const { gl, scene } = get()
    const environment = nightRoom(gl as WebGLRenderer)
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
