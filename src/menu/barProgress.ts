import { useSyncExternalStore } from 'react'

/*
 * The menu's state that changes with every scroll frame or every press, kept outside React so a
 * frame re-renders nothing on the page: the scenes inside the canvases read it in their frame loop
 * and are woken through the listeners. Like the landing's journey progress (scene/journey/progress.ts).
 */

type Listener = () => void

function store(initial: number) {
  let value = initial
  const listeners = new Set<Listener>()
  return {
    get: (): number => value,
    set(next: number): void {
      if (next === value || Number.isNaN(next)) return
      value = next
      for (const listener of listeners) listener()
    },
    subscribe(listener: Listener): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * How far through the bar the visitor is, in drinks: drink `i` is centred on the screen at `i + 0.5`,
 * arrives from below as it runs from `i` and leaves upwards towards `i + 1`. -1 before the bar.
 */
export const barProgress = store(-1)

/** The drink on screen for a bar progress: its index, within the bar's `count` drinks. */
export function drinkOnScreen(progress: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor(progress)))
}

/**
 * The drinks whose full models are loaded: the one on screen and its neighbours, so the next one
 * is ready before it rises into view. Indices in order.
 */
export function liveDrinks(progress: number, count: number): number[] {
  const at = drinkOnScreen(progress, count)
  const live: number[] = []
  for (let index = at - 1; index <= at + 1; index++) if (index >= 0 && index < count) live.push(index)
  return live
}

/** The drink on screen, as React state: changes only when another drink arrives. */
export function useDrinkOnScreen(count: number): number {
  const read = () => drinkOnScreen(barProgress.get(), count)
  return useSyncExternalStore(barProgress.subscribe, read, read)
}

/** How far a drink rises into view, in the bar scene's units (its height is one). */
export const RISE = 1.7
/** How far a drink turns while it crosses the screen, in radians. */
export const SCROLL_TURN = 1.1
/** A drink's angle at rest, three-quarters on, in radians. */
export const REST_ANGLE = -0.35

export interface DrinkPose {
  /** Height above its place: negative while it rises into view, positive as it leaves upwards. */
  y: number
  /** The angle it should turn to (the bar eases towards it). */
  angle: number
  /** Whether any of it can be on screen. */
  visible: boolean
}

function ease(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * Where drink `index` stands for a bar progress, and how far the visitor has turned it: it rises
 * into view from below as its section arrives, settles while it holds the middle of the screen,
 * turns with the scroll the whole way, and leaves upwards. Writes into `pose` (no allocation; it
 * runs every frame) and returns it.
 */
export function drinkPose(progress: number, index: number, turn: number, pose: DrinkPose): DrinkPose {
  const offset = progress - index - 0.5
  const arrive = ease((offset + 0.85) / 0.6)
  const leave = ease((offset - 0.25) / 0.6)
  pose.y = (arrive - 1) * RISE + leave * RISE
  pose.angle = REST_ANGLE + offset * SCROLL_TURN + turn
  pose.visible = arrive > 0 && leave < 1
  return pose
}

/**
 * The bar's progress for a scroll position, from the drinks' sections: `centre` is the middle of
 * the screen and `tops` and `heights` the sections', all in page pixels. Continuous across the
 * sections; -1 before the bar and the number of drinks after it.
 */
export function barProgressAt(centre: number, tops: ArrayLike<number>, heights: ArrayLike<number>): number {
  const count = tops.length
  if (count === 0) return -1
  for (let index = 0; index < count; index++) {
    const top = tops[index]!
    const height = heights[index]!
    if (centre < top) return index === 0 ? Math.max(-1, (centre - top) / height) : index
    if (centre < top + height) return index + (centre - top) / Math.max(1, height)
  }
  return count
}

/**
 * Follow the scroll through the bar: measures the sections when the page lays out (not on every
 * frame) and writes the progress on each scroll, at most once a frame. Returns the cleanup.
 */
export function followBar(sections: readonly HTMLElement[]): () => void {
  const tops = new Float64Array(sections.length)
  const heights = new Float64Array(sections.length)
  let frame = 0

  const measure = () => {
    for (let index = 0; index < sections.length; index++) {
      const box = sections[index]!.getBoundingClientRect()
      tops[index] = box.top + window.scrollY
      heights[index] = box.height
    }
  }
  const write = () => {
    frame = 0
    barProgress.set(barProgressAt(window.scrollY + window.innerHeight / 2, tops, heights))
  }
  const onScroll = () => {
    if (frame === 0) frame = requestAnimationFrame(write)
  }
  const onResize = () => {
    measure()
    onScroll()
  }

  measure()
  write()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize)
  for (const section of sections) observer?.observe(section)

  return () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    observer?.disconnect()
    if (frame !== 0) cancelAnimationFrame(frame)
    barProgress.set(-1)
  }
}

/*
 * How far the visitor has turned each drink with its "Turn left" and "Turn right" buttons, in
 * radians by drink id. The bar eases each model towards its angle.
 */
/** One press turns a drink by an eighth of a turn. */
export const TURN_STEP = Math.PI / 4
const turns = new Map<string, number>()
const turnListeners = new Set<Listener>()

export function turnDrink(id: string, direction: -1 | 1): void {
  turns.set(id, (turns.get(id) ?? 0) + direction * TURN_STEP)
  for (const listener of turnListeners) listener()
}

/** The angle the visitor has turned a drink to. */
export function drinkTurn(id: string): number {
  return turns.get(id) ?? 0
}

export function onDrinkTurn(listener: Listener): () => void {
  turnListeners.add(listener)
  return () => {
    turnListeners.delete(listener)
  }
}

/** Test-only: forget every turn. */
export function resetDrinkTurns(): void {
  turns.clear()
}

/*
 * Whether the bar's live 3D is on screen: set by its scene once a drink has drawn, cleared when it
 * goes. The page then hides the stills and offers the turn buttons, which a still cannot answer.
 */
let barLive = false
const liveListeners = new Set<Listener>()

export function setBarLive(next: boolean): void {
  if (next === barLive) return
  barLive = next
  for (const listener of liveListeners) listener()
}

function subscribeLive(listener: Listener): () => void {
  liveListeners.add(listener)
  return () => {
    liveListeners.delete(listener)
  }
}

const getBarLive = () => barLive

export function useBarLive(): boolean {
  return useSyncExternalStore(subscribeLive, getBarLive, getBarLive)
}

/*
 * The counter's strip, for its scene: where the first drink's place is centred, how far apart the
 * places are, how far the strip is scrolled, and which drink is chosen, all in CSS pixels relative
 * to the counter's canvas. Written by the page on scroll and resize; read in the scene's frame loop.
 */
export const counterView = {
  first: 0,
  pitch: 0,
  scroll: 0,
  width: 0,
  active: 0,
}
const viewListeners = new Set<Listener>()

export function updateCounterView(next: Partial<typeof counterView>): void {
  let changed = false
  for (const key of Object.keys(next) as (keyof typeof counterView)[]) {
    const value = next[key]
    if (value === undefined || value === counterView[key]) continue
    counterView[key] = value
    changed = true
  }
  if (!changed) return
  for (const listener of viewListeners) listener()
}

export function onCounterView(listener: Listener): () => void {
  viewListeners.add(listener)
  return () => {
    viewListeners.delete(listener)
  }
}
