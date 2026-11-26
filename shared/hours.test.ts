import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CAFE, cafeNight, isOpen, openingWindow, sunset } from './hours'

const MIN = 60_000

/** HH:MM of an instant in the café's zone, 24-hour. */
function cafeClock(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CAFE.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at)
}

function minutesApart(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / MIN
}

describe('CAFE', () => {
  it('sits at Calvessa on the Lisbon clock and closes at 03:00', () => {
    expect(CAFE).toEqual({ lat: 38.81, lon: -9.47, timeZone: 'Europe/Lisbon', close: '03:00' })
  })
})

describe('sunset', () => {
  // Published values, read from timeanddate.com's sun tables (timeanddate.com/sun/...) on 2026-11-26.
  // Local times were converted to UTC with the zone's offset on that date. Tolerance is 3 minutes.
  //   Lisbon (38.72 N, 9.14 W), 2025-06-21: sunset 21:04 WEST (UTC+1) = 20:04 UTC
  //   Lisbon (38.72 N, 9.14 W), 2025-12-21: sunset 17:18 WET  (UTC+0) = 17:18 UTC
  //   New York (40.71 N, 74.01 W), 2025-03-20: sunset 19:08 EDT (UTC-4) = 23:08 UTC
  const cases = [
    { name: 'Lisbon, June solstice', day: '2025-06-21', lat: 38.72, lon: -9.14, utc: '2025-06-21T20:04:00Z' },
    { name: 'Lisbon, December solstice', day: '2025-12-21', lat: 38.72, lon: -9.14, utc: '2025-12-21T17:18:00Z' },
    { name: 'New York, March equinox', day: '2025-03-20', lat: 40.71, lon: -74.01, utc: '2025-03-20T23:08:00Z' },
  ]
  for (const c of cases) {
    it(`matches the published time: ${c.name}`, () => {
      const result = sunset(new Date(`${c.day}T00:00:00Z`), c.lat, c.lon)
      expect(result).toBeInstanceOf(Date)
      expect(minutesApart(result as Date, new Date(c.utc))).toBeLessThanOrEqual(3)
    })
  }

  it('returns null where the sun does not set (Longyearbyen, midsummer)', () => {
    expect(sunset(new Date('2025-06-21T00:00:00Z'), 78.22, 15.65)).toBeNull()
  })

  it('returns null in polar night too', () => {
    expect(sunset(new Date('2025-12-21T00:00:00Z'), 78.22, 15.65)).toBeNull()
  })
})

describe('cafeNight', () => {
  it('puts 01:30 café time on the previous date', () => {
    expect(cafeNight(new Date('2026-01-15T01:30:00Z'))).toBe('2026-01-14')
  })

  it('switches to the new date at 03:00 café time', () => {
    expect(cafeNight(new Date('2026-01-15T02:59:00Z'))).toBe('2026-01-14')
    expect(cafeNight(new Date('2026-01-15T03:00:00Z'))).toBe('2026-01-15')
  })

  it('uses café time, not UTC, in summer', () => {
    // 02:30 UTC is 03:30 in Lisbon in July: already the new night.
    expect(cafeNight(new Date('2026-07-15T02:30:00Z'))).toBe('2026-07-15')
    // 01:30 UTC is 02:30 in Lisbon: still the old night.
    expect(cafeNight(new Date('2026-07-15T01:30:00Z'))).toBe('2026-07-14')
  })
})

describe('openingWindow and isOpen', () => {
  const night = '2026-01-15'
  const { opens, closes } = openingWindow(night)

  it('opens at the computed sunset and closes at 03:00 the next morning, café time', () => {
    expect(opens.getTime()).toBe(sunset(new Date('2026-01-15T00:00:00Z'), CAFE.lat, CAFE.lon)?.getTime())
    expect(closes.toISOString()).toBe('2026-01-16T03:00:00.000Z')
    expect(cafeClock(closes)).toBe('03:00')
  })

  it('is closed 30 minutes before sunset and open one minute after it', () => {
    expect(isOpen(new Date(opens.getTime() - 30 * MIN))).toBe(false)
    expect(isOpen(new Date(opens.getTime() + MIN))).toBe(true)
  })

  it('is open at 02:59 and closed at 03:00 exactly', () => {
    expect(isOpen(new Date('2026-01-16T02:59:00Z'))).toBe(true)
    expect(isOpen(new Date('2026-01-16T03:00:00Z'))).toBe(false)
  })

  it('is open at 01:30 café time, on the night that began the day before', () => {
    expect(isOpen(new Date('2026-01-16T01:30:00Z'))).toBe(true)
  })

  it('is closed in the daytime', () => {
    expect(isOpen(new Date('2026-01-15T12:00:00Z'))).toBe(false)
  })

  describe('across Lisbon daylight-saving changes', () => {
    it('closes at 03:00 local on the night clocks go forward (2026-03-29)', () => {
      const w = openingWindow('2026-03-28')
      expect(cafeClock(w.closes)).toBe('03:00')
      // 03:00 WEST is 02:00 UTC.
      expect(w.closes.toISOString()).toBe('2026-03-29T02:00:00.000Z')
      expect(isOpen(new Date('2026-03-29T01:59:00Z'))).toBe(true)
      expect(isOpen(new Date('2026-03-29T02:00:00Z'))).toBe(false)
    })

    it('closes at 03:00 local on the night clocks go back (2026-10-25)', () => {
      const w = openingWindow('2026-10-24')
      expect(cafeClock(w.closes)).toBe('03:00')
      // After the change Lisbon is on UTC+0, so 03:00 is 03:00 UTC.
      expect(w.closes.toISOString()).toBe('2026-10-25T03:00:00.000Z')
      expect(isOpen(new Date('2026-10-25T02:59:00Z'))).toBe(true)
      expect(isOpen(new Date('2026-10-25T03:00:00Z'))).toBe(false)
    })

    it('the night after each change still opens at sunset and closes at 03:00', () => {
      for (const n of ['2026-03-29', '2026-10-25']) {
        const w = openingWindow(n)
        expect(cafeClock(w.closes)).toBe('03:00')
        expect(w.closes.getTime()).toBeGreaterThan(w.opens.getTime())
        expect(cafeNight(new Date(w.opens.getTime() + MIN))).toBe(n)
      }
    })

    it('treats both 01:30s of the clocks-back night as the same café night', () => {
      expect(cafeNight(new Date('2026-10-25T00:30:00Z'))).toBe('2026-10-24') // 01:30 WEST
      expect(cafeNight(new Date('2026-10-25T01:30:00Z'))).toBe('2026-10-24') // 01:30 WET
    })
  })
})

describe('portability', () => {
  it('imports nothing and touches no browser or React API', () => {
    const source = readFileSync('shared/hours.ts', 'utf8')
    expect(source).not.toMatch(/^\s*import\s/m)
    expect(source).not.toMatch(/\b(document|window|localStorage|navigator)\b/)
  })
})
