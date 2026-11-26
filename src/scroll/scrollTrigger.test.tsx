import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSmoothScroll } from './useSmoothScroll'

// Lenis only needs to record the clock it is given: it smooths by the difference between calls.
const lenis = vi.hoisted(() => ({ times: [] as number[] }))

vi.mock('lenis', () => ({
  default: class FakeLenis {
    raf(time: number) {
      lenis.times.push(time)
    }
    on() {
      return () => {}
    }
    destroy() {}
  },
}))

function Probe() {
  useSmoothScroll()
  return null
}

function frames(n: number) {
  return new Promise<void>((resolve) => {
    let left = n
    const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick))
    requestAnimationFrame(tick)
  })
}

describe('handing Lenis to GSAP', () => {
  it('keeps Lenis on one clock across the handover, so its time never runs backwards', async () => {
    render(<Probe />)
    // A while on the browser's loop first, as on a page the visitor has been reading.
    await new Promise((resolve) => setTimeout(resolve, 300))
    await frames(3)
    const before = lenis.times.length
    expect(before).toBeGreaterThan(0)

    // Loading the bridge hands the loop to GSAP's ticker, whose own clock starts at zero.
    await import('./scrollTrigger')
    await frames(6)

    const times = lenis.times
    expect(times.length).toBeGreaterThan(before + 2)
    for (let i = 1; i < times.length; i++) expect(times[i]!, `step ${i}`).toBeGreaterThanOrEqual(times[i - 1]!)
    // And it keeps moving after the handover rather than standing still.
    expect(times.at(-1)!).toBeGreaterThan(times[before]!)
  })
})
