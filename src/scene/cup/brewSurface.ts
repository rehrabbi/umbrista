/*
 * Brew-your-own's adapter: from the drink's look (shared/brew.ts, brewLook) to what the hero cup's
 * coffee surface reads. The coffee stays photographed (owner decision 2026-11-27): no milk shows the
 * espresso's crema, a spot of foam the milk blooming up through it, poured milk the rosetta. The
 * roast and beans move the photographs' browns through a grade tint, anchored on the house
 * espresso, which the landing shows: that drink's tint is exactly 1 and its cup looks as the
 * landing's does. Pure, and free of three.
 */
import { CREMA_DARK, CREMA_LIGHT, DEFAULT_BREW, brewLook, type BrewLook } from '../../../shared/brew'
import { blend, type LiquidLook, type Rgb } from './liquidLook'

export interface BrewSurface {
  look: LiquidLook
  /** A gain on the photographs' browns, per channel, in linear light; 1 leaves them as they are. */
  tint: Rgb
}

/** From this much foam up, the milk was poured: the rosetta. Below it, a spot blooming through the crema. */
const POURED = 0.75

function srgb(hex: string): Rgb {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) as Rgb
}

function linear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const linearOf = (hex: string) => srgb(hex).map(linear) as Rgb

/*
 * The roast's tint. Reasoned from numbers, not seen: no render was possible when it was chosen
 * (Task 11, fix round 1), so a look on a GPU should confirm it.
 *
 * The photographs' crema, after their grade in liquidSurface.ts, is a hazel of (0.306, 0.129, 0.031)
 * in linear light (#966531 under a neutral light; green 0.42 of red): the landing's crema, and the
 * house espresso's, a medium roast. A first tint followed the brand's crema tokens' own ratio to
 * that, softened (a power of 0.6), and moved the colour too little to see under the sodium lamp:
 * the light roast read the same rust-orange as the dark (the controller's look in Brave, day theme).
 * The tokens' hues are too close for a ratio to carry the roast. So each end of the roast now has its
 * own target crema, chosen as it would look under a neutral light, and the tint is the target over
 * the graded hazel:
 *
 * - Light: a pale golden hazel, #c09560, linear (0.527, 0.301, 0.117): twice the hazel's brightness
 *   (luminance 0.335 against 0.160), and golden, green 0.57 of red. Gain (1.72, 2.33, 3.77): blue and
 *   green rise most, which is what turns orange towards gold; blue is so small in a crema (0.031)
 *   that even this gain leaves it the smallest channel.
 * - Medium: the hazel itself, a hazel-caramel. Gain 1.
 * - Dark: a deep brown with little gold, #553220, linear (0.091, 0.032, 0.014): about a quarter of
 *   the hazel's brightness (0.043), green 0.35 of red. Gain (0.30, 0.25, 0.47): the browns go dark
 *   and, with blue kept a little, brown rather than red.
 *
 * Every crema in between stays red over green over blue (tested), so no choice makes an unreal
 * colour. lqGrade fades the gain out on the photographs' whites, so the milk stays white.
 */
export const GRADED_CREMA: Rgb = [0.306, 0.129, 0.031]
const LIGHT_TINT = linearOf('#c09560').map((value, index) => value / GRADED_CREMA[index]!) as Rgb
const DARK_TINT = linearOf('#553220').map((value, index) => value / GRADED_CREMA[index]!) as Rgb

/**
 * How dark a crema is, 0 (the lightest, CREMA_LIGHT) to 1 (the darkest, CREMA_DARK): where it falls
 * on the line between the two, as brewLook mixes it from the roast and the beans.
 */
function depthOf(crema: string): number {
  const light = srgb(CREMA_LIGHT)
  const dark = srgb(CREMA_DARK)
  const colour = srgb(crema)
  let along = 0
  let length = 0
  for (let index = 0; index < 3; index++) {
    const span = dark[index]! - light[index]!
    along += (colour[index]! - light[index]!) * span
    length += span * span
  }
  return Math.min(1, Math.max(0, along / length))
}

/** The house espresso's depth: the medium roast, tint 1. */
const HOUSE = depthOf(brewLook(DEFAULT_BREW).crema)

/** Between two gains, `t` of the way, evenly in ratio (so halfway between 0.25 and 1 is 0.5). */
function towards(from: Rgb, to: Rgb, t: number): Rgb {
  return from.map((value, index) => Math.exp(Math.log(value) * (1 - t) + Math.log(to[index]!) * t)) as Rgb
}

/** The tint for a crema: the light target, through 1 at the house espresso, to the dark target. */
function tintFor(crema: string): Rgb {
  const depth = depthOf(crema)
  const one: Rgb = [1, 1, 1]
  return depth <= HOUSE ? towards(LIGHT_TINT, one, depth / HOUSE) : towards(one, DARK_TINT, (depth - HOUSE) / (1 - HOUSE))
}

/** The look the cup's coffee takes for a brewed drink, and its grade tint. */
export function brewSurface(look: BrewLook): BrewSurface {
  const surface: Rgb = look.foam <= 0 ? [1, 0, 0] : look.foam < POURED ? [0, 1, 0] : [0, 0, 1]
  const tint = tintFor(look.crema)
  return {
    look: {
      coffee: srgb(look.liquid),
      crema: 1 - look.foam,
      milk: look.foam,
      swirl: 0,
      pour: 0,
      art: surface[2],
      cool: 0,
      level: look.fill,
      surface,
    },
    tint,
  }
}

/** Between two brewed looks, `t` of the way from the first (0..1). */
export function blendBrew(from: BrewSurface, to: BrewSurface, t: number): BrewSurface {
  if (t <= 0) return from
  if (t >= 1) return to
  const mix = (a: number, b: number) => a + (b - a) * t
  return {
    look: blend(from.look, to.look, t),
    tint: [mix(from.tint[0], to.tint[0]), mix(from.tint[1], to.tint[1]), mix(from.tint[2], to.tint[2])],
  }
}
