import { describe, expect, it } from 'vitest'
import { MEDIA } from '../../media/manifest'
import { CHAPTERS, CUP_REST, DUSK, chapterAt, chapterIndex, lampAt, lampsAt, orbitAt } from './chapters'

describe('CHAPTERS', () => {
  it('tells the night in five chapters, in the order the owner chose (2026-11-27)', () => {
    expect(CHAPTERS.map((chapter) => chapter.id)).toEqual(['craft', 'cup', 'dusk', 'window', 'last-cup'])
  })

  it('opens on the craft film, with the promise as its line', () => {
    const [first] = CHAPTERS
    expect(first).toMatchObject({ still: 'steam-loop-poster', loop: 'steam-loop', line: 'We open when the light goes.' })
  })

  it('names only media that exist in public/media, stills as stills and loops as loops', () => {
    for (const chapter of CHAPTERS) {
      if (chapter.still) expect(MEDIA[chapter.still as keyof typeof MEDIA], chapter.id).toMatchObject({ kind: 'still' })
      if (chapter.loop) expect(MEDIA[chapter.loop as keyof typeof MEDIA], chapter.id).toMatchObject({ kind: 'loop' })
    }
  })

  it('puts the street at dusk and the rain window in their chapters', () => {
    expect(CHAPTERS[chapterIndex('dusk')]!.still).toBe('street-dusk')
    expect(CHAPTERS[chapterIndex('window')]!.still).toBe('rain-window')
  })

  it('writes every title and line in the voice: present, short, and never exclaimed', () => {
    for (const chapter of CHAPTERS) {
      expect(chapter.title.trim(), chapter.id).not.toBe('')
      expect(chapter.line.trim(), chapter.id).not.toBe('')
      expect(chapter.line.length, chapter.id).toBeLessThanOrEqual(80)
      expect(`${chapter.title} ${chapter.line}`, chapter.id).not.toContain('!')
    }
  })

  it('moves the camera continuously: each chapter starts where the one before it ended', () => {
    for (let index = 1; index < CHAPTERS.length; index++) {
      expect(CHAPTERS[index]!.camera.from, CHAPTERS[index]!.id).toEqual(CHAPTERS[index - 1]!.camera.to)
    }
    for (const { camera } of CHAPTERS) {
      for (const point of [camera.from, camera.to]) {
        expect(point).toHaveLength(3)
        expect(point.every(Number.isFinite)).toBe(true)
      }
    }
  })
})

describe('chapterAt', () => {
  it('splits journey progress into a chapter and the progress through it', () => {
    expect(chapterAt(0)).toEqual({ index: 0, local: 0 })
    expect(chapterAt(0.5)).toEqual({ index: 0, local: 0.5 })
    expect(chapterAt(1.25)).toEqual({ index: 1, local: 0.25 })
  })

  it('holds the ends of the journey instead of running off them', () => {
    expect(chapterAt(-2)).toEqual({ index: 0, local: 0 })
    expect(chapterAt(CHAPTERS.length)).toEqual({ index: CHAPTERS.length - 1, local: 1 })
    expect(chapterAt(99)).toEqual({ index: CHAPTERS.length - 1, local: 1 })
    expect(chapterAt(Number.NaN)).toEqual({ index: 0, local: 0 })
  })
})

describe('orbitAt', () => {
  it('holds the cup at rest until its chapter, then follows each move without a jump', () => {
    expect(orbitAt(0)).toEqual(CUP_REST)
    expect(orbitAt(1)).toEqual(CUP_REST)
    let previous = orbitAt(1)
    for (let progress = 1.001; progress <= CHAPTERS.length; progress += 0.001) {
      const orbit = orbitAt(progress)
      for (let axis = 0; axis < 3; axis++) expect(Math.abs(orbit[axis]! - previous[axis]!)).toBeLessThan(0.2)
      previous = orbit
    }
  })
})

describe('lampAt (the lamps coming on through the street chapter)', () => {
  it('leaves the lamps off while dusk sits on the street', () => {
    expect(lampAt(0)).toBe(0)
    expect(lampAt(DUSK.lampsFrom)).toBe(0)
  })

  it('has them fully on by the end of the beat, and keeps them on', () => {
    expect(lampAt(DUSK.lampsTo)).toBe(1)
    expect(lampAt(1)).toBe(1)
  })

  it('rises steadily, never stepping back and never jumping', () => {
    let previous = 0
    for (let i = 1; i <= 400; i++) {
      const value = lampAt(i / 400)
      expect(value).toBeGreaterThanOrEqual(previous)
      expect(value - previous).toBeLessThan(0.02)
      previous = value
    }
  })

  it('stays between 0 and 1 outside the chapter', () => {
    expect(lampAt(-1)).toBe(0)
    expect(lampAt(3)).toBe(1)
    expect(lampAt(Number.NaN)).toBe(0)
  })

  it('reads the lamps from journey progress: off before the street, on after it', () => {
    const dusk = chapterIndex('dusk')
    expect(lampsAt(0.5)).toBe(0)
    expect(lampsAt(dusk - 0.01)).toBe(0)
    expect(lampsAt(dusk + 0.4)).toBeCloseTo(lampAt(0.4))
    expect(lampsAt(dusk + 1.2)).toBe(1)
  })
})
