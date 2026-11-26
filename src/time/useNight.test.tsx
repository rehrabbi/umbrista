import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetOverride } from './night-store'
import { clockNight, minutesToDusk, useNight, visitorDusk } from './useNight'

function withOffset(hours: number): void {
  // getTimezoneOffset is minutes WEST of UTC, so UTC+1 is -60.
  vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-hours * 60)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  resetOverride()
})

describe('visitor dusk estimate', () => {
  it('returns a valid Date for every whole offset from -12 h to +14 h, on several dates', () => {
    const dates = ['2026-01-15T12:00:00Z', '2026-03-29T01:30:00Z', '2026-06-21T12:00:00Z', '2026-10-25T01:30:00Z']
    for (let hours = -12; hours <= 14; hours++) {
      withOffset(hours)
      for (const iso of dates) {
        const now = new Date(iso)
        let dusk: Date | undefined
        expect(() => {
          dusk = visitorDusk(now)
        }).not.toThrow()
        expect(dusk).toBeInstanceOf(Date)
        expect(Number.isNaN((dusk as Date).getTime())).toBe(false)
        // The dusk is on the visitor's own day, within a day and a half of now.
        expect(Math.abs((dusk as Date).getTime() - now.getTime())).toBeLessThan(36 * 3600_000)
      }
    }
  })

  it('handles the half-hour and quarter-hour offsets too', () => {
    for (const hours of [5.5, 5.75, 9.5, -3.5, 12.75]) {
      withOffset(hours)
      expect(visitorDusk(new Date('2026-06-21T12:00:00Z'))).toBeInstanceOf(Date)
    }
  })

  it('lands in the early evening of the visitor local day', () => {
    withOffset(1) // UTC+1, longitude 15 E by the estimate
    const dusk = visitorDusk(new Date('2026-03-20T12:00:00Z'))
    const local = new Date(dusk.getTime() + 3600_000)
    expect(local.getUTCHours()).toBeGreaterThanOrEqual(17)
    expect(local.getUTCHours()).toBeLessThanOrEqual(19)
  })

  it('does not throw across a DST change date, whichever offset applies', () => {
    for (const hours of [0, 1]) {
      withOffset(hours)
      expect(visitorDusk(new Date('2026-03-29T00:59:00Z'))).toBeInstanceOf(Date)
      expect(visitorDusk(new Date('2026-03-29T01:00:00Z'))).toBeInstanceOf(Date)
    }
  })
})

describe('the night rule: from the visitor sunset until 06:00 local, day otherwise', () => {
  beforeEach(() => withOffset(0)) // UTC+0 for easy reading

  it('is day in the middle of the day', () => {
    expect(clockNight(new Date('2026-03-20T12:00:00Z'))).toBe(false)
  })

  it('is night at dusk exactly, and day one minute before', () => {
    const dusk = visitorDusk(new Date('2026-03-20T12:00:00Z'))
    expect(clockNight(dusk)).toBe(true)
    expect(clockNight(new Date(dusk.getTime() - 60_000))).toBe(false)
  })

  it('is night until 06:00 local and day from 06:00', () => {
    expect(clockNight(new Date('2026-03-21T00:00:00Z'))).toBe(true)
    expect(clockNight(new Date('2026-03-21T05:59:00Z'))).toBe(true)
    expect(clockNight(new Date('2026-03-21T06:00:00Z'))).toBe(false)
  })

  it('counts down to dusk by day and gives null at night', () => {
    const dusk = visitorDusk(new Date('2026-03-20T12:00:00Z'))
    expect(minutesToDusk(new Date(dusk.getTime() - 90 * 60_000))).toBe(90)
    expect(minutesToDusk(dusk)).toBeNull()
    expect(minutesToDusk(new Date('2026-03-21T02:00:00Z'))).toBeNull()
  })
})

describe('useNight', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    withOffset(0)
  })

  it('follows the clock and re-evaluates every minute', () => {
    vi.setSystemTime(new Date('2026-03-20T12:00:00Z'))
    const { result } = renderHook(() => useNight())
    expect(result.current.isNight).toBe(false)
    expect(result.current.override).toBeNull()
    expect(result.current.minutesToDusk).toBeGreaterThan(0)

    act(() => {
      vi.setSystemTime(new Date('2026-03-20T23:00:00Z'))
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.isNight).toBe(true)
    expect(result.current.minutesToDusk).toBeNull()
  })

  it('lets an override win both ways and returns to the clock on null', () => {
    vi.setSystemTime(new Date('2026-03-20T12:00:00Z'))
    const { result } = renderHook(() => useNight())

    act(() => result.current.setOverride('night'))
    expect(result.current.isNight).toBe(true)
    expect(result.current.override).toBe('night')

    act(() => result.current.setOverride('day'))
    expect(result.current.isNight).toBe(false)

    act(() => result.current.setOverride(null))
    expect(result.current.override).toBeNull()
    expect(result.current.isNight).toBe(false)
  })

  it('shares the override between components, and keeps it out of storage', () => {
    vi.setSystemTime(new Date('2026-03-20T12:00:00Z'))
    const a = renderHook(() => useNight())
    const b = renderHook(() => useNight())
    act(() => a.result.current.setOverride('night'))
    expect(b.result.current.override).toBe('night')
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it('re-evaluates when the tab becomes visible again', () => {
    vi.setSystemTime(new Date('2026-03-20T12:00:00Z'))
    const { result } = renderHook(() => useNight())
    expect(result.current.isNight).toBe(false)
    act(() => {
      vi.setSystemTime(new Date('2026-03-20T23:00:00Z'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.isNight).toBe(true)
  })
})
