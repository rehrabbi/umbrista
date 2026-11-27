/*
 * The landing's scroll journey: the café's night in five chapters (owner decision 2026-11-27):
 * the craft (the hero: the crema and its steam, full screen), the cup under the lamp, dusk on the
 * street, the window, the last cup. The hero cup appears in the second chapter and stays with the
 * visitor to the end, its coffee changing as the chapters pass (liquidLook.ts).
 *
 * Journey progress counts chapters: 0 is the top of the first chapter, 1 its end, 1.5 halfway
 * through the second, and so on up to CHAPTERS.length. A chapter is "halfway" when its middle is at
 * the middle of the screen.
 */
import type { LoopName, StillName } from '../../media/manifest'

export type Vec3 = [number, number, number]

/**
 * Where the camera looks at the cup from: [azimuth in degrees around the cup, polar angle in degrees
 * from straight above, distance as a multiple of the distance that just frames the cup].
 */
export type Orbit = Vec3

export interface Chapter {
  id: string
  /** The chapter's name, shown small with its number. */
  title: string
  /** The chapter's one line in the brand voice; the first chapter's is the landing's promise. */
  line: string
  /** How the camera moves around the cup through the chapter, from its start to its end. */
  camera: { from: Orbit; to: Orbit }
  /** The photograph that fills the chapter, edge to edge, from public/media. None for a lit-only scene. */
  still?: StillName
  /** A silent loop that plays over the still, edge to edge, from public/media. */
  loop?: LoopName
}

/**
 * The cup at rest: turned a little, seen from high enough to look into the crema. It is the pose
 * the cup's still is rendered in (npm run cup-still), the live cup's first frame, and the one view
 * under reduced motion, so the still and the live cup always meet in the same place.
 */
export const CUP_REST: Orbit = [35, 58, 1.04]

/** The one view of the cup under reduced motion: the rest pose, never moving. */
export const CUP_STILL_VIEW: Orbit = CUP_REST

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'craft',
    title: 'The craft',
    line: 'We open when the light goes.',
    camera: { from: CUP_REST, to: CUP_REST },
    still: 'steam-loop-poster',
    loop: 'steam-loop',
  },
  {
    id: 'cup',
    title: 'The cup under the lamp',
    line: 'One lamp, one cup, and the whole night ahead of it.',
    // The cup turns in the lamp and the camera rises to look into the crema.
    camera: { from: CUP_REST, to: [100, 48, 1.0] },
  },
  {
    id: 'dusk',
    title: 'Dusk on the street',
    line: 'The street goes blue, and the lamps come on one by one.',
    // Looking down into the cup as the milk goes in.
    camera: { from: [100, 48, 1.0], to: [175, 34, 0.96] },
    still: 'street-dusk',
  },
  {
    id: 'window',
    title: 'The window',
    line: 'A table by the glass, kept for whoever needs it at two.',
    // The art, from above, turning slowly.
    camera: { from: [175, 34, 0.96], to: [250, 40, 0.98] },
    still: 'rain-window',
  },
  {
    id: 'last-cup',
    title: 'The last cup',
    line: 'We close at three. The last cup is never rushed.',
    // Stepping back from the cup, as the night ends.
    camera: { from: [250, 40, 0.98], to: [300, 64, 1.12] },
  },
]

/** The index of a chapter by its id (the ids above are fixed). */
export function chapterIndex(id: string): number {
  return CHAPTERS.findIndex((chapter) => chapter.id === id)
}

/** Which chapter a journey progress falls in, and how far through it (0..1). */
export function chapterAt(progress: number): { index: number; local: number } {
  const last = CHAPTERS.length - 1
  if (!(progress > 0)) return { index: 0, local: 0 }
  if (progress >= CHAPTERS.length) return { index: last, local: 1 }
  const index = Math.floor(progress)
  return { index, local: progress - index }
}

/** Where the camera is at a journey progress: each chapter's move, from its start to its end. */
export function orbitAt(progress: number): Orbit {
  const { index, local } = chapterAt(progress)
  const { from, to } = CHAPTERS[index]!.camera
  // Linear within each chapter: the smooth scroll already eases the visitor's hand, and a curve per
  // chapter would make the camera stop at every chapter change.
  return [from[0] + (to[0] - from[0]) * local, from[1] + (to[1] - from[1]) * local, from[2] + (to[2] - from[2]) * local]
}

/**
 * The street chapter's beats, as fractions of the chapter (its top at the middle of the screen is 0,
 * its bottom there is 1). The chapter is pinned for most of that: the street sits at dusk, the
 * lamps come on, then the rest of the pin leaves time to look.
 */
export const DUSK = {
  /** The lamps start to come on here... */
  lampsFrom: 0.27,
  /** ...and are fully on here. */
  lampsTo: 0.55,
} as const

/** How far the lamps are on (0..1) at a point in the street chapter: a smooth rise, like a lamp warming. */
export function lampAt(local: number): number {
  if (!(local > DUSK.lampsFrom)) return 0
  if (local >= DUSK.lampsTo) return 1
  const t = (local - DUSK.lampsFrom) / (DUSK.lampsTo - DUSK.lampsFrom)
  return t * t * (3 - 2 * t)
}

/** The lamps at a journey progress: off before the street chapter, rising through it, on after it. */
export function lampsAt(progress: number): number {
  const dusk = chapterIndex('dusk')
  const { index, local } = chapterAt(progress)
  if (index < dusk) return 0
  if (index > dusk) return 1
  return lampAt(local)
}
