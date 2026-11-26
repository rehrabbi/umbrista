import { useEffect, useState, type RefObject } from 'react'
import { usePrefersReducedMotion } from '../media/usePrefersReducedMotion'

/**
 * Should the scene in `ref` animate? False while the tab is hidden, while the element is off screen,
 * and always under reduced motion. The 3D host then drops its frame loop to on-demand.
 */
export function useSceneActive(ref: RefObject<Element | null>): boolean {
  const reduced = usePrefersReducedMotion()
  const [visible, setVisible] = useState(() => !document.hidden)
  // Without IntersectionObserver there is nothing to measure, so the scene counts as on screen.
  const [onScreen, setOnScreen] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setOnScreen(entry.isIntersecting)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return visible && onScreen && !reduced
}
