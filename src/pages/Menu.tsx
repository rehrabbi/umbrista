import { useCallback, useEffect, useId, useRef, type RefObject } from 'react'
import { Link } from 'react-router'
import { DRINKS, MENU, type MenuItem } from '../../shared/menu'
import { formatPrice, formatTotal } from '../../shared/money'
import { useAddToOrder, useCart } from '../cart/CartProvider'
import { cartCount, cartTotal } from '../cart/cartStore'
import { Picture } from '../media/Picture'
import { usePrefersReducedMotion } from '../media/usePrefersReducedMotion'
import { followBar } from '../menu/barProgress'
import { BarStage, DrinkStage } from '../menu/DrinkStage'
import { MenuCounter } from '../menu/MenuCounter'
import { stillOf } from '../menu/stills'
import { useScenesMayStart } from '../scene/gate'
import { smoothScroller } from '../scroll/useSmoothScroll'
import { Button } from '../ui/Button'
import { PageHeading } from '../ui/PageHeading'
import './Menu.css'

const SNACKS = MENU.filter((item) => item.category === 'small-plates')

/** What the order holds so far, with the way to it. Not a live region: adding says so in a toast. */
function OrderNote() {
  const { lines } = useCart()
  const count = cartCount(lines)
  if (count === 0) return <p className="menu-order">Nothing in your order yet.</p>
  return (
    <p className="menu-order">
      Your order: {count} {count === 1 ? 'item' : 'items'}, {formatTotal(cartTotal(lines))}.{' '}
      <Link to="/order">See your order</Link>
    </p>
  )
}

/**
 * A night snack: its photograph (asked for once the visitor shows intent, like every picture below
 * the first screen, in a square box held open so nothing shifts when it arrives), then its name,
 * notes, price and "Add to order".
 */
function SnackCard({ item, mayLoad }: { item: MenuItem; mayLoad: boolean }) {
  const addToOrder = useAddToOrder()
  const headingId = useId()
  const still = stillOf(item)
  return (
    <li className="snack">
      <article aria-labelledby={headingId} className="snack-card">
        {still && (
          <div className="snack-photo">
            {mayLoad && <Picture name={still} alt={item.name} sizes="(min-width: 60rem) 22rem, 92vw" className="snack-still" />}
          </div>
        )}
        <h3 id={headingId} className="snack-name">
          {item.name}
        </h3>
        <p className="snack-notes">{item.notes}</p>
        <p className="snack-price">{formatPrice(item.price)}</p>
        <Button variant="secondary" onClick={() => addToOrder(item)}>
          Add to order<span className="visually-hidden">: {item.name}</span>
        </Button>
      </article>
    </li>
  )
}

/**
 * The bar follows the scroll while motion is allowed: the drinks' sections are measured and the
 * progress is written outside React (barProgress), for the bar's scene. Under reduced motion
 * nothing follows the scroll, and nothing scrubs.
 */
function useBarScroll(reduced: boolean, bar: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = bar.current
    if (reduced || !element) return
    return followBar([...element.querySelectorAll<HTMLElement>('section[data-drink]')])
  }, [reduced, bar])
}

/**
 * The menu: the counter, every drink standing in a row; then the bar, one drink per screen, each
 * rising into view under the lamp as the visitor scrolls; then the night snacks. Every name, note
 * and price is text and every item can be added to the order, with or without the 3D.
 */
export default function Menu() {
  const reduced = usePrefersReducedMotion()
  const mayLoad = useScenesMayStart()
  const bar = useRef<HTMLElement>(null)
  const barTitle = useId()
  const snacksTitle = useId()
  useBarScroll(reduced, bar)

  // From the counter to the drink: scroll its section into place and give its name the focus.
  const goTo = useCallback(
    (id: string) => {
      const section = document.getElementById(`drink-${id}`)
      if (!section) return
      const lenis = smoothScroller()
      // At once, not smoothly: a smooth run down the bar would pass, and load, every drink between.
      if (lenis && !reduced) lenis.scrollTo(section, { immediate: true })
      else section.scrollIntoView?.({ block: 'start' })
      section.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true })
    },
    [reduced],
  )

  return (
    <div className="menu-page">
      <header className="page menu-intro">
        <PageHeading>Menu</PageHeading>
        <p className="page-lede">Nine coffees for the night, and three small things to eat beside them.</p>
        <p className="menu-key">Prices in crowns, the money of Calvessa. Nothing here is for sale.</p>
        <OrderNote />
      </header>

      <MenuCounter onPick={goTo} />

      <section ref={bar} aria-labelledby={barTitle} className="bar">
        <h2 id={barTitle} className="visually-hidden">
          Coffee
        </h2>
        {!reduced && <BarStage />}
        {DRINKS.map((item, index) => (
          <DrinkStage key={item.id} item={item} index={index} />
        ))}
      </section>

      <section aria-labelledby={snacksTitle} className="snacks">
        <div className="snacks-head">
          <h2 id={snacksTitle} className="snacks-title">
            Night snacks
          </h2>
          <p className="snacks-lede">Something small beside the cup, baked before the lamps come on.</p>
        </div>
        <ul className="snack-list">
          {SNACKS.map((item) => (
            <SnackCard key={item.id} item={item} mayLoad={mayLoad} />
          ))}
        </ul>
        <OrderNote />
      </section>
    </div>
  )
}
