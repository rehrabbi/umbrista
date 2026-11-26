import { describe, expect, it } from 'vitest'
import { cubicBezier, parseCubicBezier } from './ease'

describe('cubicBezier', () => {
  it('starts at 0 and ends at 1', () => {
    const settle = cubicBezier(0.22, 1, 0.36, 1)
    expect(settle(0)).toBe(0)
    expect(settle(1)).toBe(1)
  })

  it('is the identity for a straight line', () => {
    const linear = cubicBezier(0, 0, 1, 1)
    for (const t of [0.1, 0.25, 0.5, 0.9]) expect(linear(t)).toBeCloseTo(t, 4)
  })

  it('follows the settle curve: fast out, then a long rest, never past 1', () => {
    const settle = cubicBezier(0.22, 1, 0.36, 1)
    // At x = 0.5 the curve is already near its end; x(s) = 0.5 at s of about 0.592.
    expect(settle(0.5)).toBeGreaterThan(0.9)
    expect(settle(0.5)).toBeLessThan(1)
    let previous = 0
    for (let i = 1; i <= 100; i++) {
      const value = settle(i / 100)
      expect(value).toBeGreaterThanOrEqual(previous)
      expect(value).toBeLessThanOrEqual(1)
      previous = value
    }
  })

  it('solves x before reading y, so a skewed curve is not read as its parameter', () => {
    // ease-in: at x = 0.5 the browser gives about 0.315, while the raw parameter would give 0.5.
    expect(cubicBezier(0.42, 0, 1, 1)(0.5)).toBeCloseTo(0.315, 2)
  })
})

describe('parseCubicBezier', () => {
  it('reads a CSS cubic-bezier() token', () => {
    const ease = parseCubicBezier(' cubic-bezier(0.42, 0, 1, 1)')
    expect(ease?.(0.5)).toBeCloseTo(0.315, 2)
  })

  it('returns null for anything else', () => {
    expect(parseCubicBezier('ease-out')).toBeNull()
    expect(parseCubicBezier('')).toBeNull()
    expect(parseCubicBezier('cubic-bezier(1, 2)')).toBeNull()
  })
})
