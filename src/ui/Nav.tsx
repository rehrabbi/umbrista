import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { Logo } from '../brand/Logo'
import { buttonClasses } from './Button'
import './Nav.css'

const LINKS = [
  { to: '/menu', label: 'Menu' },
  { to: '/brew', label: 'Brew' },
  { to: '/story', label: 'Story' },
  { to: '/visit', label: 'Visit' },
  { to: '/journal', label: 'Journal' },
] as const

export function Nav() {
  // The menu is open for one path only, so following a link closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const { pathname } = useLocation()
  const open = openOn === pathname
  const listId = useId()
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenOn(null)
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
          onClick={() => setOpenOn(open ? null : pathname)}
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
