import { Link } from 'react-router'
import { HonestyNote } from './HonestyNote'
import './Footer.css'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <HonestyNote />
        <ul className="footer-links">
          <li>
            <Link to="/privacy">Privacy</Link>
          </li>
          <li>
            <a href="https://github.com/rehrabbi/umbrista" rel="noopener">
              Source code
            </a>
          </li>
          <li>
            <Link to="/staff" className="footer-quiet">
              Staff
            </Link>
          </li>
        </ul>
        <p className="footer-credit">Designed and built by Jireh Rabbi R. Bernardo</p>
      </div>
    </footer>
  )
}
