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

// Leaving Lenis on GSAP's ticker after the visitor leaves the landing is deliberate: it is still one loop.
driveWith((step) => {
  // The ticker's own time counts from when GSAP loaded, not from the page's start; Lenis keeps the
  // page's clock, the one the browser's loop gave it, so its steps never run backwards.
  const tick = () => step(performance.now())
  gsap.ticker.add(tick)
  return () => gsap.ticker.remove(tick)
})
onSmoothScroll(() => ScrollTrigger.update())

export { gsap, ScrollTrigger }
