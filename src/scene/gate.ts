import { useEffect, useState } from 'react'

/*
 * When the page's 3D scenes may start. Creating the first WebGL context and evaluating three.js cost
 * a few hundred milliseconds of main thread, so nothing 3D starts while the visitor is only looking
 * at the first screen: the photograph is there already. The gate opens on the visitor's first sign
 * of intent (a pointer moving, a touch, a key, a wheel or a scroll), or on its own once the page has
 * loaded and been quiet for QUIET_MS. It opens once per page view and stays open, so a scene that
 * arrives later, on another route, starts at once.
 */

export const INTENT_EVENTS = ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'] as const

/** How long the page stays quiet after loading before the scenes start without the visitor. */
export const QUIET_MS = 5000
/** Once quiet, the start still waits for an idle moment, at most this long. */
const IDLE_TIMEOUT_MS = 2000

let open = false
const waiting = new Set<() => void>()
let disarm: (() => void) | null = null

function openGate(): void {
  if (open) return
  open = true
  disarm?.()
  disarm = null
  const tasks = [...waiting]
  waiting.clear()
  for (const task of tasks) task()
}

function arm(): void {
  if (disarm) return
  const options = { passive: true, capture: true }
  for (const type of INTENT_EVENTS) window.addEventListener(type, openGate, options)

  let quiet: ReturnType<typeof setTimeout> | undefined
  let idle: number | ReturnType<typeof setTimeout> | undefined
  const afterLoad = () => {
    quiet = setTimeout(() => {
      if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(openGate, { timeout: IDLE_TIMEOUT_MS })
      else idle = setTimeout(openGate, 0)
    }, QUIET_MS)
  }
  if (document.readyState === 'complete') afterLoad()
  else window.addEventListener('load', afterLoad, { once: true })

  disarm = () => {
    for (const type of INTENT_EVENTS) window.removeEventListener(type, openGate, options)
    window.removeEventListener('load', afterLoad)
    clearTimeout(quiet)
    if (typeof idle === 'number' && typeof cancelIdleCallback === 'function') cancelIdleCallback(idle)
    else clearTimeout(idle)
  }
}

/** Has the gate opened? */
export function sceneGateOpen(): boolean {
  return open
}

/** Run `task` once the gate is open: now if it already is. Returns a function that cancels the wait. */
export function whenScenesMayStart(task: () => void): () => void {
  if (open) {
    task()
    return () => {}
  }
  waiting.add(task)
  arm()
  return () => {
    waiting.delete(task)
  }
}

/** Test-only: close the gate again and forget every waiting task. */
export function resetSceneGate(): void {
  open = false
  waiting.clear()
  disarm?.()
  disarm = null
}

/**
 * Whether the gate is open, as React state: false until the visitor's first intent or a quiet,
 * loaded page. Media that is not needed for the first screen waits for it, so nothing competes
 * with the first screen's own image while the page loads.
 */
export function useScenesMayStart(): boolean {
  const [mayStart, setMayStart] = useState(sceneGateOpen)
  useEffect(() => whenScenesMayStart(() => setMayStart(true)), [])
  return mayStart
}
