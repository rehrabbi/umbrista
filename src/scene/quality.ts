/*
 * Quality tiers for the 3D scenes. The tier only decides how many pixels the canvas renders (its
 * device pixel ratio range); effects in later tasks may read it too.
 *
 * Thresholds, applied in this order. A number the browser does not report is not held against the
 * device (`deviceMemory` is Chromium only).
 *   low   2 or fewer CPU cores, or 2 GB of memory or less, or frames slower than 30 ms (under ~33 fps)
 *   high  8 or more cores, memory 8 GB or more, and frames at 20 ms or faster (~50 fps or better)
 *   mid   everything else
 * Reduced motion never goes above mid: the scene is mostly still, so spare pixels are not needed.
 *
 * dpr caps: high [1, 2], mid [1, 1.5], low [1, 1].
 */

export type Tier = 'low' | 'mid' | 'high'

export interface TierInput {
  cores?: number
  memory?: number
  frameMs?: number
  reducedMotion: boolean
}

export interface Quality {
  tier: Tier
  dpr: [number, number]
}

const LOW_CORES = 2
const LOW_MEMORY_GB = 2
const LOW_FRAME_MS = 30
const HIGH_CORES = 8
const HIGH_MEMORY_GB = 8
const HIGH_FRAME_MS = 20

export function tierFrom({ cores, memory, frameMs, reducedMotion }: TierInput): Tier {
  if (
    (cores !== undefined && cores <= LOW_CORES) ||
    (memory !== undefined && memory <= LOW_MEMORY_GB) ||
    (frameMs !== undefined && frameMs > LOW_FRAME_MS)
  ) {
    return 'low'
  }
  const strong =
    cores !== undefined &&
    cores >= HIGH_CORES &&
    (memory === undefined || memory >= HIGH_MEMORY_GB) &&
    (frameMs === undefined || frameMs <= HIGH_FRAME_MS)
  return strong && !reducedMotion ? 'high' : 'mid'
}

export function dprFor(tier: Tier): [number, number] {
  return tier === 'high' ? [1, 2] : tier === 'mid' ? [1, 1.5] : [1, 1]
}

/**
 * Median gap between animation frames, in ms, over a short sample (about 10 frames). Resolves
 * `undefined` if frames do not arrive in time, which is what a hidden tab does. `raf` and
 * `timeoutMs` can be injected.
 */
export function measureFrameTime(
  frames = 10,
  raf: (callback: FrameRequestCallback) => number = (callback) => requestAnimationFrame(callback),
  timeoutMs = 500,
): Promise<number | undefined> {
  return new Promise((resolve) => {
    const gaps: number[] = []
    let last: number | undefined
    let done = false
    const finish = (value: number | undefined) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => finish(undefined), timeoutMs)
    const tick = (time: number) => {
      if (last !== undefined) gaps.push(time - last)
      last = time
      if (gaps.length >= frames) {
        const sorted = gaps.toSorted((a, b) => a - b)
        finish(sorted[Math.floor(sorted.length / 2)])
      } else {
        raf(tick)
      }
    }
    raf(tick)
  })
}

/** The tier and dpr range for this device. Pass the result of `measureFrameTime` when you have it. */
export function quality(frameMs?: number): Quality {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const tier = tierFrom({ cores: navigator.hardwareConcurrency || undefined, memory, frameMs, reducedMotion })
  return { tier, dpr: dprFor(tier) }
}
