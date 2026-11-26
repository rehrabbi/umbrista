import { describe, expect, it } from 'vitest'
import { MEDIA } from '../../media/manifest'
import { CHAPTERS, chapterAt, lampAt, OPENING } from './chapters'

describe('CHAPTERS', () => {
  it('tells the night in five chapters, in order', () => {
    expect(CHAPTERS.map((chapter) => chapter.id)).toEqual(['dusk', 'cup', 'craft', 'window', 'last-cup'])
  })

  it('opens on the street at dusk, with the promise as its line', () => {
    const [first] = CHAPTERS
    expect(first).toMatchObject({ still: 'street-dusk', line: 'We open when the light goes.' })
  })

  it('names only media that exist in public/media, stills as stills and loops as loops', () => {
    for (const chapter of CHAPTERS) {
      expect(MEDIA[chapter.still as keyof typeof MEDIA], chapter.id).toMatchObject({ kind: 'still' })
      if (chapter.loop) expect(MEDIA[chapter.loop as keyof typeof MEDIA], chapter.id).toMatchObject({ kind: 'loop' })
    }
  })

  it('gives the craft the steam loop', () => {
    expect(CHAPTERS.find((chapter) => chapter.id === 'craft')?.loop).toBe('steam-loop')
  })

  it('writes every title and line in the voice: present, short, and never exclaimed', () => {
    for (const chapter of CHAPTERS) {
      expect(chapter.title.trim(), chapter.id).not.toBe('')
      expect(chapter.line.trim(), chapter.id).not.toBe('')
      expect(chapter.line.length, chapter.id).toBeLessThanOrEqual(80)
      expect(`${chapter.title} ${chapter.line}`, chapter.id).not.toContain('!')
    }
  })

  it('keeps a camera move of finite numbers for every chapter', () => {
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

describe('lampAt (the lamps coming on through chapter 1)', () => {
  it('leaves the lamps off while dusk sits on the street', () => {
    expect(lampAt(0)).toBe(0)
    expect(lampAt(OPENING.lampsFrom)).toBe(0)
  })

  it('has them fully on by the end of the beat, and keeps them on', () => {
    expect(lampAt(OPENING.lampsTo)).toBe(1)
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

  it('brings the title in once the lamps are nearly on, and leaves time to read it while pinned', () => {
    expect(lampAt(OPENING.titleAt)).toBeGreaterThan(0.9)
    expect(OPENING.titleAt).toBeLessThan(0.7)
  })
})
