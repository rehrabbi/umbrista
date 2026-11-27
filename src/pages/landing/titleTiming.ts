/*
 * The title's timing, kept to the motion band (scene changes take 0.6 to 1.2 seconds). Each letter
 * rises over --dur-chapter; the next starts STAGGER later. Scrolling back sinks the letters
 * SINK_SPEED times faster, but never quicker than the band allows.
 */

/** Seconds between one letter starting to rise and the next. */
export const STAGGER = 0.025
/**
 * The title sinks back this much faster than it rose. With the promise's 23 letters and a 0.6 s
 * rise: in about 1.15 s, out in about 0.64 s.
 */
export const SINK_SPEED = 1.8

/** How long the whole title takes to arrive, and to sink back, in seconds. */
export function titleTiming(letters: number, riseSec: number): { arrival: number; sink: number } {
  const arrival = riseSec + STAGGER * Math.max(0, letters - 1)
  return { arrival, sink: arrival / SINK_SPEED }
}
