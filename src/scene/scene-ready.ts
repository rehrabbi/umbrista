import { createContext, useContext } from 'react'

const NOTHING = () => {}

/**
 * Tells the SceneHost that its scene has drawn its first frame, so the canvas can fade in over the
 * still now and not over a blank frame. Provided inside the Canvas, like the scene quality.
 */
export const SceneReadyContext = createContext<() => void>(NOTHING)

/** The function a scene calls once it has drawn. Calling it again does nothing. */
export function useSceneReady(): () => void {
  return useContext(SceneReadyContext)
}
