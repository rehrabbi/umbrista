import { useSyncExternalStore } from 'react'
import type { CupInput } from './physics'

/*
 * The visitor's moves on the hero cup, from the page (buttons, keys, dragging) to the scene inside
 * the canvas, which lives in its own React tree. The page pushes; the scene takes them on its next
 * frame. A move made while no scene is listening is dropped, so nothing piles up to play all at
 * once when the cup arrives. Listeners let an idle canvas (one drawn only on demand) wake up.
 */
const queue: CupInput[] = []
const listeners = new Set<() => void>()

export function pushCupInput(input: CupInput): void {
  if (listeners.size === 0) return
  queue.push(input)
  for (const listener of listeners) listener()
}

/** Everything pushed since the last call, oldest first. */
export function takeCupInputs(): CupInput[] {
  return queue.splice(0, queue.length)
}

export function onCupInput(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) queue.length = 0
  }
}

/*
 * Whether the live cup is on screen: set by the scene once it has drawn, cleared when it goes. The
 * page shows the cup's controls only then, since a still cannot be played with.
 */
let live = false
const liveListeners = new Set<() => void>()

export function setCupLive(next: boolean): void {
  if (next === live) return
  live = next
  for (const listener of liveListeners) listener()
}

function subscribeLive(listener: () => void): () => void {
  liveListeners.add(listener)
  return () => {
    liveListeners.delete(listener)
  }
}

const getLive = () => live

export function useCupLive(): boolean {
  return useSyncExternalStore(subscribeLive, getLive, getLive)
}
