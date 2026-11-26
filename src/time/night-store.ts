export type Override = 'night' | 'day' | null

type Listener = () => void

// The visitor's choice lives in memory only: it lasts until the page is reloaded and is never stored.
let override: Override = null
const listeners = new Set<Listener>()

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getOverride(): Override {
  return override
}

export function setOverride(next: Override): void {
  if (next === override) return
  override = next
  for (const listener of listeners) listener()
}

/** Back to following the clock. For tests. */
export function resetOverride(): void {
  setOverride(null)
}
