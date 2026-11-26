/*
 * The pure logic behind the living background: everything the shaders are fed that can be worked
 * out without a GPU. The component in LivingBackground.tsx calls these once per frame.
 *
 * Coordinates: "view" UVs run 0..1 across the canvas, (0, 0) bottom left as in GLSL; "image" UVs run
 * 0..1 across the backdrop photograph.
 */
import type { Tier } from '../quality'

export type Vec2 = [number, number]

/** How quickly the lamp catches up with the pointer, per second. About a third of a second to settle. */
export const POINTER_RATE = 3

/** Where the lit café window sits in the street-dusk photograph (image UV). The lamp rests there. */
export const CAFE_WINDOW_UV: Vec2 = [0.387, 0.42]

/** The scene duration when the `--dur-scene` token cannot be read. */
export const SCENE_DURATION_FALLBACK_MS = 1200

/**
 * One step of exponential easing towards `target`. The share of the gap closed in `dtSec` is
 * 1 - e^(-rate * dt), which is always below 1, so the value never overshoots, and two half steps
 * equal one whole step, so the motion is the same at any frame rate.
 */
export function easePointer(current: Vec2, target: Vec2, dtSec: number, rate = POINTER_RATE): Vec2 {
  if (!(dtSec > 0)) return [current[0], current[1]]
  const k = 1 - Math.exp(-rate * dtSec)
  return [approach(current[0], target[0], k), approach(current[1], target[1], k)]
}

/** Close share `k` of the gap, kept between the two ends so rounding can never carry it past. */
function approach(from: number, to: number, k: number): number {
  const next = from + (to - from) * k
  return from < to ? Math.min(Math.max(next, from), to) : Math.max(Math.min(next, from), to)
}

/** A CSS time ("1200ms", "1.2s") in milliseconds, or `fallback` if it cannot be read. */
export function parseDurationMs(value: string, fallback = SCENE_DURATION_FALLBACK_MS): number {
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(value.trim())
  if (!match) return fallback
  const amount = Number(match[1])
  return match[2] === 's' ? amount * 1000 : amount
}

/**
 * Move the night amount (0 day, 1 night) towards `target` at a steady pace that crosses the whole
 * range in `durationMs`. It lands exactly on the target, so the grade comes fully to rest.
 */
export function stepNight(current: number, target: 0 | 1, dtMs: number, durationMs: number): number {
  if (durationMs <= 0) return target
  const step = Math.max(0, dtMs) / durationMs
  if (Math.abs(target - current) <= step) return target
  return current + Math.sign(target - current) * step
}

export interface LayerConfig {
  /** Whether rain is drawn at all. */
  rain: boolean
  /** Drop layers on the glass: sliding drops at one or two sizes, plus the small still droplets. */
  dropLayers: number
  /** Texture taps for the misted glass between drops; 1 is a single blurred lookup. */
  fogTaps: number
  /** The tier as a number for the shader: 0 low, 1 mid, 2 high. */
  quality: number
}

/**
 * What each quality tier draws. Low: the lamp glow and the grade only. Mid: one size of sliding
 * drop plus the still droplets, and a single-tap fog. High: two sizes of sliding drop, the
 * droplets, and a four-tap fog.
 */
export function layersFor(tier: Tier): LayerConfig {
  switch (tier) {
    case 'low':
      return { rain: false, dropLayers: 0, fogTaps: 1, quality: 0 }
    case 'mid':
      return { rain: true, dropLayers: 2, fogTaps: 1, quality: 1 }
    case 'high':
      return { rain: true, dropLayers: 3, fogTaps: 4, quality: 2 }
  }
}

export interface Cover {
  /** Image UV = view UV * scale + offset. */
  scale: Vec2
  offset: Vec2
}

/**
 * The crop CSS `object-fit: cover` makes, centred (the default `object-position`), as a UV transform.
 * The photograph is scaled until it fills the view, and the overflow on one axis is cut equally from
 * both sides. The shader uses this so the canvas lines up with the still underneath it exactly.
 */
export function coverUv(viewAspect: number, imageAspect: number): Cover {
  if (viewAspect >= imageAspect) {
    const sy = imageAspect / viewAspect
    return { scale: [1, sy], offset: [0, (1 - sy) / 2] }
  }
  const sx = viewAspect / imageAspect
  return { scale: [sx, 1], offset: [(1 - sx) / 2, 0] }
}

/** Where an image UV appears in the view under a cover crop (may fall outside 0..1). */
export function imageToView(uv: Vec2, cover: Cover): Vec2 {
  return [(uv[0] - cover.offset[0]) / cover.scale[0], (uv[1] - cover.offset[1]) / cover.scale[1]]
}

const PARALLAX_ZOOM = 0.05
const PARALLAX_SHIFT = 0.02

/**
 * The depth parallax as the hero scrolls away: the photograph behind the glass pushes in a little
 * and drifts down against the page, so it seems further away than the glass. The shift never
 * exceeds the slack the zoom creates, so the shader never samples past the photo's edge.
 */
export function parallax(progress: number, intensity: number): { scale: number; shift: number } {
  const p = Math.min(1, Math.max(0, progress)) * Math.min(1, Math.max(0, intensity))
  if (p === 0) return { scale: 1, shift: 0 }
  const scale = 1 + PARALLAX_ZOOM * p
  const slack = (1 - 1 / scale) / 2
  return { scale, shift: Math.min(PARALLAX_SHIFT * p, slack) }
}

/** How far the hero has scrolled out of view: 0 while its top is on screen, 1 once it has gone. */
export function scrollProgress(top: number, height: number): number {
  if (height <= 0) return 0
  return Math.min(1, Math.max(0, -top / height))
}

/** The smallest derivative at least `pixelWidth` wide, or the largest there is. */
export function pickWidth(widths: readonly number[], pixelWidth: number): number {
  const sorted = widths.toSorted((a, b) => a - b)
  return sorted.find((w) => w >= pixelWidth) ?? sorted[sorted.length - 1] ?? 0
}
