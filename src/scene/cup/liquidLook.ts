/*
 * What the coffee in the hero cup looks like at each point of the scroll journey. The cup travels
 * through chapters 2 to 5 and its coffee changes with them: an espresso under the lamp, milk pouring
 * in with the craft, latte art bloomed by the window, then the last cup, cooled. Each chapter's state
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
  /** How far the cup has cooled: 0 fresh, 1 the last cup (a duller sheen, softer art). */
  cool: number
  /** The coffee's level: 0 is the espresso's own height in the model, 1 the brim. */
  level: number
}

type ChapterId = 'cup' | 'craft' | 'window' | 'last-cup'

/** Each cup chapter's state, at its midpoint. */
export const LOOKS: Readonly<Record<ChapterId, Readonly<LiquidLook>>> = {
  // An espresso: all crema, nothing added yet.
  cup: { coffee: [0.21, 0.11, 0.05], crema: 1, milk: 0, swirl: 0, pour: 0, art: 0, cool: 0, level: 0.06 },
  // The milk pours in from low: the level rises and the white marbles through the crema.
  craft: { coffee: [0.42, 0.25, 0.12], crema: 0.7, milk: 0.55, swirl: 1, pour: 1, art: 0.2, cool: 0, level: 0.55 },
  // The pour has finished and the pattern has bloomed on a brown canvas.
  window: { coffee: [0.6, 0.39, 0.22], crema: 0.45, milk: 1, swirl: 0.2, pour: 0, art: 1, cool: 0, level: 0.8 },
  // The last cup: half drunk, cooled, its sheen gone flat and its pattern softened.
  'last-cup': { coffee: [0.53, 0.38, 0.26], crema: 0.3, milk: 1, swirl: 0.1, pour: 0, art: 1, cool: 1, level: 0.5 },
}

/** The cup chapters in journey order, each with the progress of its midpoint. */
const KEYS: readonly { at: number; look: Readonly<LiquidLook> }[] = CHAPTERS.flatMap((chapter, index) =>
  chapter.id in LOOKS ? [{ at: index + 0.5, look: LOOKS[chapter.id as ChapterId] }] : [],
)

function copy(look: Readonly<LiquidLook>): LiquidLook {
  return { ...look, coffee: [...look.coffee] }
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
  }
}

/** The look at a journey progress (in chapters, as in chapters.ts). */
export function liquidLook(progress: number): LiquidLook {
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
