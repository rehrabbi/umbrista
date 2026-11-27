import { useEffect, useState } from 'react'

/**
 * Has the page finished loading (the window's load event)? Media that is not needed for the first
 * screen waits for it, so it never competes with the first screen's own image for the network.
 */
export function usePageLoaded(): boolean {
  const [loaded, setLoaded] = useState(() => document.readyState === 'complete')
  useEffect(() => {
    if (loaded) return
    const done = () => setLoaded(true)
    window.addEventListener('load', done, { once: true })
    return () => window.removeEventListener('load', done)
  }, [loaded])
  return loaded
}
