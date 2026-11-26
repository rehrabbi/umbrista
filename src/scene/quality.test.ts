import { describe, expect, it } from 'vitest'
import { dprFor, measureFrameTime, quality, tierFrom } from './quality'

const strong = { cores: 12, memory: 8, frameMs: 16.7, reducedMotion: false }

describe('tierFrom', () => {
  it('rates a fast desktop high', () => {
    expect(tierFrom(strong)).toBe('high')
  })

  it('rates a middling phone mid', () => {
    expect(tierFrom({ cores: 6, memory: 4, frameMs: 17, reducedMotion: false })).toBe('mid')
  })

  it.each([
    ['few cores', { ...strong, cores: 2 }],
    ['little memory', { ...strong, memory: 2 }],
    ['slow frames', { ...strong, frameMs: 40 }],
  ])('rates %s low', (_name, input) => {
    expect(tierFrom(input)).toBe('low')
  })

  it('does not hold unknown numbers against the device', () => {
    expect(tierFrom({ reducedMotion: false })).toBe('mid')
    expect(tierFrom({ cores: 10, reducedMotion: false })).toBe('high')
  })

  it('never goes above mid under reduced motion', () => {
    expect(tierFrom({ ...strong, reducedMotion: true })).toBe('mid')
    expect(tierFrom({ ...strong, cores: 2, reducedMotion: true })).toBe('low')
  })
})

describe('dprFor', () => {
  it('caps the pixel ratio by tier', () => {
    expect(dprFor('high')).toEqual([1, 2])
    expect(dprFor('mid')).toEqual([1, 1.5])
    expect(dprFor('low')).toEqual([1, 1])
  })
})

describe('quality', () => {
  it('reads the device and returns a tier with its dpr range', () => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 2 })
    expect(quality(16)).toEqual({ tier: 'low', dpr: [1, 1] })
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 12 })
    expect(quality(16)).toEqual({ tier: 'high', dpr: [1, 2] })
  })
})

const never = () => 0

describe('measureFrameTime', () => {
  it('returns the median gap between sampled frames', async () => {
    const gaps = [16, 16, 16, 100, 16, 16, 16, 16, 16, 16]
    let time = 0
    let index = 0
    const raf = (callback: FrameRequestCallback) => {
      queueMicrotask(() => {
        time += gaps[index++ % gaps.length]!
        callback(time)
      })
      return 0
    }
    expect(await measureFrameTime(10, raf)).toBe(16)
  })

  it('gives up with undefined when frames never arrive (a hidden tab)', async () => {
    expect(await measureFrameTime(10, never, 20)).toBeUndefined()
  })
})
