/*
 * CSS easing curves as functions, so scripted motion (GSAP) moves on the same curves as the CSS
 * tokens (`--ease-settle`) and the two never drift apart.
 */

export type Ease = (t: number) => number

/**
 * The curve `cubic-bezier(x1, y1, x2, y2)` as CSS defines it: for a time fraction x, find the
 * curve's parameter s where x(s) = x (Newton's method, with bisection as a fallback), then return
 * y(s). The x control points must lie in 0..1, as CSS requires, so x(s) only ever rises.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Ease {
  // Polynomial coefficients of x(s) and y(s), with the end points fixed at (0, 0) and (1, 1).
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx

  const solve = (x: number) => {
    let s = x
    for (let i = 0; i < 8; i++) {
      const error = sampleX(s) - x
      if (Math.abs(error) < 1e-7) return s
      const slope = slopeX(s)
      if (Math.abs(slope) < 1e-6) break
      s -= error / slope
    }
    let lo = 0
    let hi = 1
    s = x
    for (let i = 0; i < 40; i++) {
      const value = sampleX(s)
      if (Math.abs(value - x) < 1e-7) break
      if (value < x) lo = s
      else hi = s
      s = (lo + hi) / 2
    }
    return s
  }

  return (t) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    return sampleY(solve(t))
  }
}

const CUBIC_BEZIER = /^cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/

/** A CSS `cubic-bezier(...)` value as an easing function, or null if it is anything else. */
export function parseCubicBezier(value: string): Ease | null {
  const match = CUBIC_BEZIER.exec(value.trim())
  if (!match) return null
  const [x1, y1, x2, y2] = match.slice(1).map(Number) as [number, number, number, number]
  if (![x1, y1, x2, y2].every(Number.isFinite) || x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null
  return cubicBezier(x1, y1, x2, y2)
}
