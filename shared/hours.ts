/*
 * The café's hours. Pure and runtime-agnostic: no imports, no DOM, no React, so the booking
 * functions on the server can use the same code as the page.
 *
 * Calvessa's clock is the café's clock: it opens at the computed sunset and closes at 03:00 café
 * time. Times before 03:00 belong to the night that began the day before.
 */

export const CAFE = {
  lat: 38.81,
  /** East is positive, so west is negative. */
  lon: -9.47,
  timeZone: 'Europe/Lisbon',
  close: '03:00',
} as const

const DAY = 86_400_000
const CLOSE_HOUR = 3

const rad = (degrees: number): number => (degrees * Math.PI) / 180
const deg = (radians: number): number => (radians * 180) / Math.PI

/** Sun's equation of time (minutes) and declination (degrees) at a Julian century. NOAA formulas. */
function solarPosition(t: number): { eqTime: number; declination: number } {
  const l0 = (((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360) + 360) % 360
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t)
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
  const mr = rad(m)
  const c =
    Math.sin(mr) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * mr) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * mr) * 0.000289
  const omega = 125.04 - 1934.136 * t
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(rad(omega))
  const meanObliquity = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
  const obliquity = meanObliquity + 0.00256 * Math.cos(rad(omega))
  const declination = deg(Math.asin(Math.sin(rad(obliquity)) * Math.sin(rad(lambda))))
  const y = Math.tan(rad(obliquity) / 2) ** 2
  const l0r = rad(l0)
  const eqTime =
    4 *
    deg(
      y * Math.sin(2 * l0r) -
        2 * e * Math.sin(mr) +
        4 * e * y * Math.sin(mr) * Math.cos(2 * l0r) -
        0.5 * y * y * Math.sin(4 * l0r) -
        1.25 * e * e * Math.sin(2 * mr),
    )
  return { eqTime, declination }
}

/** Minutes after 00:00 UTC of the day's date at which the sun sets, or null if it does not. */
function sunsetMinutes(dayStartMs: number, lat: number, lon: number, atMinutes: number): number | null {
  const julianDay = dayStartMs / DAY + 2440587.5 + atMinutes / 1440
  const { eqTime, declination } = solarPosition((julianDay - 2451545) / 36525)
  // Hour angle of the sun's centre at the horizon, with refraction (zenith 90.833 degrees).
  const cosHourAngle =
    Math.cos(rad(90.833)) / (Math.cos(rad(lat)) * Math.cos(rad(declination))) -
    Math.tan(rad(lat)) * Math.tan(rad(declination))
  if (!(cosHourAngle >= -1 && cosHourAngle <= 1)) return null
  return 720 - 4 * (lon - deg(Math.acos(cosHourAngle))) - eqTime
}

/**
 * The sunset on the calendar day (UTC year, month and day) of `date`, at `lat` and `lon` (east
 * positive). The result is on that local solar day, so it can fall just outside that UTC day.
 * Returns null only when the sun does not set (polar day or night).
 */
export function sunset(date: Date, lat: number, lon: number): Date | null {
  const dayStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  // Solar noon is a good first guess for the time of day; one more pass settles it.
  let minutes = sunsetMinutes(dayStart, lat, lon, 720 - 4 * lon)
  if (minutes === null) return null
  minutes = sunsetMinutes(dayStart, lat, lon, minutes)
  if (minutes === null) return null
  return new Date(dayStart + Math.round(minutes * 60) * 1000)
}

interface Parts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function zonedParts(ms: number, timeZone: string): Parts {
  let format = formatters.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    })
    formatters.set(timeZone, format)
  }
  const out: Record<string, number> = {}
  for (const part of format.formatToParts(new Date(ms))) {
    if (part.type !== 'literal') out[part.type] = Number(part.value)
  }
  return {
    year: out.year ?? 0,
    month: out.month ?? 0,
    day: out.day ?? 0,
    hour: (out.hour ?? 0) % 24,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  }
}

/** The zone's offset from UTC at an instant, in milliseconds. */
function zoneOffset(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000
}

/** The instant at which a zone's wall clock reads the given date and time. */
function zonedToInstant(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  // The offset in force depends on the answer, so look it up at the guess and check it again once.
  // 03:00 is never inside a repeated or skipped hour in Lisbon (changes happen at 01:00 UTC).
  let instant = wall - zoneOffset(wall, timeZone)
  const corrected = wall - zoneOffset(instant, timeZone)
  if (corrected !== instant) instant = corrected
  return new Date(instant)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** The café night (YYYY-MM-DD in café time) a moment belongs to. Before 03:00 is the night before. */
export function cafeNight(at: Date): string {
  const p = zonedParts(at.getTime(), CAFE.timeZone)
  const calendarDay = Date.UTC(p.year, p.month - 1, p.day)
  return isoDate(p.hour < CLOSE_HOUR ? calendarDay - DAY : calendarDay)
}

/** When a café night opens (the day's sunset at the café) and closes (03:00 café time next morning). */
export function openingWindow(night: string): { opens: Date; closes: Date } {
  const [year = 0, month = 1, day = 1] = night.split('-').map(Number)
  const dayStart = new Date(Date.UTC(year, month - 1, day))
  // Calvessa has a sunset every day of the year; the fallback is only a guard for impossible input.
  const opens = sunset(dayStart, CAFE.lat, CAFE.lon) ?? new Date(Date.UTC(year, month - 1, day, 18))
  const next = new Date(dayStart.getTime() + DAY)
  const closes = zonedToInstant(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    CLOSE_HOUR,
    0,
    CAFE.timeZone,
  )
  return { opens, closes }
}

/** Open from sunset (inclusive) until 03:00 café time (exclusive). */
export function isOpen(at: Date): boolean {
  const { opens, closes } = openingWindow(cafeNight(at))
  const t = at.getTime()
  return t >= opens.getTime() && t < closes.getTime()
}
