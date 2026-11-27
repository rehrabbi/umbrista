import { lazy, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { formatPrice } from '../../shared/money'
import { DRINKS } from '../../shared/menu'
import { Picture } from '../media/Picture'
import { usePrefersReducedMotion } from '../media/usePrefersReducedMotion'
import { useScenesMayStart } from '../scene/gate'
import { SceneHost } from '../scene/SceneHost'
import { updateCounterView } from './barProgress'
import { stillOf } from './stills'
import './MenuCounter.css'

// The counter's scene imports three, drei and the decoder: it loads with its canvas, never with the page.
const CounterScene = lazy(() => import('./CounterScene'))

/** Sideways travel, in CSS pixels, before a mouse press is taken as dragging the counter, not a tap. */
const DRAG_PX = 6

export interface MenuCounterProps {
  /** Called with a drink's id when the visitor chooses it: Enter on the list, or a tap. */
  onPick: (id: string) => void
}

interface Drag {
  pointerId: number
  x: number
  scroll: number
  moved: boolean
}

/**
 * The counter: every drink standing in a row under the lamp, in 3D (the light models, one canvas
 * for all of them) once the visitor shows intent; until then, and for good under reduced motion or
 * without WebGL, each drink's still. It is a listbox, so it reads and works the same either way:
 * the arrow keys (and Home and End) choose a drink, Enter or a tap jumps to it in the bar. The row
 * scrolls sideways with a swipe, a trackpad, or a mouse drag; the scene follows the row.
 */
export function MenuCounter({ onPick }: MenuCounterProps) {
  const reduced = usePrefersReducedMotion()
  const mayLoad = useScenesMayStart()
  const [active, setActive] = useState(0)
  const listId = useId()
  const strip = useRef<HTMLUListElement>(null)
  const drag = useRef<Drag | null>(null)
  const dragged = useRef(false)
  const optionId = (index: number) => `${listId}-${DRINKS[index]!.id}`

  // Tell the scene where the drinks' places are, whenever the row scrolls or the page lays out.
  useEffect(() => {
    const list = strip.current
    if (!list) return
    const places = list.querySelectorAll<HTMLElement>('[role="option"]')
    const measure = () => {
      const first = places[0]
      const second = places[1]
      if (!first) return
      updateCounterView({
        first: first.offsetLeft + first.offsetWidth / 2,
        pitch: second ? second.offsetLeft - first.offsetLeft : first.offsetWidth,
        scroll: list.scrollLeft,
        width: list.clientWidth,
      })
    }
    const onScroll = () => updateCounterView({ scroll: list.scrollLeft })
    measure()
    list.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(list)
    return () => {
      list.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [])

  const choose = useCallback(
    (index: number) => {
      setActive(index)
      updateCounterView({ active: index })
      const option = strip.current?.querySelectorAll<HTMLElement>('[role="option"]')[index]
      option?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' })
    },
    [reduced],
  )

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const last = DRINKS.length - 1
    const next: Record<string, number> = {
      ArrowRight: Math.min(last, active + 1),
      ArrowDown: Math.min(last, active + 1),
      ArrowLeft: Math.max(0, active - 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    }
    if (event.key in next) {
      event.preventDefault()
      choose(next[event.key]!)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onPick(DRINKS[active]!.id)
    }
  }

  // A mouse drags the row along; touch and trackpads scroll it natively.
  const onPointerDown = (event: PointerEvent<HTMLUListElement>) => {
    dragged.current = false
    if (event.pointerType !== 'mouse' || event.button !== 0 || !strip.current) return
    drag.current = { pointerId: event.pointerId, x: event.clientX, scroll: strip.current.scrollLeft, moved: false }
  }
  const onPointerMove = (event: PointerEvent<HTMLUListElement>) => {
    const current = drag.current
    const list = strip.current
    if (!current || !list || current.pointerId !== event.pointerId) return
    const dx = event.clientX - current.x
    if (!current.moved && Math.abs(dx) < DRAG_PX) return
    if (!current.moved) {
      current.moved = true
      list.setPointerCapture?.(event.pointerId)
    }
    list.scrollLeft = current.scroll - dx
  }
  const onPointerEnd = (event: PointerEvent<HTMLUListElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    drag.current = null
    dragged.current = current.moved
    if (strip.current?.hasPointerCapture?.(event.pointerId)) strip.current.releasePointerCapture(event.pointerId)
  }
  const onClickPlace = (event: MouseEvent, index: number) => {
    // The end of a drag is not a tap.
    if (dragged.current) {
      dragged.current = false
      event.preventDefault()
      return
    }
    choose(index)
    onPick(DRINKS[index]!.id)
  }

  return (
    <section className="counter" aria-labelledby={`${listId}-title`}>
      <div className="counter-head">
        <h2 id={`${listId}-title`} className="counter-title">
          The counter
        </h2>
        <p id={`${listId}-hint`} className="counter-hint">
          Slide along the counter and choose a drink to go to it.
        </p>
      </div>
      <div className="counter-stage">
        {!reduced && (
          <SceneHost className="counter-scene" near="50% 0px" onDemand antialias>
            <CounterScene />
          </SceneHost>
        )}
        <ul
          ref={strip}
          role="listbox"
          aria-label="Drinks on the counter"
          aria-describedby={`${listId}-hint`}
          aria-orientation="horizontal"
          aria-activedescendant={optionId(active)}
          tabIndex={0}
          className="counter-strip"
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {DRINKS.map((drink, index) => {
            const still = stillOf(drink)
            return (
              <li
                key={drink.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                className="counter-place"
                onClick={(event) => onClickPlace(event, index)}
              >
                <span className="counter-still-box">
                  {/* The name is the option's text; the photograph is for the eye only. */}
                  {still && mayLoad && <Picture name={still} alt="" sizes="10rem" className="counter-still" />}
                </span>
                <span className="counter-name">{drink.name}</span> <span className="counter-price">{formatPrice(drink.price)}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
