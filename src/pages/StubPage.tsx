import type { ReactNode } from 'react'
import { PageHeading } from '../ui/PageHeading'

/** A page that is not built yet: a real heading and one quiet line. */
export function StubPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page">
      <PageHeading>{title}</PageHeading>
      <p className="page-lede">{children}</p>
    </div>
  )
}
