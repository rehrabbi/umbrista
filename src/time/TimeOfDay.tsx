import { useEffect } from 'react'
import { useNight } from './useNight'

/** Mount once. Keeps `data-time` on <html> at "night" or "day"; the tokens do the rest. */
export function TimeOfDay() {
  const { isNight } = useNight()
  useEffect(() => {
    document.documentElement.dataset.time = isNight ? 'night' : 'day'
  }, [isNight])
  return null
}
