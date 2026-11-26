export type ToastKind = 'info' | 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

/** How long an info or success message stays. Errors stay until they are closed. */
export const TOAST_DURATION_MS = 5000

type Listener = () => void

let items: readonly ToastItem[] = []
let nextId = 1
const listeners = new Set<Listener>()
const timers = new Map<number, ReturnType<typeof setTimeout>>()

function emit(next: readonly ToastItem[]): void {
  items = next
  for (const listener of listeners) listener()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToasts(): readonly ToastItem[] {
  return items
}

export function dismissToast(id: number): void {
  const timer = timers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(id)
  }
  emit(items.filter((item) => item.id !== id))
}

/** Show a message. Returns its id. */
export function toast(message: string, { kind = 'info' }: { kind?: ToastKind } = {}): number {
  const id = nextId++
  emit([...items, { id, message, kind }])
  if (kind !== 'error') timers.set(id, setTimeout(() => dismissToast(id), TOAST_DURATION_MS))
  return id
}

/** Remove every message. For tests. */
export function clearToasts(): void {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
  emit([])
}
