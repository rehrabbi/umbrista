import { createContext, useContext, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { useLocation } from 'react-router'
import { titleFor } from './titles'

/** Remembers which path the page is settled on, so focus moves only when the path really changes. */
export class RouteFocusTracker {
  private settledPath: string

  /** `firstPath` is the path of the first render. Focus is never moved for it. */
  constructor(firstPath: string) {
    this.settledPath = firstPath
  }

  /** True once per change of path; a change of hash or query alone does not count. */
  claim(pathname: string): boolean {
    if (pathname === this.settledPath) return false
    this.settledPath = pathname
    return true
  }
}

const RouteFocusContext = createContext<RouteFocusTracker | null>(null)
export const RouteFocusProvider = RouteFocusContext.Provider

/**
 * Sets the document title for the current route and prepares focus management: after an in-app
 * navigation, the new page's heading (see PageHeading) takes focus, so keyboard and screen reader
 * users land at the top of the new page. Nothing is focused on the first load.
 * Provide the returned tracker with `RouteFocusProvider`.
 */
export function useRouteFocus(): RouteFocusTracker {
  const { pathname } = useLocation()
  const [tracker] = useState(() => new RouteFocusTracker(pathname))

  useEffect(() => {
    document.title = titleFor(pathname)
  }, [pathname])

  return tracker
}

/** Focus `heading` when the path has changed through in-app navigation and no heading has claimed it yet. */
export function useFocusOnNavigation(heading: RefObject<HTMLElement | null>): void {
  const tracker = useContext(RouteFocusContext)
  const { pathname } = useLocation()

  useEffect(() => {
    if (tracker?.claim(pathname)) heading.current?.focus({ preventScroll: true })
  }, [pathname, tracker, heading])
}
