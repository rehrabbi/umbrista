import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/styles/tokens.css', 'utf8')
const brandDoc = readFileSync('docs/brand.md', 'utf8')

type Theme = Record<string, string>

/** The custom properties declared in the first rule whose selector is exactly `selector`. */
function declarations(selector: string): Theme {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`no rule for ${selector} in tokens.css`)
  const end = css.indexOf('}', start)
  const body = css.slice(start + selector.length + 2, end)
  const theme: Theme = {}
  for (const match of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    theme[match[1] as string] = (match[2] as string).trim()
  }
  return theme
}

const night = declarations(':root')
const day = { ...night, ...declarations(':root[data-time="day"]') }

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const colour = (theme: Theme, role: string): string => {
  const value = theme[`--color-${role}`]
  if (!value) throw new Error(`--color-${role} is missing`)
  return value.toUpperCase()
}

/** The hex values brand.md lists for each role, as [night, day]. */
const APPROVED: Record<string, [string, string]> = {
  bg: ['#0D1524', '#DCE3EC'],
  surface: ['#15203A', '#EEF2F6'],
  text: ['#E4E8EF', '#0D1524'],
  'text-quiet': ['#97A3B8', '#46536A'],
  signal: ['#F4A13A', '#965000'],
  'on-signal': ['#0D1524', '#EEF2F6'],
  crema: ['#D3B48C', '#7E6040'],
  shadow: ['#5B6F93', '#7D8AA2'],
}

const BODY_PAIRS: [string, string][] = [
  ['text', 'bg'],
  ['text-quiet', 'bg'],
  ['text', 'surface'],
  ['text-quiet', 'surface'],
  ['signal', 'bg'],
  ['signal', 'surface'],
  ['on-signal', 'signal'],
]

describe('tokens.css', () => {
  it.each(Object.entries(APPROVED))('%s matches the approved night and day hex values', (role, [n, d]) => {
    expect(colour(night, role)).toBe(n)
    expect(colour(day, role)).toBe(d)
  })

  it('lists every approved hex value in docs/brand.md', () => {
    for (const [n, d] of Object.values(APPROVED)) {
      expect(brandDoc.toUpperCase()).toContain(n)
      expect(brandDoc.toUpperCase()).toContain(d)
    }
  })

  describe.each([
    ['night', night],
    ['day', day],
  ])('%s contrast', (name, theme) => {
    it.each(BODY_PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
      const ratio = contrast(colour(theme, fg), colour(theme, bg))
      console.info(`${name} ${fg} on ${bg}: ${ratio.toFixed(2)}`)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('crema on background is at least 3:1 (details and large text only)', () => {
      const ratio = contrast(colour(theme, 'crema'), colour(theme, 'bg'))
      console.info(`${name} crema on bg: ${ratio.toFixed(2)}`)
      expect(ratio).toBeGreaterThanOrEqual(3)
    })

    it('the focus ring (signal) is at least 3:1 on both backgrounds', () => {
      expect(contrast(colour(theme, 'signal'), colour(theme, 'bg'))).toBeGreaterThanOrEqual(3)
      expect(contrast(colour(theme, 'signal'), colour(theme, 'surface'))).toBeGreaterThanOrEqual(3)
    })
  })

  it('declares the font, space, radius and motion tokens', () => {
    for (const name of [
      '--font-display',
      '--font-text',
      '--space-1',
      '--space-4',
      '--space-8',
      '--radius-sm',
      '--radius-md',
      '--radius-pill',
      '--dur-ui',
      '--dur-ui-fast',
      '--dur-ui-slow',
      '--dur-chapter',
      '--dur-scene',
      '--ease-settle',
    ]) {
      expect(night[name], name).toBeTruthy()
    }
    expect(night['--dur-ui']).toBe('200ms')
    expect(night['--dur-ui-fast']).toBe('160ms')
    expect(night['--dur-ui-slow']).toBe('240ms')
    expect(night['--dur-chapter']).toBe('600ms')
    expect(night['--dur-scene']).toBe('1200ms')
  })

  it('uses a settling ease with no overshoot', () => {
    const match = /cubic-bezier\(([^)]+)\)/.exec(night['--ease-settle'] ?? '')
    expect(match).not.toBeNull()
    const [x1, y1, x2, y2] = (match?.[1] ?? '').split(',').map(Number) as [number, number, number, number]
    for (const y of [y1, y2]) {
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(1)
    }
    for (const x of [x1, x2]) expect(x).toBeGreaterThanOrEqual(0)
  })

  it('names the two self-hosted font families', () => {
    expect(night['--font-display']).toContain('Big Shoulders Display')
    expect(night['--font-text']).toContain('Atkinson Hyperlegible Next')
  })
})
