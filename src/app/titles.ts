const SUFFIX = 'Umbrista'

export const HOME_TITLE = 'Umbrista · A coffee bar that opens at dusk'

const PAGES: ReadonlyArray<readonly [prefix: string, name: string]> = [
  ['/menu', 'Menu'],
  ['/brew', 'Brew your own'],
  ['/story', 'Story'],
  ['/visit', 'Visit'],
  ['/journal', 'Journal'],
  ['/reserve', 'Reserve a table'],
  ['/order', 'Order ahead'],
  ['/join', 'Join the list'],
  ['/privacy', 'Privacy'],
  ['/staff', 'Staff'],
]

/** The document title for a path: the home tagline, "<Page> · Umbrista", or the not-found title. */
export function titleFor(pathname: string): string {
  if (pathname === '/' || pathname === '') return HOME_TITLE
  const page = PAGES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  return `${page ? page[1] : 'Not found'} · ${SUFFIX}`
}
