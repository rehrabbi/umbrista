/*
 * What the coffee in the hero cup looks like at each point of the scroll journey. The cup travels
 * through chapters 2 to 5 and its coffee changes with them: an espresso under the lamp, milk pouring
 * in as the street goes dark, latte art bloomed by the window, then the last cup, cooled. Each chapter's state
 * is exact at the chapter's midpoint; between two midpoints the look eases from one to the next, so
 * nothing jumps where one chapter hands over to the next. Pure: the same progress, the same look.
 *
 * The shader on the liquid surface (liquidSurface.ts) reads these values; nothing here knows about
 * three.
 */
import { CHAPTERS, chapterAt } from '../journey/chapters'

export type Rgb = [number, number, number]

export interface LiquidLook {
  /** The coffee's own colour, where crema and milk foam are thin: sRGB, each channel 0..1. */
  coffee: Rgb
  /** How much of the surface is crema (the espresso's tiger-flecked foam), 0..1. */
  crema: number
  /** How much milk is in the cup, 0..1. */
  milk: number
  /** How strongly the milk marbles through the crema as it goes in, 0..1. */
  swirl: number
  /** The stream of milk pouring in, 0 (none) to 1 (full). */
  pour: number
  /** The latte art, 0 (none) to 1 (fully bloomed). */
  art: number
  /**
   * How far the cup has aged: 0 fresh, 1 the last cup (a flatter sheen, softer art, muted colour).
   * It only begins as the last chapter does, and is complete at its middle.
   */
  cool: number
  /**
   * How much of each photographed surface shows, summing to 1: the espresso's crema, the milk
   * blooming up through it, and the rosetta (docs/brand.md, the cup's coffee surfaces).
   */
  surface: [number, number, number]
  /** The coffee's level: 0 is the espresso's own height in the model, 1 the brim. */
  level: number
}

type ChapterId = 'cup' | 'dusk' | 'window' | 'last-cup'

/** Each cup chapter's state, at its midpoint. */
export const LOOKS: Readonly<Record<ChapterId, Readonly<LiquidLook>>> = {
  // An espresso: all crema, nothing added yet.
  cup: { coffee: [0.21, 0.11, 0.05], crema: 1, milk: 0, swirl: 0, pour: 0, art: 0, cool: 0, level: 0.06, surface: [1, 0, 0] },
  // At dusk the milk goes in from low and blooms up through the crema; the level rises.
  dusk: { coffee: [0.42, 0.25, 0.12], crema: 0.7, milk: 0.55, swirl: 1, pour: 1, art: 0.2, cool: 0, level: 0.55, surface: [0, 1, 0] },
  // The pour has finished and the rosetta stands on a brown canvas.
  window: { coffee: [0.6, 0.39, 0.22], crema: 0.45, milk: 1, swirl: 0.2, pour: 0, art: 1, cool: 0, level: 0.8, surface: [0, 0, 1] },
  // The last cup: the same rosetta, half drunk and aged live (owner decision 2026-11-27): its sheen
  // flat, its edges softened, its colour muted.
  'last-cup': { coffee: [0.53, 0.38, 0.26], crema: 0.3, milk: 1, swirl: 0.1, pour: 0, art: 1, cool: 1, level: 0.5, surface: [0, 0, 1] },
}

/** The cup chapters in journey order, each with the progress of its midpoint. */
const KEYS: readonly { at: number; look: Readonly<LiquidLook> }[] = CHAPTERS.flatMap((chapter, index) =>
  chapter.id in LOOKS ? [{ at: index + 0.5, look: LOOKS[chapter.id as ChapterId] }] : [],
)

function copy(look: Readonly<LiquidLook>): LiquidLook {
  return { ...look, coffee: [...look.coffee], surface: [...look.surface] }
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function blend(a: Readonly<LiquidLook>, b: Readonly<LiquidLook>, t: number): LiquidLook {
  return {
    coffee: [mix(a.coffee[0], b.coffee[0], t), mix(a.coffee[1], b.coffee[1], t), mix(a.coffee[2], b.coffee[2], t)],
    crema: mix(a.crema, b.crema, t),
    milk: mix(a.milk, b.milk, t),
    swirl: mix(a.swirl, b.swirl, t),
    pour: mix(a.pour, b.pour, t),
    art: mix(a.art, b.art, t),
    cool: mix(a.cool, b.cool, t),
    level: mix(a.level, b.level, t),
    surface: [mix(a.surface[0], b.surface[0], t), mix(a.surface[1], b.surface[1], t), mix(a.surface[2], b.surface[2], t)],
  }
}

const LAST = KEYS[KEYS.length - 1]!

/**
 * The ageing follows the last chapter, not the blend between midpoints: none before the chapter
 * begins, all of it by its middle, eased at both ends.
 */
function ageAt(progress: number): number {
  const start = LAST.at - 0.5
  const t = Math.min(1, Math.max(0, (progress - start) / 0.5))
  return t * t * (3 - 2 * t)
}

/** The look at a journey progress (in chapters, as in chapters.ts). */
export function liquidLook(progress: number): LiquidLook {
  const look = blendAt(progress)
  look.cool = Number.isNaN(progress) ? 0 : ageAt(progress)
  return look
}

function blendAt(progress: number): LiquidLook {
  const first = KEYS[0]!
  const last = KEYS[KEYS.length - 1]!
  if (!(progress > first.at)) return copy(first.look)
  if (progress >= last.at) return copy(last.look)
  const next = KEYS.findIndex((key) => key.at > progress)
  const from = KEYS[next - 1]!
  const to = KEYS[next]!
  const t = (progress - from.at) / (to.at - from.at)
  if (t === 0) return copy(from.look)
  // Smoothstep: each change starts and ends gently, so the look settles on every chapter's state.
  return blend(from.look, to.look, t * t * (3 - 2 * t))
}

/**
 * The look under reduced motion: each chapter shows its own state, still, wherever the visitor is
 * in it. Nothing scrubs; the scene fades from one chapter's state to the next as the chapter changes.
 */
export function chapterLook(progress: number): LiquidLook {
  return liquidLook(chapterAt(progress).index + 0.5)
}
