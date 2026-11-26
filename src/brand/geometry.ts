// The Logo A "Long shadow" mark as data, plus the brand colours. Logo.tsx draws from this, and
// scripts/render-icons.mjs writes every logo file and icon from it, so there is one drawing.
// Source drawings: docs/brand/board/logo-a-on-dark.svg and logo-a-16-on-dark.svg.
import { WORDMARK_BOX, WORDMARK_PATH } from './wordmark-path'

export type Box = readonly [x: number, y: number, width: number, height: number]

/** Which colour a shape takes: the cup (and its handle), the long shadow, or the crema on top. */
export type Role = 'body' | 'shadow' | 'crema'

export type Shape =
  | { readonly tag: 'path'; readonly role: Role; readonly d: string; readonly stroke?: number }
  | { readonly tag: 'ellipse'; readonly role: Role; readonly cx: number; readonly cy: number; readonly rx: number; readonly ry: number }

export interface MarkDrawing {
  readonly viewBox: Box
  /** A transform for the group holding the shapes, if the drawing needs one. */
  readonly transform?: string
  readonly shapes: readonly Shape[]
}

/** The full drawing, for 24 px and up. A cup with a handle, and a shadow far longer than the cup. */
export const MARK_FULL: MarkDrawing = {
  viewBox: [0, 0, 64, 64],
  transform: 'translate(0 -2)',
  shapes: [
    {
      tag: 'path',
      role: 'shadow',
      d: 'M14.5 43 C14.5 40.9 18 40.4 22 40.6 L59 44 C61.2 44.2 61.2 47.6 59 47.8 L22 46.4 C18 46.3 14.5 45.2 14.5 43 Z',
    },
    { tag: 'path', role: 'body', d: 'M12 28.5 C6.2 28.5 5.6 36.5 13.4 36.5', stroke: 3 },
    { tag: 'path', role: 'body', d: 'M11 24 C11 35.5 15 43 22 43 C29 43 33 35.5 33 24 Z' },
    { tag: 'ellipse', role: 'crema', cx: 22, cy: 24, rx: 11, ry: 3.4 },
  ],
}

/** The simplified drawing for 16 and 32 px: no handle, a solid bowl with a crema cap over a thick shadow bar. */
export const MARK_SMALL: MarkDrawing = {
  viewBox: [0, 0, 16, 16],
  shapes: [
    { tag: 'path', role: 'shadow', d: 'M5 10.2 L15 10.8 V13.6 L5.5 13.2 Z' },
    { tag: 'path', role: 'body', d: 'M1 5 C1 9.8 2.9 12.6 5.5 12.6 C8.1 12.6 10 9.8 10 5 Z' },
    { tag: 'ellipse', role: 'crema', cx: 5.5, cy: 5, rx: 4.5, ry: 1.6 },
  ],
}

/** The ink around the full mark, without the empty margin of its 64-unit square. */
const MARK_INK: Box = [4.5, 17, 57, 30]

/** The wordmark: UMBRISTA outlined from Big Shoulders Display 800, cropped to its letters. */
export const WORDMARK = { path: WORDMARK_PATH, viewBox: WORDMARK_BOX } as const

const LOCKUP_TEXT_SCALE = 0.3
const LOCKUP_GAP = 8
const lockupTextWidth = WORDMARK_BOX[2] * LOCKUP_TEXT_SCALE
const lockupTextHeight = WORDMARK_BOX[3] * LOCKUP_TEXT_SCALE
const lockupHeight = Math.max(MARK_INK[3], lockupTextHeight)

/** The mark and the wordmark side by side, the text centred on the cup. */
export const LOCKUP = {
  viewBox: [0, 0, round(MARK_INK[2] + LOCKUP_GAP + lockupTextWidth), lockupHeight] as Box,
  /** Where the full mark's 64-unit square sits, so that its ink starts at the origin. */
  mark: { x: -MARK_INK[0], y: -MARK_INK[1] },
  wordmark: {
    x: MARK_INK[2] + LOCKUP_GAP - WORDMARK_BOX[0] * LOCKUP_TEXT_SCALE,
    y: (lockupHeight - lockupTextHeight) / 2 - WORDMARK_BOX[1] * LOCKUP_TEXT_SCALE,
    scale: LOCKUP_TEXT_SCALE,
  },
} as const

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export interface ThemeColors {
  readonly bg: string
  readonly surface: string
  readonly text: string
  readonly textQuiet: string
  readonly signal: string
  readonly onSignal: string
  readonly crema: string
  readonly shadow: string
}

/** The approved palette (docs/brand.md, Palette 1 "Sodium"). tokens.css holds the same values. */
export const BRAND_COLORS: { readonly night: ThemeColors; readonly day: ThemeColors } = {
  night: {
    bg: '#0D1524',
    surface: '#15203A',
    text: '#E4E8EF',
    textQuiet: '#97A3B8',
    signal: '#F4A13A',
    onSignal: '#0D1524',
    crema: '#D3B48C',
    shadow: '#5B6F93',
  },
  day: {
    bg: '#DCE3EC',
    surface: '#EEF2F6',
    text: '#0D1524',
    textQuiet: '#46536A',
    signal: '#965000',
    onSignal: '#EEF2F6',
    crema: '#7E6040',
    shadow: '#7D8AA2',
  },
}

/** The three logo colours in a theme: the cup and wordmark, the long shadow, and the lit top. */
export interface LogoColors {
  readonly body: string
  readonly shadow: string
  readonly crema: string
}

export function logoColors(theme: ThemeColors): LogoColors {
  return { body: theme.text, shadow: theme.shadow, crema: theme.signal }
}

const num = (n: number): string => String(round(n))

/** The shapes of a drawing as SVG markup, filled with plain colours (for files, not for the page). */
export function markMarkup(mark: MarkDrawing, colors: LogoColors): string {
  const shapes = mark.shapes
    .map((shape) => {
      const colour = colors[shape.role]
      if (shape.tag === 'ellipse') {
        return `<ellipse fill="${colour}" cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}"/>`
      }
      return shape.stroke
        ? `<path fill="none" stroke="${colour}" stroke-width="${shape.stroke}" stroke-linecap="round" d="${shape.d}"/>`
        : `<path fill="${colour}" d="${shape.d}"/>`
    })
    .join('')
  return mark.transform ? `<g transform="${mark.transform}">${shapes}</g>` : shapes
}

/** The wordmark's outlines as SVG markup, in the path's own coordinates. */
export function wordmarkMarkup(colors: LogoColors): string {
  return `<path fill="${colors.body}" d="${WORDMARK.path}"/>`
}

/** The lockup as SVG markup in the lockup's own viewBox. */
export function lockupMarkup(colors: LogoColors): string {
  const { mark, wordmark } = LOCKUP
  return (
    `<g transform="translate(${num(mark.x)} ${num(mark.y)})">${markMarkup(MARK_FULL, colors)}</g>` +
    `<g transform="translate(${num(wordmark.x)} ${num(wordmark.y)}) scale(${wordmark.scale})">${wordmarkMarkup(colors)}</g>`
  )
}
