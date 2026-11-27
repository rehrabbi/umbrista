import { useSyncExternalStore } from 'react'

/*
 * How far the visitor is through the scroll journey (see chapters.ts for the units). The landing's
 * scroll choreography writes it; the scene inside the canvas reads it. It lives outside React so
 * a scroll frame re-renders only the scene that reads it, never the page around it.
 */
let value = 0
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const journeyProgress = {
  get: (): number => value,
  set(next: number): void {
    if (next === value || Number.isNaN(next)) return
    value = next
    for (const listener of listeners) listener()
  },
  subscribe,
}

export function useJourneyProgress(): number {
  return useSyncExternalStore(subscribe, journeyProgress.get, journeyProgress.get)
}
