import { describe, expect, it } from 'vitest'
import { BEANS, DEFAULT_BREW, ROASTS, brewLook, type BrewChoice } from '../../../shared/brew'
import { GRADED_CREMA, blendBrew, brewSurface } from './brewSurface'

const surfaceOf = (choice: BrewChoice) => brewSurface(brewLook(choice)).look.surface

/** The photographs' graded crema, as a choice tints it, in linear light. */
function tinted(choice: BrewChoice): [number, number, number] {
  const { tint } = brewSurface(brewLook(choice))
  return GRADED_CREMA.map((value, index) => value * tint[index]!) as [number, number, number]
}

const luma = ([r, g, b]: number[]) => 0.2126 * r! + 0.7152 * g! + 0.0722 * b!

describe('brewSurface', () => {
  it('shows the espresso’s crema photograph without milk', () => {
    expect(surfaceOf({ ...DEFAULT_BREW, milk: 'none' })).toEqual([1, 0, 0])
  })

  it('shows the milk blooming through the crema for a spot of foam', () => {
    expect(surfaceOf({ ...DEFAULT_BREW, milk: 'spot' })).toEqual([0, 1, 0])
  })

  it('shows the rosetta for poured milk', () => {
    expect(surfaceOf({ ...DEFAULT_BREW, milk: 'whole' })).toEqual([0, 0, 1])
    expect(surfaceOf({ ...DEFAULT_BREW, milk: 'oat' })).toEqual([0, 0, 1])
  })

  it('sets the level from the fill, and never ages the cup', () => {
    for (const method of ['ristretto', 'espresso', 'lungo', 'long-black']) {
      const look = brewLook({ ...DEFAULT_BREW, method })
      const { look: liquid } = brewSurface(look)
      expect(liquid.level).toBe(look.fill)
      expect(liquid.cool).toBe(0)
      expect(liquid.pour).toBe(0)
    }
  })

  it('leaves the house espresso’s browns as the landing shows them', () => {
    const { tint } = brewSurface(brewLook(DEFAULT_BREW))
    for (const channel of tint) expect(channel).toBeCloseTo(1, 6)
  })

  it('tints a darker roast darker and less golden, and a lighter one lighter', () => {
    const [light, medium, dark] = ROASTS.map((roast) => brewSurface(brewLook({ ...DEFAULT_BREW, roast: roast.id })).tint)
    for (let channel = 0; channel < 3; channel++) {
      expect(dark![channel]).toBeLessThan(medium![channel]!)
      expect(light![channel]).toBeGreaterThan(medium![channel]!)
    }
    expect(dark![1] / dark![0]).toBeLessThan(light![1] / light![0])
  })

  it('makes the roast plain to see: a pale golden light roast, a deep brown dark one with little gold', () => {
    const house = tinted(DEFAULT_BREW)
    const light = tinted({ ...DEFAULT_BREW, roast: 'light' })
    const dark = tinted({ ...DEFAULT_BREW, roast: 'dark' })
    // Light: twice as bright as the house crema, and golden (more green against its red).
    expect(luma(light)).toBeGreaterThan(2 * luma(house))
    expect(light[1] / light[0]).toBeGreaterThan(0.55)
    // Dark: under a third as bright, with less gold than the house crema's 0.42.
    expect(luma(dark)).toBeLessThan(luma(house) / 3)
    expect(dark[1] / dark[0]).toBeLessThan(0.38)
  })

  it('never makes an unreal colour: every crema stays a brown, red over green over blue', () => {
    for (const beans of BEANS) {
      for (const roast of ROASTS) {
        const [r, g, b] = tinted({ ...DEFAULT_BREW, beans: beans.id, roast: roast.id })
        expect(r).toBeGreaterThan(g)
        expect(g).toBeGreaterThan(b)
        expect(r).toBeLessThan(1)
      }
    }
  })

  it('moves the tint steadily with the roast and beans, the house blend between Sidamo and decaf', () => {
    for (const roast of ROASTS) {
      const [sidamo, harbour, decaf] = ['sidamo', 'harbour', 'decaf'].map((beans) => luma(tinted({ ...DEFAULT_BREW, beans, roast: roast.id })))
      expect(sidamo).toBeGreaterThanOrEqual(harbour!)
      expect(decaf).toBeLessThanOrEqual(harbour!)
    }
  })

  it('gives the coffee its colour from the look, as sRGB 0..1', () => {
    const { look } = brewSurface({ liquid: '#ff8000', crema: '#d3b48c', fill: 0, foam: 0 })
    expect(look.coffee[0]).toBeCloseTo(1)
    expect(look.coffee[1]).toBeCloseTo(128 / 255)
    expect(look.coffee[2]).toBeCloseTo(0)
  })
})

describe('blendBrew', () => {
  const from = brewSurface(brewLook({ ...DEFAULT_BREW, roast: 'light', method: 'ristretto', milk: 'none' }))
  const to = brewSurface(brewLook({ ...DEFAULT_BREW, roast: 'dark', method: 'long-black', milk: 'whole' }))

  it('is the first at 0 and the second at 1', () => {
    expect(blendBrew(from, to, 0)).toEqual(from)
    expect(blendBrew(from, to, 1)).toEqual(to)
  })

  it('moves every part of the look between the two', () => {
    const half = blendBrew(from, to, 0.5)
    expect(half.look.level).toBeCloseTo((from.look.level + to.look.level) / 2)
    expect(half.look.surface[0]).toBeCloseTo(0.5)
    expect(half.look.surface[2]).toBeCloseTo(0.5)
    expect(half.tint[0]).toBeCloseTo((from.tint[0] + to.tint[0]) / 2)
  })
})
