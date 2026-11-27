import { describe, expect, it } from 'vitest'
import { CHAPTERS } from '../../scene/journey/chapters'
import { titleTiming } from './titleTiming'

// The title's letters, as KineticTitle splits them: every character but the spaces.
const LETTERS = CHAPTERS[0]!.line.replace(/\s/g, '').length
// --dur-chapter, in seconds: each letter's own rise.
const RISE = 0.6

describe("the title's timing", () => {
  it('arrives within a scene change of the motion band, 0.6 to 1.2 seconds', () => {
    const { arrival } = titleTiming(LETTERS, RISE)
    expect(arrival).toBeGreaterThanOrEqual(0.6)
    expect(arrival).toBeLessThanOrEqual(1.2)
  })
})
