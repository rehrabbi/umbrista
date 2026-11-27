/*
 * The title's timing, kept to the motion band (scene changes take 0.6 to 1.2 seconds). Each letter
 * rises over --dur-chapter; the next starts STAGGER later.
 */

/** Seconds between one letter starting to rise and the next. */
export const STAGGER = 0.025

/** How long the whole title takes to arrive, in seconds. With the promise's 23 letters, about 1.15 s. */
export function titleTiming(letters: number, riseSec: number): { arrival: number } {
  return { arrival: riseSec + STAGGER * Math.max(0, letters - 1) }
}
