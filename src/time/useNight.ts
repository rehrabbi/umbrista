import { useSyncExternalStore } from 'react'
import { sunset } from '../../shared/hours'
import { getOverride, setOverride, subscribe, type Override } from './night-store'
import { useNow } from './useNow'

/*
 * The scene's clock: the visitor's own dusk, never the café's. There is no location prompt, so the
 * place is guessed from the time zone: longitude from the offset (15 degrees per hour), and a fixed
 * latitude of 30 degrees. That is rough, and good enough to dim the page at about the right time.
 *
 * The rule: it is night from the visitor's sunset until 06:00 local the next morning, and day
 * otherwise. An override ('night' or 'day') beats the clock.
 */

const VISITOR_LAT = 30
const MORNING_HOUR = 6
const MS_PER_MINUTE = 60_000

/** The visitor's wall clock as a Date whose UTC fields read local time. Uses the device's offset. */
function wallClock(now: Date): Date {
  return new Date(now.getTime() - now.getTimezoneOffset() * MS_PER_MINUTE)
}

/** The visitor's estimated sunset on their own calendar day. Always a valid Date. */
export function visitorDusk(now: Date): Date {
  const lon = -now.getTimezoneOffset() / 4
  const wall = wallClock(now)
  const day = new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()))
  // At latitude 30 the sun always sets; if that ever failed, fall back to 18:00 local.
  return sunset(day, VISITOR_LAT, lon) ?? new Date(day.getTime() + 18 * 60 * MS_PER_MINUTE + now.getTimezoneOffset() * MS_PER_MINUTE)
}

/** Is it night by the clock alone: from today's dusk until 06:00 local? */
export function clockNight(now: Date): boolean {
  if (wallClock(now).getUTCHours() < MORNING_HOUR) return true
  return now.getTime() >= visitorDusk(now).getTime()
}

/** Whole minutes until the visitor's dusk, or null once it is night. */
export function minutesToDusk(now: Date): number | null {
  if (clockNight(now)) return null
  return Math.round((visitorDusk(now).getTime() - now.getTime()) / MS_PER_MINUTE)
}

export interface NightState {
  isNight: boolean
  minutesToDusk: number | null
  override: Override
  setOverride(value: Override): void
}

export function useNight(): NightState {
  const now = useNow()
  const override = useSyncExternalStore(subscribe, getOverride, getOverride)
  const clock = clockNight(now)
  const isNight = override === 'night' || (override !== 'day' && clock)
  return {
    isNight,
    minutesToDusk: isNight ? null : minutesToDusk(now),
    override,
    setOverride,
  }
}
