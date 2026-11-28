/*
 * Brew-your-own's adapter: from the drink's look (shared/brew.ts, brewLook) to what the hero cup's
 * coffee surface reads. The coffee stays photographed (owner decision 2026-11-27): no milk shows the
 * espresso's crema, a spot of foam the milk blooming up through it, poured milk the rosetta. The
 * roast and beans move the photographs' browns through a grade tint, measured against the house
 * espresso, which the landing shows: that drink's tint is 1 and its cup looks as the landing's does.
 * Pure, and free of three.
 */
import { DEFAULT_BREW, brewLook, type BrewLook } from '../../../shared/brew'
import { blend, type LiquidLook, type Rgb } from './liquidLook'

export interface BrewSurface {
  look: LiquidLook
  /** A gain on the photographs' browns, per channel, in linear light; 1 leaves them as they are. */
  tint: Rgb
}

/** From this much foam up, the milk was poured: the rosetta. Below it, a spot blooming through the crema. */
const POURED = 0.75
/**
 * How far the tint follows the crema's colour, as a power of the ratio: the full ratio would take a
 * photograph of a medium roast's crema all the way to a pale beige or a dull brown, and it would stop
 * reading as a photograph.
 */
const STRENGTH = 0.6

function srgb(hex: string): Rgb {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) as Rgb
}

function linear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const REFERENCE = srgb(brewLook(DEFAULT_BREW).crema).map(linear)

/** The look the cup's coffee takes for a brewed drink, and its grade tint. */
export function brewSurface(look: BrewLook): BrewSurface {
  const surface: Rgb = look.foam <= 0 ? [1, 0, 0] : look.foam < POURED ? [0, 1, 0] : [0, 0, 1]
  const crema = srgb(look.crema).map(linear)
  const tint = crema.map((value, index) => (value / REFERENCE[index]!) ** STRENGTH) as Rgb
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
