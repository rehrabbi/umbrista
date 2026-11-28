import { describe, expect, it } from 'vitest'
import { DEFAULT_BREW, ROASTS, brewLook, type BrewChoice } from '../../../shared/brew'
import { blendBrew, brewSurface } from './brewSurface'

const surfaceOf = (choice: BrewChoice) => brewSurface(brewLook(choice)).look.surface

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

  it('keeps the tint gentle, so the photograph still reads as itself', () => {
    for (const roast of ROASTS) {
      for (const channel of brewSurface(brewLook({ ...DEFAULT_BREW, roast: roast.id })).tint) {
        expect(channel).toBeGreaterThan(0.4)
        expect(channel).toBeLessThan(1.6)
      }
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
