import { createContext, useContext } from 'react'
import type { Quality } from './quality'

/**
 * The quality the host chose for its canvas, for the effects drawn inside it. Null outside a
 * SceneHost. It is provided inside the Canvas, so it reaches R3F's own React tree directly.
 */
export const SceneQualityContext = createContext<Quality | null>(null)

export function useSceneQuality(): Quality | null {
  return useContext(SceneQualityContext)
}
