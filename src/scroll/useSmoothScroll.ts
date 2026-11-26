import Lenis from 'lenis'
import { useEffect, useSyncExternalStore } from 'react'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

let current: Lenis | null = null
const listeners = new Set<() => void>()

function setCurrent(next: Lenis | null): void {
  current = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Smooth scrolling with Lenis. Returns the instance, or `null` when the visitor prefers reduced
 * motion (Lenis is then never constructed and the browser scrolls as usual). Call it once, high in
 * the tree.
 *
 * Anchor links keep working either way: Lenis only animates the jump, and the browser's own jump to
 * the target (and its focus handling, for the skip link) still happens.
 */
export function useSmoothScroll(): Lenis | null {
  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION).matches) return

    const lenis = new Lenis({ anchors: true })
    let frame = requestAnimationFrame(function tick(time) {
      lenis.raf(time)
      frame = requestAnimationFrame(tick)
    })
    setCurrent(lenis)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
      setCurrent(null)
    }
  }, [])

  return useSyncExternalStore(subscribe, () => current, () => null)
}
