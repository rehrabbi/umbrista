import { useLayoutEffect } from 'react'
import { useNight } from './useNight'

/** Mount once. Set before first paint, so a daytime visitor never sees the night colours flash. Keeps `data-time` on <html> at "night" or "day"; the tokens do the rest. */
export function TimeOfDay() {
  const { isNight } = useNight()
  useLayoutEffect(() => {
    document.documentElement.dataset.time = isNight ? 'night' : 'day'
  }, [isNight])
  return null
}
