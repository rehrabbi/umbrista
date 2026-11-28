import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MENU } from './menu'
import {
  BEANS,
  CREMA_DARK,
  CREMA_LIGHT,
  DEFAULT_BREW,
  METHODS,
  MILKS,
  ROASTS,
  brewLook,
  brewName,
  brewPrice,
  type BrewChoice,
} from './brew'

/** Every choice a visitor can make. */
function everyChoice(): BrewChoice[] {
  return BEANS.flatMap((beans) =>
    ROASTS.flatMap((roast) =>
      METHODS.flatMap((method) => MILKS.map((milk) => ({ beans: beans.id, roast: roast.id, method: method.id, milk: milk.id }))),
    ),
  )
}

/** A `#rrggbb` colour's relative luminance (WCAG). */
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

/** Green over red: how golden a brown is. */
function golden(hex: string): number {
  return Number.parseInt(hex.slice(3, 5), 16) / Number.parseInt(hex.slice(1, 3), 16)
}

const DRINK_PRICES = MENU.filter((item) => item.model !== undefined).map((item) => item.price)

describe('the options', () => {
  it('offers three or four choices for each, with unique ids, a label and a note', () => {
    for (const options of [BEANS, ROASTS, METHODS, MILKS]) {
      expect(options.length).toBeGreaterThanOrEqual(3)
      expect(options.length).toBeLessThanOrEqual(4)
      expect(new Set(options.map((option) => option.id)).size).toBe(options.length)
      for (const option of options) {
        expect(option.label.trim()).not.toBe('')
        expect(option.note.trim()).not.toBe('')
        // The house voice: no exclamation marks.
        expect(option.note).not.toMatch(/!/)
      }
    }
  })

  it('names the roasts light, medium and dark, in that order', () => {
    expect(ROASTS.map((roast) => roast.id)).toEqual(['light', 'medium', 'dark'])
  })

  it('starts from a choice it offers', () => {
    expect(() => brewPrice(DEFAULT_BREW)).not.toThrow()
  })
})

describe('brewPrice', () => {
  it('prices every combination within the menu’s drinks, in whole tenths', () => {
    const low = Math.min(...DRINK_PRICES)
    const high = Math.max(...DRINK_PRICES)
    expect([low, high]).toEqual([280, 540])
    for (const choice of everyChoice()) {
      const price = brewPrice(choice)
      expect(Number.isSafeInteger(price)).toBe(true)
      expect(price).toBeGreaterThanOrEqual(low)
      expect(price).toBeLessThanOrEqual(high)
      expect(price % 10).toBe(0)
    }
  })

  it('does not depend on the name', () => {
    expect(brewPrice({ ...DEFAULT_BREW, name: 'The long way home' })).toBe(brewPrice(DEFAULT_BREW))
  })

  it('refuses an option it does not offer', () => {
    expect(() => brewPrice({ ...DEFAULT_BREW, beans: 'robusta' })).toThrow(RangeError)
    expect(() => brewPrice({ ...DEFAULT_BREW, method: 'instant' })).toThrow(RangeError)
    expect(() => brewPrice({ ...DEFAULT_BREW, milk: 'cream' })).toThrow(RangeError)
    expect(() => brewPrice({ ...DEFAULT_BREW, roast: 'burnt' as BrewChoice['roast'] })).toThrow(RangeError)
  })
})

describe('brewLook', () => {
  it('is deterministic: the same choice, the same look', () => {
    for (const choice of everyChoice()) expect(brewLook({ ...choice })).toEqual(brewLook(choice))
  })

  it('gives colours as #rrggbb and amounts within 0..1', () => {
    for (const choice of everyChoice()) {
      const look = brewLook(choice)
      expect(look.liquid).toMatch(/^#[0-9a-f]{6}$/)
      expect(look.crema).toMatch(/^#[0-9a-f]{6}$/)
      for (const amount of [look.fill, look.foam]) {
        expect(amount).toBeGreaterThanOrEqual(0)
        expect(amount).toBeLessThanOrEqual(1)
      }
    }
  })

  it('is darker, and its crema less golden, for a darker roast, whatever else is chosen', () => {
    for (const choice of everyChoice().filter((each) => each.roast === 'light')) {
      const [light, medium, dark] = ROASTS.map((roast) => brewLook({ ...choice, roast: roast.id }))
      expect(luminance(medium!.liquid)).toBeLessThan(luminance(light!.liquid))
      expect(luminance(dark!.liquid)).toBeLessThan(luminance(medium!.liquid))
      expect(luminance(medium!.crema)).toBeLessThan(luminance(light!.crema))
      expect(luminance(dark!.crema)).toBeLessThan(luminance(medium!.crema))
      expect(golden(dark!.crema)).toBeLessThan(golden(light!.crema))
    }
  })

  it('takes its crema from the palette: the lightest roast is the brand’s crema, the darkest its day crema', () => {
    const cremas = everyChoice().map((choice) => brewLook(choice).crema)
    expect(cremas).toContain(CREMA_LIGHT)
    expect(cremas).toContain(CREMA_DARK)
  })

  it('keeps its crema ends equal to the brand’s crema tokens and docs/brand.md, so they cannot drift', () => {
    // shared/ imports nothing, so the values are written there; this reads the sources they copy.
    const tokens = readFileSync('src/styles/tokens.css', 'utf8')
    const crema = (selector: string) => {
      const start = tokens.indexOf(`${selector} {`)
      const rule = tokens.slice(start, tokens.indexOf('}', start))
      return /--color-crema:\s*(#[0-9a-f]{6})/i.exec(rule)?.[1]?.toLowerCase()
    }
    expect(crema(':root')).toBe(CREMA_LIGHT)
    expect(crema(':root[data-time="day"]')).toBe(CREMA_DARK)
    const brand = readFileSync('docs/brand.md', 'utf8')
    const row = /^\| Crema \(details only\) \| `(#[0-9A-F]{6})` \| `(#[0-9A-F]{6})` \|$/im.exec(brand)
    expect(row?.slice(1).map((hex) => hex.toLowerCase())).toEqual([CREMA_LIGHT, CREMA_DARK])
  })

  it('fills the cup by the method, and higher with milk', () => {
    const depths = METHODS.map((method) => brewLook({ ...DEFAULT_BREW, method: method.id }).fill)
    expect(depths.toSorted((a, b) => a - b)).toEqual(depths)
    expect(new Set(depths).size).toBe(depths.length)
    const black = brewLook({ ...DEFAULT_BREW, milk: 'none' })
    const white = brewLook({ ...DEFAULT_BREW, milk: 'whole' })
    expect(white.fill).toBeGreaterThan(black.fill)
  })

  it('has no foam without milk, and foam with it', () => {
    for (const milk of MILKS) {
      const { foam } = brewLook({ ...DEFAULT_BREW, milk: milk.id })
      if (milk.id === 'none') expect(foam).toBe(0)
      else expect(foam).toBeGreaterThan(0)
    }
  })
})

describe('brewName', () => {
  it('keeps the name the visitor gave, trimmed', () => {
    expect(brewName({ ...DEFAULT_BREW, name: '  The long way home ' })).toBe('The long way home')
  })

  it('names an unnamed drink from its choices', () => {
    const name = brewName({ beans: 'harbour', roast: 'dark', method: 'lungo', milk: 'oat' })
    expect(name).toBe('Harbour lungo with oat milk')
    expect(brewName({ ...DEFAULT_BREW, name: '   ' })).toBe(brewName(DEFAULT_BREW))
  })

  it('never names a drink longer than the cart keeps', () => {
    for (const choice of everyChoice()) expect(brewName(choice).length).toBeLessThanOrEqual(60)
  })
})
