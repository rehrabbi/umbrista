/*
 * The landing's scroll journey: the café's night in five chapters. Chapter 1 is built (Task 8);
 * the others are data that the journey renders once the hero cup exists (Task 9).
 *
 * Journey progress counts chapters: 0 is the top of chapter 1, 1 its end, 1.5 halfway through
 * chapter 2, and so on up to CHAPTERS.length.
 */
import type { LoopName, StillName } from '../../media/manifest'

export type Vec3 = [number, number, number]

export interface Chapter {
  id: string
  /** The chapter's name, shown small with its number. */
  title: string
  /** The chapter's one line in the brand voice; chapter 1's is the landing's promise. */
  line: string
  /** Where the camera travels through the chapter. A placeholder until the cup's scene exists. */
  camera: { from: Vec3; to: Vec3 }
  /** The photograph behind the chapter, from public/media. */
  still: StillName
  /** A silent loop that plays over the still, from public/media. */
  loop?: LoopName
}

/** Until Task 9 sets the cup's camera, every chapter looks straight at the scene. */
const AT_REST = { from: [0, 0, 5] as Vec3, to: [0, 0, 5] as Vec3 }

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'dusk',
    title: 'Dusk on the street',
    line: 'We open when the light goes.',
    camera: AT_REST,
    still: 'street-dusk',
  },
  {
    id: 'cup',
    title: 'The cup under the lamp',
    line: 'One lamp, one cup, and the whole night ahead of it.',
    camera: AT_REST,
    // Placeholder: Task 9 renders this chapter's still from the cup model itself.
    still: 'crema-macro',
  },
  {
    id: 'craft',
    title: 'The craft',
    line: 'Beans roasted for the dark. Milk steamed slowly.',
    camera: AT_REST,
    still: 'crema-macro',
    loop: 'steam-loop',
  },
  {
    id: 'window',
    title: 'The window',
    line: 'A table by the glass, kept for whoever needs it at two.',
    camera: AT_REST,
    still: 'rain-window',
  },
  {
    id: 'last-cup',
    title: 'The last cup',
    line: 'We close at three. The last cup is never rushed.',
    camera: AT_REST,
    // Placeholder: the last cup has no photograph of its own yet (a candidate asset, on the owner's go).
    still: 'rain-window',
  },
]

/** Which chapter a journey progress falls in, and how far through it (0..1). */
export function chapterAt(progress: number): { index: number; local: number } {
  const last = CHAPTERS.length - 1
  if (!(progress > 0)) return { index: 0, local: 0 }
  if (progress >= CHAPTERS.length) return { index: last, local: 1 }
  const index = Math.floor(progress)
  return { index, local: progress - index }
}

/**
 * Chapter 1's beats, as fractions of its pinned scroll. Dusk sits on the street, the lamps come on,
 * then the promise arrives; the rest of the pin leaves time to read it.
 */
export const OPENING = {
  /** The lamps start to come on here... */
  lampsFrom: 0.08,
  /** ...and are fully on here. */
  lampsTo: 0.52,
  /** The title plays once the visitor scrolls past this point, and sinks back above it. */
  titleAt: 0.46,
} as const

/** How far the lamps are on (0..1) at a point in chapter 1: a smooth rise, like a lamp warming. */
export function lampAt(progress: number): number {
  if (!(progress > OPENING.lampsFrom)) return 0
  if (progress >= OPENING.lampsTo) return 1
  const t = (progress - OPENING.lampsFrom) / (OPENING.lampsTo - OPENING.lampsFrom)
  return t * t * (3 - 2 * t)
}
