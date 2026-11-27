import { describe, expect, it } from 'vitest'
import { MAX_TILT, REST, step, type CupInput, type CupState } from './physics'

/** Run `seconds` of simulation at `fps`, with `input` held for the first `held` seconds. */
function run(fps: number, seconds: number, input: CupInput, held: number, from: CupState = REST): CupState {
  const dt = 1 / fps
  let state = from
  const frames = Math.round(seconds * fps)
  for (let frame = 0; frame < frames; frame++) {
    state = step(state, frame * dt < held - 1e-9 ? input : {}, dt)
  }
  return state
}

function close(a: number, b: number, scale: number): boolean {
  return Math.abs(a - b) <= 0.01 * Math.max(Math.abs(scale), 1e-6)
}

describe('step', () => {
  it('rests at rest', () => {
    expect(step(REST, {}, 1 / 60)).toEqual(REST)
  })

  it('clamps the tilt to ±0.6 rad, however hard it is pushed', () => {
    expect(MAX_TILT).toBe(0.6)
    const pushed = run(60, 2, { tilt: [5, -5] }, 2)
    expect(pushed.tilt[0]).toBeLessThanOrEqual(0.6)
    expect(pushed.tilt[1]).toBeGreaterThanOrEqual(-0.6)
    expect(pushed.tilt[0]).toBeGreaterThan(0.5)
    // Even a state that starts out of range is brought back inside it.
    const wild = step({ tilt: [3, -3], spin: 0, slosh: 0 }, {}, 1 / 60)
    expect(Math.abs(wild.tilt[0])).toBeLessThanOrEqual(0.6)
    expect(Math.abs(wild.tilt[1])).toBeLessThanOrEqual(0.6)
  })

  it('settles back to level when nobody holds it, without overshooting', () => {
    let state = run(60, 1, { tilt: [1, 0] }, 1)
    let previous = state.tilt[0]
    for (let frame = 0; frame < 180; frame++) {
      state = step(state, {}, 1 / 60)
      expect(state.tilt[0]).toBeGreaterThanOrEqual(0)
      expect(state.tilt[0]).toBeLessThanOrEqual(previous)
      previous = state.tilt[0]
    }
    expect(state.tilt[0]).toBeLessThan(0.01)
  })

  it('damps the slosh to under 0.01 within 3 s of no input', () => {
    const splashed = run(60, 0.5, { splash: 1, tilt: [1, -1], spin: 1 }, 0.5)
    expect(splashed.slosh).toBeGreaterThan(0.3)
    const quiet = run(60, 3, {}, 0, splashed)
    expect(quiet.slosh).toBeLessThan(0.01)
    expect(quiet.slosh).toBeGreaterThanOrEqual(0)
  })

  it('keeps the slosh between 0 and 1', () => {
    const state = run(60, 4, { splash: 50 }, 4)
    expect(state.slosh).toBeLessThanOrEqual(1)
  })

  it('lets a spin coast and slow, never reversing', () => {
    const spun = run(60, 0.3, { spin: 1 }, 0.3)
    expect(spun.spin).toBeGreaterThan(0)
    const later = run(60, 1, {}, 0, spun)
    expect(later.spin).toBeGreaterThan(0)
    expect(later.spin).toBeLessThan(spun.spin)
  })

  it('is frame-rate independent: 60 and 30 fps reach the same state within 1%', () => {
    const input: CupInput = { tilt: [0.7, -0.4], spin: 1, splash: 0.6 }
    for (const [seconds, held] of [
      [0.4, 0.4],
      [1.2, 0.6],
      [2.5, 1],
    ] as const) {
      const fast = run(60, seconds, input, held)
      const slow = run(30, seconds, input, held)
      expect(close(fast.tilt[0], slow.tilt[0], fast.tilt[0])).toBe(true)
      expect(close(fast.tilt[1], slow.tilt[1], fast.tilt[1])).toBe(true)
      expect(close(fast.spin, slow.spin, fast.spin)).toBe(true)
      expect(close(fast.slosh, slow.slosh, fast.slosh)).toBe(true)
    }
  })

  it('treats a missing or broken time step as no time at all', () => {
    const state = { tilt: [0.2, 0.1] as [number, number], spin: 0.5, slosh: 0.4 }
    expect(step(state, { splash: 1 }, 0)).toEqual(state)
    expect(step(state, { splash: 1 }, Number.NaN)).toEqual(state)
    expect(step(state, { splash: 1 }, -1)).toEqual(state)
  })
})
