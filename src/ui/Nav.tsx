import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { Logo } from '../brand/Logo'
import { buttonClasses } from './Button'
import { NightSwitch } from './NightSwitch'
import './Nav.css'

const LINKS = [
  { to: '/menu', label: 'Menu' },
  { to: '/brew', label: 'Brew' },
  { to: '/story', label: 'Story' },
  { to: '/visit', label: 'Visit' },
  { to: '/journal', label: 'Journal' },
] as const

export function Nav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  // Any change of location (a link, Back or Forward) closes the menu. Adjusting state while
  // rendering, rather than in an effect, avoids a frame with the menu still open.
  const [shownAt, setShownAt] = useState(location)
  if (shownAt !== location) {
    setShownAt(location)
    setOpen(false)
  }
  const listId = useId()
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggle.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <header className="site-header">
      <nav className="nav" aria-label="Main">
        <NavLink to="/" end className="nav-home" aria-label="Umbrista, home">
          <Logo variant="lockup" decorative className="nav-logo" />
        </NavLink>

        <button
          ref={toggle}
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen(!open)}
        >
          Menu
        </button>

        <ul id={listId} className={open ? 'nav-list is-open' : 'nav-list'}>
          {LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} className="nav-link">
                {link.label}
              </NavLink>
            </li>
          ))}
          <li className="nav-night">
            <NightSwitch />
          </li>
          <li className="nav-cta">
            <NavLink to="/reserve" className={buttonClasses('primary')}>
              Reserve a table
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  )
}
