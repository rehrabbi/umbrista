import { describe, expect, it } from 'vitest'
import {
  POINTER_RATE,
  coverUv,
  easePointer,
  imageToView,
  layersFor,
  parallax,
  parseDurationMs,
  pickWidth,
  scrollProgress,
  stepNight,
} from './uniforms'

describe('easePointer', () => {
  it('converges on the target', () => {
    let p: [number, number] = [0, 0]
    for (let i = 0; i < 600; i++) p = easePointer(p, [1, -0.5], 1 / 60)
    expect(p[0]).toBeCloseTo(1, 6)
    expect(p[1]).toBeCloseTo(-0.5, 6)
  })

  it('never overshoots, even after a long frame', () => {
    for (const dt of [1 / 240, 1 / 60, 1 / 10, 1, 30]) {
      let p: [number, number] = [0.2, 0.9]
      for (let i = 0; i < 50; i++) {
        p = easePointer(p, [0.8, 0.1], dt)
        expect(p[0]).toBeGreaterThanOrEqual(0.2)
        expect(p[0]).toBeLessThanOrEqual(0.8)
        expect(p[1]).toBeLessThanOrEqual(0.9)
        expect(p[1]).toBeGreaterThanOrEqual(0.1)
      }
    }
  })

  it('moves the same distance at any frame rate', () => {
    let fast: [number, number] = [0, 0]
    for (let i = 0; i < 12; i++) fast = easePointer(fast, [1, 1], 1 / 120)
    let slow: [number, number] = [0, 0]
    for (let i = 0; i < 3; i++) slow = easePointer(slow, [1, 1], 1 / 30)
    expect(fast[0]).toBeCloseTo(slow[0], 10)
    expect(fast[1]).toBeCloseTo(slow[1], 10)
  })

  it('resets to the target when the current position is not a number', () => {
    expect(easePointer([Number.NaN, 0.2], [0.4, 0.6], 1 / 60)).toEqual([0.4, 0.6])
    expect(easePointer([Infinity, 0.2], [0.4, 0.6], 1 / 60)).toEqual([0.4, 0.6])
  })

  it('treats a negative or missing frame time as no time at all', () => {
    expect(easePointer([0.3, 0.3], [1, 1], -1)).toEqual([0.3, 0.3])
    expect(easePointer([0.3, 0.3], [1, 1], Number.NaN)).toEqual([0.3, 0.3])
    expect(POINTER_RATE).toBeGreaterThan(0)
  })
})

describe('parseDurationMs', () => {
  it('reads milliseconds and seconds from a CSS time', () => {
    expect(parseDurationMs('1200ms')).toBe(1200)
    expect(parseDurationMs(' 1.2s ')).toBe(1200)
  })

  it('falls back when the token is missing or malformed', () => {
    expect(parseDurationMs('')).toBe(1200)
    expect(parseDurationMs('soon', 600)).toBe(600)
  })
})

describe('stepNight', () => {
  const DURATION = 1200

  it('takes the scene duration to go from day to night, and lands exactly on 1', () => {
    let n = 0
    let elapsed = 0
    while (n !== 1) {
      n = stepNight(n, 1, 1000 / 60, DURATION)
      elapsed += 1000 / 60
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(1)
    }
    expect(elapsed).toBeGreaterThanOrEqual(DURATION - 1)
    expect(elapsed).toBeLessThanOrEqual(DURATION + 1000 / 60 + 1)
  })

  it('is half way after half the duration', () => {
    expect(stepNight(0, 1, 600, DURATION)).toBeCloseTo(0.5, 10)
    expect(stepNight(1, 0, 600, DURATION)).toBeCloseTo(0.5, 10)
  })

  it('lands exactly on 0 going back to day, even after a long frame', () => {
    expect(stepNight(0.4, 0, 5000, DURATION)).toBe(0)
    expect(stepNight(0.999, 1, 100, DURATION)).toBe(1)
  })

  it('jumps straight to the target when the duration is zero', () => {
    expect(stepNight(0, 1, 16, 0)).toBe(1)
  })
})

describe('layersFor', () => {
  it('turns the rain layer off on the low tier: glow only', () => {
    const low = layersFor('low')
    expect(low.rain).toBe(false)
    expect(low.dropLayers).toBe(0)
  })

  it('gives mid fewer drop layers and a cheaper refraction than high', () => {
    const mid = layersFor('mid')
    const high = layersFor('high')
    expect(mid.rain).toBe(true)
    expect(high.rain).toBe(true)
    expect(mid.dropLayers).toBeGreaterThan(0)
    expect(mid.dropLayers).toBeLessThan(high.dropLayers)
    expect(mid.fogTaps).toBeLessThan(high.fogTaps)
  })
})

describe('coverUv', () => {
  it('leaves the image alone when the aspects match', () => {
    expect(coverUv(16 / 9, 16 / 9)).toEqual({ scale: [1, 1], offset: [0, 0] })
  })

  it('crops top and bottom, centred, when the view is wider than the image', () => {
    const { scale, offset } = coverUv(2, 1)
    expect(scale[0]).toBe(1)
    expect(scale[1]).toBeCloseTo(0.5, 10)
    expect(offset[0]).toBe(0)
    expect(offset[1]).toBeCloseTo(0.25, 10)
  })

  it('crops the sides, centred, when the view is narrower than the image', () => {
    const { scale, offset } = coverUv(390 / 744, 43 / 24)
    const visible = 390 / 744 / (43 / 24)
    expect(scale[0]).toBeCloseTo(visible, 10)
    expect(scale[1]).toBe(1)
    expect(offset[0]).toBeCloseTo((1 - visible) / 2, 10)
    expect(offset[1]).toBe(0)
  })

  it('falls back to the uncropped photo for a size that is zero, negative or not a number', () => {
    const identity = { scale: [1, 1], offset: [0, 0] }
    for (const [view, image] of [
      [0, 1.79],
      [-1, 1.79],
      [Number.NaN, 1.79],
      [Infinity, 1.79],
      [1.8, 0],
      [1.8, Number.NaN],
    ]) {
      expect(coverUv(view!, image!)).toEqual(identity)
    }
  })

  it('maps an image point back into the view with imageToView', () => {
    const cover = coverUv(2, 1)
    // The image centre stays at the view centre; a point a quarter up the image is at the view's bottom edge.
    expect(imageToView([0.5, 0.5], cover)).toEqual([0.5, 0.5])
    expect(imageToView([0.3, 0.25], cover)[1]).toBeCloseTo(0, 10)
  })
})

describe('parallax', () => {
  it('does nothing at the top of the page or at zero intensity', () => {
    expect(parallax(0, 1)).toEqual({ scale: 1, shift: 0 })
    expect(parallax(1, 0)).toEqual({ scale: 1, shift: 0 })
  })

  it('pushes in gently as the hero leaves, without sampling outside the photo', () => {
    for (const p of [0.25, 0.5, 1]) {
      const { scale, shift } = parallax(p, 1)
      expect(scale).toBeGreaterThan(1)
      expect(scale).toBeLessThan(1.1)
      // Zooming in by `scale` leaves (1 - 1/scale) / 2 of slack at each edge; the shift must fit inside it.
      expect(Math.abs(shift)).toBeLessThanOrEqual((1 - 1 / scale) / 2 + 1e-9)
    }
  })

  it('clamps progress outside 0..1', () => {
    expect(parallax(4, 1)).toEqual(parallax(1, 1))
    expect(parallax(-2, 1)).toEqual(parallax(0, 1))
  })
})

describe('scrollProgress', () => {
  it('is 0 while the hero is fully in view and 1 once it has left', () => {
    expect(scrollProgress(0, 800)).toBe(0)
    expect(scrollProgress(40, 800)).toBe(0)
    expect(scrollProgress(-400, 800)).toBeCloseTo(0.5, 10)
    expect(scrollProgress(-2000, 800)).toBe(1)
    expect(scrollProgress(-100, 0)).toBe(0)
  })
})

describe('pickWidth', () => {
  const widths = [640, 1280, 1920, 2560]

  it('picks the smallest derivative at least as wide as the canvas', () => {
    expect(pickWidth(widths, 1440)).toBe(1920)
    expect(pickWidth(widths, 1280)).toBe(1280)
    expect(pickWidth(widths, 300)).toBe(640)
  })

  it('falls back to the largest when the canvas is wider than all of them', () => {
    expect(pickWidth(widths, 5120)).toBe(2560)
    expect(pickWidth([1920, 640, 1280], 5000)).toBe(1920)
  })
})
