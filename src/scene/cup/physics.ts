/*
 * The hero cup's play: how it tilts, spins and how its coffee moves. Pure and frame-rate
 * independent, so the scene can call it with whatever time a frame took.
 *
 * Everything relaxes the way a lamp warms or dims: each value moves towards where it is pushed and
 * eases back, exponentially, with no overshoot. No springs, no bounce. Each step uses the exact
 * solution of that relaxation over `dt` (x' = rate * (target - x)), so sixty small steps and thirty
 * larger ones arrive at the same place.
 */

export interface CupState {
  /** The cup's lean, in radians: [sideways (left is negative), towards the visitor]. Within ±MAX_TILT. */
  tilt: [number, number]
  /** How fast the cup turns on its saucer, in radians per second. */
  spin: number
  /** How much the coffee is moving, 0 (still) to 1. */
  slosh: number
}

/** What the visitor is doing to the cup during a step. Every field is optional; empty is hands off. */
export interface CupInput {
  /** Where the cup is being leaned, each axis -1..1 of the full tilt, while held. */
  tilt?: [number, number]
  /** A push on the spin, -1..1 (1 for a button), while held. Clamped. */
  spin?: number
  /** A push on the coffee, 0..1 (1 for a button), while held. Clamped. */
  splash?: number
  /** An immediate turn, in radians, from dragging the cup. Not part of the state: the scene adds it. */
  turn?: number
}

export const MAX_TILT = 0.6
export const REST: CupState = { tilt: [0, 0], spin: 0, slosh: 0 }

/** How quickly the tilt follows its target, per second (a time constant of 0.2 s). */
const TILT_RATE = 5
/** How quickly a spin slows, per second: it coasts for about two seconds. */
const SPIN_FRICTION = 1.4
/** The spin a held push settles at, in radians per second. */
const SPIN_PUSH = 9
/** How quickly the coffee stills, per second: from full to under 1% in about two seconds. */
const SLOSH_DAMPING = 2.4
/** How strongly a held splash stirs the coffee, per second. */
const SPLASH_PUSH = 6
/** How much the coffee moves for each radian the cup leans or rights itself. */
const SLOSH_PER_TILT = 0.5

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Exact relaxation of x towards `target` at `rate` per second, over `dt` seconds. */
function relax(x: number, target: number, rate: number, dt: number): number {
  return target + (x - target) * Math.exp(-rate * dt)
}

function finite(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? value : 0
}

/** Advance the cup by `dt` seconds under `input`. Returns a new state; a broken dt changes nothing. */
export function step(state: CupState, input: CupInput, dt: number): CupState {
  if (!(dt > 0) || !Number.isFinite(dt)) return state
  const [pushX, pushY] = input.tilt ?? [0, 0]
  const targetX = clamp(finite(pushX), -1, 1) * MAX_TILT
  const targetY = clamp(finite(pushY), -1, 1) * MAX_TILT
  const fromX = clamp(state.tilt[0], -MAX_TILT, MAX_TILT)
  const fromY = clamp(state.tilt[1], -MAX_TILT, MAX_TILT)
  const tiltX = clamp(relax(fromX, targetX, TILT_RATE, dt), -MAX_TILT, MAX_TILT)
  const tiltY = clamp(relax(fromY, targetY, TILT_RATE, dt), -MAX_TILT, MAX_TILT)

  // A held push draws the spin towards its own speed; let go and it coasts down to rest.
  const spin = relax(state.spin, clamp(finite(input.spin), -1, 1) * SPIN_PUSH, SPIN_FRICTION, dt)

  // The coffee is stirred by a splash and by the cup moving under it, then stills. A held splash
  // relaxes towards its own level; the lean's change adds a kick at the step's midpoint, so it is
  // damped by half the step either way and the total does not depend on the step size.
  const moved = Math.hypot(tiltX - fromX, tiltY - fromY) * SLOSH_PER_TILT
  const splash = clamp(finite(input.splash), 0, 1) * SPLASH_PUSH
  const settled = relax(state.slosh, splash / SLOSH_DAMPING, SLOSH_DAMPING, dt)
  const slosh = clamp(settled + moved * Math.exp((-SLOSH_DAMPING * dt) / 2), 0, 1)

  return { tilt: [tiltX, tiltY], spin, slosh }
}
