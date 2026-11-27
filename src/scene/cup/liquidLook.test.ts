import { describe, expect, it } from 'vitest'
import { CHAPTERS } from '../journey/chapters'
import { LOOKS, chapterLook, liquidLook, type LiquidLook } from './liquidLook'

const FIELDS = ['crema', 'milk', 'swirl', 'pour', 'art', 'cool', 'level'] as const

/** The largest change in any one value between two looks, colour included. */
function distance(a: LiquidLook, b: LiquidLook): number {
  let most = 0
  for (const field of FIELDS) most = Math.max(most, Math.abs(a[field] - b[field]))
  for (let channel = 0; channel < 3; channel++) most = Math.max(most, Math.abs(a.coffee[channel]! - b.coffee[channel]!))
  return most
}

describe('liquidLook', () => {
  it('lands on each chapter state at the chapter midpoint', () => {
    expect(liquidLook(1.5)).toEqual(LOOKS.cup)
    expect(liquidLook(2.5)).toEqual(LOOKS.dusk)
    expect(liquidLook(3.5)).toEqual(LOOKS.window)
    expect(liquidLook(4.5)).toEqual(LOOKS['last-cup'])
    // The hero is the craft film, with no cup on screen; the espresso waits for it there.
    expect(liquidLook(0.5)).toEqual(LOOKS.cup)
  })

  it('tells the story: espresso, then milk pouring, then latte art, then the cup cooled', () => {
    const { cup, dusk, window, 'last-cup': last } = LOOKS
    expect(cup.milk).toBe(0)
    expect(cup.art).toBe(0)
    expect(cup.pour).toBe(0)
    expect(cup.crema).toBe(1)
    expect(dusk.pour).toBe(1)
    expect(dusk.swirl).toBeGreaterThan(0.5)
    expect(dusk.milk).toBeGreaterThan(cup.milk)
    expect(dusk.level).toBeGreaterThan(cup.level)
    expect(window.art).toBe(1)
    expect(window.pour).toBe(0)
    expect(window.milk).toBe(1)
    expect(last.cool).toBe(1)
    expect(last.pour).toBe(0)
    expect(last.level).toBeLessThan(window.level)
    for (const look of [cup, dusk, window]) expect(look.cool).toBe(0)
  })

  it('is continuous: no jump anywhere, including between chapters', () => {
    const stepSize = 0.001
    let previous = liquidLook(-0.5)
    for (let progress = -0.5 + stepSize; progress <= CHAPTERS.length + 0.5; progress += stepSize) {
      const look = liquidLook(progress)
      expect(distance(previous, look)).toBeLessThan(0.005)
      previous = look
    }
    for (let boundary = 1; boundary < CHAPTERS.length; boundary++) {
      expect(distance(liquidLook(boundary - 1e-6), liquidLook(boundary + 1e-6))).toBeLessThan(1e-4)
    }
  })

  it('is deterministic', () => {
    for (const progress of [0, 1.234, 2.5, 3.999, 4.75]) {
      expect(liquidLook(progress)).toEqual(liquidLook(progress))
    }
  })

  it('holds its ends outside the journey and for a broken progress', () => {
    expect(liquidLook(-3)).toEqual(LOOKS.cup)
    expect(liquidLook(99)).toEqual(LOOKS['last-cup'])
    expect(liquidLook(Number.NaN)).toEqual(LOOKS.cup)
  })

  it('keeps every value in range', () => {
    for (let progress = 0; progress <= CHAPTERS.length; progress += 0.01) {
      const look = liquidLook(progress)
      for (const field of FIELDS) {
        expect(look[field]).toBeGreaterThanOrEqual(0)
        expect(look[field]).toBeLessThanOrEqual(1)
      }
      for (const channel of look.coffee) {
        expect(channel).toBeGreaterThanOrEqual(0)
        expect(channel).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('chapterLook (reduced motion)', () => {
  it('shows each chapter as one still state: its midpoint, wherever the visitor is in it', () => {
    for (let index = 1; index < CHAPTERS.length; index++) {
      const id = CHAPTERS[index]!.id as keyof typeof LOOKS
      for (const local of [0, 0.1, 0.5, 0.9, 0.999]) {
        expect(chapterLook(index + local)).toEqual(LOOKS[id])
      }
    }
  })

  it('does not scrub: within a chapter the look never changes', () => {
    const first = chapterLook(2.01)
    for (let progress = 2.01; progress < 3; progress += 0.01) expect(chapterLook(progress)).toEqual(first)
  })
})
