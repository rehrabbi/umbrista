import { lazy, useEffect, useId, useRef, useState, type RefObject } from 'react'
import type { MenuItem } from '../../shared/menu'
import { formatPrice } from '../../shared/money'
import { useAddToOrder } from '../cart/CartProvider'
import { Picture } from '../media/Picture'
import { usePrefersReducedMotion } from '../media/usePrefersReducedMotion'
import { KineticTitle } from '../pages/landing/KineticTitle'
import { useScenesMayStart } from '../scene/gate'
import { SceneHost } from '../scene/SceneHost'
import { Button } from '../ui/Button'
import { turnDrink, useBarLive } from './barProgress'
import { stillOf } from './stills'
import './DrinkStage.css'

// The bar's scene imports three, drei and the decoder: it loads with its canvas, never with the page.
const BarScene = lazy(() => import('./BarScene'))

/** Has the element come on screen yet? Once true it stays true. True without IntersectionObserver. */
function useArrived(ref: RefObject<Element | null>): boolean {
  const [arrived, setArrived] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const element = ref.current
    if (arrived || !element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setArrived(true)
        observer.disconnect()
      },
      { rootMargin: '0px 0px -25% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, arrived])
  return arrived
}

export interface DrinkStageProps {
  item: MenuItem
  /** Its place in the bar, from 0. The bar's scroll progress counts in the same places. */
  index: number
}

/**
 * One drink's screen in the bar: its name and price in kinetic type (rising into place as the
 * section arrives), its notes, "Add to order", and, while the live drink is there, buttons to
 * turn it. The live drink itself is drawn by the bar's one canvas (BarStage), which stays on
 * screen while the sections scroll past; this section's still stands in for it until then, and for
 * good under reduced motion or without WebGL. Everything that matters is text.
 */
export function DrinkStage({ item, index }: DrinkStageProps) {
  const reduced = usePrefersReducedMotion()
  const mayLoad = useScenesMayStart()
  const live = useBarLive()
  const addToOrder = useAddToOrder()
  const ref = useRef<HTMLElement>(null)
  const arrived = useArrived(ref)
  const headingId = useId()
  const still = stillOf(item)
  const rise = !reduced && arrived

  return (
    <section
      ref={ref}
      id={`drink-${item.id}`}
      data-drink={index}
      data-arrived={arrived ? '' : undefined}
      aria-labelledby={headingId}
      className="drink"
    >
      <div className="drink-media">
        {/* The name and notes beside it say what it is; the photograph is for the eye. */}
        {still && mayLoad && <Picture name={still} alt="" sizes="(min-width: 60rem) 47vw, 92vw" className="drink-still" />}
      </div>
      <div className="drink-copy">
        <p className="drink-number" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </p>
        <h3 id={headingId} tabIndex={-1} className="drink-name">
          <KineticTitle text={item.name} rise={rise} />
        </h3>
        <p className="drink-notes">{item.notes}</p>
        <p className="drink-price">
          <KineticTitle text={formatPrice(item.price)} rise={rise} />
        </p>
        <div className="drink-actions">
          <Button onClick={() => addToOrder(item)}>
            Add to order<span className="visually-hidden">: {item.name}</span>
          </Button>
          {live && !reduced && (
            <div role="group" aria-label={`Turn ${item.name}`} className="drink-turn">
              <Button variant="secondary" onClick={() => turnDrink(item.id, -1)}>
                Turn left
              </Button>
              <Button variant="secondary" onClick={() => turnDrink(item.id, 1)}>
                Turn right
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * The bar's one canvas: sticky for the length of the bar, laid over the drinks' sections in the
 * place where each section shows its still, so each drink rises into the same spot its photograph
 * holds. Only while motion is allowed; the page leaves it out under reduced motion.
 */
export function BarStage() {
  return (
    <div className="bar-stage">
      <SceneHost className="bar-scene" near="100% 0px" onDemand antialias>
        <BarScene />
      </SceneHost>
    </div>
  )
}
