/*
 * Brew-your-own: the visitor's choice of beans, roast, method and milk, and the name they give the
 * drink; what each option is and costs; and what the drink looks like in the cup. Pure, with no
 * imports: the cart carries the choice to the order, and the server prices it the same way.
 */

export interface BrewChoice {
  beans: string
  roast: 'light' | 'medium' | 'dark'
  method: string
  milk: string
  name?: string
}

/** One option of a choice, as the form offers it. */
export interface BrewOption<Id extends string = string> {
  id: Id
  label: string
  /** What it is, in the house voice. */
  note: string
  /** What it adds to the price, in hundredths of a crown. */
  price: number
}

export interface BeanOption extends BrewOption {
  /** Shifts the roast's colour: below 0 a lighter cup, above 0 a darker one. */
  shade: number
}

export interface RoastOption extends BrewOption<BrewChoice['roast']> {
  /** 0 the lightest colour the cup takes, 1 the darkest. */
  depth: number
}

export interface MethodOption extends BrewOption {
  /** How full the cup is before any milk: 0 the espresso's own level, 1 the brim. */
  fill: number
}

export interface MilkOption extends BrewOption {
  /** How much of the surface is milk foam, 0..1: a spot blooms through the crema, a pour draws a rosetta. */
  foam: number
  /** How much it raises the level. */
  volume: number
  /** How a drink's name says it ("with oat milk"); empty for none. */
  phrase: string
}

export const BEANS: readonly BeanOption[] = [
  { id: 'harbour', label: 'Harbour', note: 'The house blend, from Brazil and Colombia. Cocoa and toasted hazelnut.', price: 0, shade: 0 },
  { id: 'sidamo', label: 'Sidamo', note: 'A washed coffee from Ethiopia. Bergamot and apricot, bright in the cup.', price: 60, shade: -0.12 },
  { id: 'decaf', label: 'Decaf', note: 'Colombian, decaffeinated with sugar cane. Soft brown sugar, for the last hours.', price: 20, shade: 0.1 },
]

export const ROASTS: readonly RoastOption[] = [
  { id: 'light', label: 'Light', note: 'Bright and a little sharp, the fruit up front.', price: 0, depth: 0 },
  { id: 'medium', label: 'Medium', note: 'Round, with caramel and cocoa.', price: 0, depth: 0.5 },
  { id: 'dark', label: 'Dark', note: 'Heavy and bittersweet, with smoke at the edge.', price: 0, depth: 1 },
]

/** Every method is pulled on the bar's machine, so every cup carries a crema. */
export const METHODS: readonly MethodOption[] = [
  { id: 'ristretto', label: 'Ristretto', note: 'A short pull. Thick and sweet, gone in two sips.', price: 280, fill: 0 },
  { id: 'espresso', label: 'Espresso', note: 'A double shot, as the bar pulls it.', price: 280, fill: 0.08 },
  { id: 'lungo', label: 'Lungo', note: 'A long pull through the same coffee. Thinner and more bitter.', price: 300, fill: 0.3 },
  { id: 'long-black', label: 'Long black', note: 'A double shot over hot water, the crema kept on top.', price: 320, fill: 0.55 },
]

export const MILKS: readonly MilkOption[] = [
  { id: 'none', label: 'No milk', note: 'The coffee as it comes.', price: 0, foam: 0, volume: 0, phrase: '' },
  { id: 'spot', label: 'A spot of foam', note: 'A spoon of steamed milk, blooming up through the crema.', price: 30, foam: 0.5, volume: 0.08, phrase: 'a spot of foam' },
  { id: 'whole', label: 'Whole milk', note: 'Steamed and poured, with a rosetta on top.', price: 80, foam: 1, volume: 0.4, phrase: 'whole milk' },
  { id: 'oat', label: 'Oat milk', note: 'Steamed and poured, with a rosetta on top. A little nuttier.', price: 100, foam: 0.9, volume: 0.4, phrase: 'oat milk' },
]

/** The choice the form starts from: the house espresso, as the bar would make it. */
export const DEFAULT_BREW: Readonly<BrewChoice> = { beans: 'harbour', roast: 'medium', method: 'espresso', milk: 'none' }

/*
 * The cup's colours, from the palette (docs/brand.md): the lightest crema is the brand's crema, the
 * darkest its day crema. The coffee's own colour runs from a light roast's chestnut to a dark roast's
 * near black.
 */
const CREMA_LIGHT = '#d3b48c'
const CREMA_DARK = '#7e6040'
const LIQUID_LIGHT = '#4a2c17'
const LIQUID_DARK = '#1c100a'

function find<Option extends BrewOption>(options: readonly Option[], id: string, what: string): Option {
  const option = options.find((candidate) => candidate.id === id)
  if (!option) throw new RangeError(`Umbrista does not offer ${what} "${id}"`)
  return option
}

function optionsOf(choice: BrewChoice) {
  return {
    beans: find(BEANS, choice.beans, 'the beans'),
    roast: find(ROASTS, choice.roast, 'the roast'),
    method: find(METHODS, choice.method, 'the method'),
    milk: find(MILKS, choice.milk, 'the milk'),
  }
}

/** The price of a brewed drink, in hundredths of a crown. Throws a RangeError for an option not offered. */
export function brewPrice(choice: BrewChoice): number {
  const { beans, roast, method, milk } = optionsOf(choice)
  return method.price + beans.price + roast.price + milk.price
}

/** The drink's name: the one the visitor gave, or one made from the choices ("Harbour lungo with oat milk"). */
export function brewName(choice: BrewChoice): string {
  const given = choice.name?.trim()
  if (given) return given
  const { beans, method, milk } = optionsOf(choice)
  const base = `${beans.label} ${method.label.toLowerCase()}`
  return milk.phrase ? `${base} with ${milk.phrase}` : base
}

export interface BrewLook {
  /** The coffee's own colour, `#rrggbb`. */
  liquid: string
  /** The crema's colour, `#rrggbb`. */
  crema: string
  /** How full the cup is: 0 the espresso's own level, 1 the brim. */
  fill: number
  /** How much of the surface is milk foam, 0..1. */
  foam: number
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number]
}

/** Between two `#rrggbb` colours, `t` of the way from the first. */
function mixHex(from: string, to: string, t: number): string {
  const a = channels(from)
  const b = channels(to)
  return `#${a.map((value, index) => Math.round(value + (b[index]! - value) * t).toString(16).padStart(2, '0')).join('')}`
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/**
 * What the drink looks like in the cup. The roast sets how dark the coffee and its crema are, and
 * the beans shift it a little; the method sets how full the cup is, and milk raises it and covers the
 * crema with foam. The same choice always gives the same look.
 */
export function brewLook(choice: BrewChoice): BrewLook {
  const { beans, roast, method, milk } = optionsOf(choice)
  const depth = clamp01(roast.depth + beans.shade)
  return {
    liquid: mixHex(LIQUID_LIGHT, LIQUID_DARK, depth),
    crema: mixHex(CREMA_LIGHT, CREMA_DARK, depth),
    fill: clamp01(method.fill + milk.volume),
    foam: milk.foam,
  }
}
