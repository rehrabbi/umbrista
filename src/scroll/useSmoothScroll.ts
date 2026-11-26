import Lenis from 'lenis'
import { useEffect, useSyncExternalStore } from 'react'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

let current: Lenis | null = null
const listeners = new Set<() => void>()

/**
 * What calls Lenis once a frame. Starts the loop with a step that takes a timestamp in
 * milliseconds, and returns a function that stops it.
 */
export type FrameDriver = (step: (timeMs: number) => void) => () => void

/** The browser's own frame loop: the driver until something else (GSAP's ticker) takes over. */
export const animationFrames: FrameDriver = (step) => {
  let frame = requestAnimationFrame(function tick(time) {
    step(time)
    frame = requestAnimationFrame(tick)
  })
  return () => cancelAnimationFrame(frame)
}

let driver: FrameDriver = animationFrames
let stopLoop: (() => void) | null = null
const scrollListeners = new Set<() => void>()

function runLoop(lenis: Lenis): void {
  stopLoop?.()
  stopLoop = driver((time) => lenis.raf(time))
}

/**
 * Drive Lenis with `next` from now on. A running loop is handed over at once, so there is never a
 * second loop: the old one stops before the new one starts.
 */
export function driveWith(next: FrameDriver): void {
  driver = next
  if (current && stopLoop) runLoop(current)
}

/** Call `listener` every time Lenis moves the page. Returns a function that unsubscribes. */
export function onSmoothScroll(listener: () => void): () => void {
  scrollListeners.add(listener)
  return () => {
    scrollListeners.delete(listener)
  }
}

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
 * the tree. One frame loop drives it: the browser's, or GSAP's ticker once a page loads
 * ScrollTrigger (see `scroll/scrollTrigger.ts`).
 *
 * Anchor links keep working either way: Lenis only animates the jump, and the browser's own jump to
 * the target (and its focus handling, for the skip link) still happens.
 */
export function useSmoothScroll(): Lenis | null {
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION)
    let stop: (() => void) | null = null

    const start = () => {
      const lenis = new Lenis({ anchors: true })
      lenis.on('scroll', () => {
        for (const listener of scrollListeners) listener()
      })
      runLoop(lenis)
      setCurrent(lenis)
      stop = () => {
        stopLoop?.()
        stopLoop = null
        lenis.destroy()
        setCurrent(null)
        stop = null
      }
    }

    // The preference can change during a visit: still when it turns on, smooth when it turns off.
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) stop?.()
      else if (!stop) start()
    }

    if (!query.matches) start()
    query.addEventListener('change', onChange)

    return () => {
      query.removeEventListener('change', onChange)
      stop?.()
    }
  }, [])

  return useSyncExternalStore(subscribe, () => current, () => null)
}
