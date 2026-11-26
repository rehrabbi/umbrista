import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useFocusOnNavigation } from '../app/useRouteFocus'
import './PageHeading.css'

/** The page's one h1. It takes focus after in-app navigation, so it can be focused but is not a tab stop. */
export function PageHeading({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useFocusOnNavigation(ref)
  return (
    <h1 ref={ref} tabIndex={-1} className={['page-heading', className].filter(Boolean).join(' ')}>
      {children}
    </h1>
  )
}
