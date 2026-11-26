import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { driveWith, onSmoothScroll } from './useSmoothScroll'

/*
 * GSAP and ScrollTrigger, joined to the page's one Lenis. Loaded only by pages that choreograph
 * scroll, so GSAP never sits on the first paint's critical path.
 *
 * - Lenis moves the page inside GSAP's ticker, so the scroll and every scrubbed animation advance
 *   in the same frame, from one loop. The browser loop Lenis had until now is stopped.
 * - Every Lenis scroll updates ScrollTrigger at once, rather than on the next native scroll event.
 * - Lag smoothing is off: after a slow frame GSAP would otherwise slow its clock, and the page and
 *   its animations would drift apart.
 *
 * Under reduced motion there is no Lenis; ScrollTrigger then follows native scrolling on its own.
 */
gsap.registerPlugin(ScrollTrigger)
gsap.ticker.lagSmoothing(0)

driveWith((step) => {
  // The ticker's time is in seconds; Lenis takes milliseconds.
  const tick = (time: number) => step(time * 1000)
  gsap.ticker.add(tick)
  return () => gsap.ticker.remove(tick)
})
onSmoothScroll(() => ScrollTrigger.update())

export { gsap, ScrollTrigger }
