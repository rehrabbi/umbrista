import type { CupInput } from './physics'

/*
 * The visitor's moves on the hero cup, from the page (buttons, keys, dragging) to the scene inside
 * the canvas, which lives in its own React tree. The page pushes; the scene takes them on its next
 * frame. Listeners let an idle canvas (one drawn only on demand) wake up for a move.
 */
const queue: CupInput[] = []
const listeners = new Set<() => void>()

export function pushCupInput(input: CupInput): void {
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
  }
}
